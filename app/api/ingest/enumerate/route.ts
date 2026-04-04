import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ---------------------------------------------------------------------------
// Fetch a manufacturer's product page for context
// ---------------------------------------------------------------------------

async function fetchManufacturerPage(manufacturer: string, url?: string): Promise<string | null> {
  const KNOWN_URLS: Record<string, string> = {
    phonak:   'https://www.phonak.com/en-us/hearing-devices/hearing-aids',
    signia:   'https://www.signia.net/en-us/hearing-aids/',
    oticon:   'https://www.oticon.com/hearing-aid-users/hearing-aids',
    starkey:  'https://www.starkey.com/hearing-aids',
    resound:  'https://www.resound.com/en-us/hearing-aids',
    widex:    'https://www.widex.com/en-us/hearing-aids/',
    unitron:  'https://www.unitron.com/us/en/hearing-aids.html',
    beltone:  'https://www.beltone.com/hearing-aids',
  }

  const targetUrl = url || KNOWN_URLS[manufacturer.toLowerCase()]
  if (!targetUrl) return null

  try {
    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': 'ELM-CMS-Bot/1.0 (product-research)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return text.slice(0, 12000)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// POST /api/ingest/enumerate
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const { manufacturer, url } = await req.json()

  if (!manufacturer) {
    return NextResponse.json({ error: 'manufacturer is required' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 })
  }

  const pageContent = await fetchManufacturerPage(manufacturer, url)
  const webContext = pageContent
    ? `\n\nHere is text extracted from the manufacturer's product page. Use this as your PRIMARY source of truth for product names, model names, and platform names. Your training knowledge is SECONDARY — defer to this content when there is any conflict:\n\n---\n${pageContent}\n---\n`
    : ''

  const prompt = `You are an audiology industry expert. Your task is to enumerate the current and recent product lineup for ${manufacturer}, organized by TECHNOLOGY PLATFORM.

CRITICAL HEARING AID PRODUCT HIERARCHY — you MUST follow this:

1. **PLATFORM** = the underlying technology generation / chipset. This is the top-level grouping.
   Examples: Signia "IX" (Integrated Xperience), Phonak "Infinio", Oticon "Intent" / "Real", ReSound "Nexia"
   Each manufacturer typically has ONE current platform and may have recent predecessor platforms still on the market.

2. **TIERS** = performance/price levels WITHIN a platform. These are NOT separate products.
   Examples: Signia IX has tiers 7IX (premium), 5IX (advanced), 3IX (essential)
   Phonak Infinio has tiers 90 (premium), 70 (advanced), 50 (standard)
   The tier determines the level of processing power, features, and price point.

3. **FORM FACTORS** = physical device styles available within a platform. Each form factor may be available at some or all tiers.
   Examples: Pure Charge&Go (RIC), Styletto (slimRIC), Motion Charge&Go (BTE), Silk (CIC), Insio (IIC/CIC/ITE)
   A form factor like "Pure Charge&Go IX" available in tiers 7IX, 5IX, and 3IX is ONE form factor — NOT three products.

4. **FITTING OPTIONS** = special configurations that are NOT standalone hearing aids.
   The most common is CROS (Contralateral Routing of Sound) — a transmitter device worn on a non-hearing ear that sends sound to a hearing aid on the better ear. CROS devices are tied to a platform (e.g., "CROS IX" pairs with IX receiver aids).
   BiCROS is a variant where the better ear also needs amplification.
   CROS/BiCROS are NOT products, NOT form factors — they are fitting options listed under the platform.

RULES:
- Group everything by PLATFORM first
- List ALL tiers within each platform with their identifier and tier level
- List ALL form factors with which tiers each is available in
- Classify CROS/BiCROS as fitting options, NOT as products or form factors
- Flag predecessor/legacy platforms with isLegacy: true (e.g., Signia AX is legacy because IX replaced it)
- The current/newest platform should be isLegacy: false
- Use official marketing names exactly as the manufacturer uses them
- DO NOT treat tier levels as separate products
- DO NOT list the same form factor multiple times for different tiers${webContext}

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "manufacturer": "${manufacturer}",
  "platforms": [
    {
      "name": "platform abbreviation as manufacturer uses it (e.g. 'IX', 'Infinio', 'Intent')",
      "displayName": "full marketing name (e.g. 'Signia Integrated Xperience', 'Phonak Infinio')",
      "generationYear": year as integer or null,
      "isLegacy": false for current platform, true for predecessor platforms still on market,
      "tiers": [
        {
          "id": "tier identifier as used in product naming (e.g. '7IX', '90', 'premium')",
          "label": "display label (e.g. '7IX', 'Infinio 90')",
          "tier": "one of: premium, advanced, standard, essential"
        }
      ],
      "formFactors": [
        {
          "name": "official model name (e.g. 'Pure Charge&Go IX', 'Styletto IX', 'Audéo Sphere Infinio')",
          "style": "one of: RIC, BTE, ITE, CIC, IIC, miniRITE, slimRIC, other",
          "availableTiers": ["which tier IDs this form factor comes in, e.g. ['7IX', '5IX', '3IX']"],
          "notes": "any restrictions or special notes (e.g. 'premium tier only', 'non-rechargeable') or null"
        }
      ],
      "fittingOptions": [
        {
          "name": "e.g. 'CROS IX'",
          "description": "brief description of what this fitting option does",
          "styles": ["physical styles available, e.g. 'RIC', 'BTE'"]
        }
      ]
    }
  ]
}

Sort platforms newest first. Within each platform, sort tiers from premium to essential.
Be comprehensive — include ALL distinct form factors and fitting options for each platform.`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 6144,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : null
    if (!rawText) {
      return NextResponse.json({ error: 'No content returned from AI' }, { status: 502 })
    }

    const cleaned = rawText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()

    let result: unknown
    try {
      result = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'AI returned malformed JSON' }, { status: 502 })
    }

    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'AI enumeration request failed'
    console.error('Anthropic enumerate error:', e)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
