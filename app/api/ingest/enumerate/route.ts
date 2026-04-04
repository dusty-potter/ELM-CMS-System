import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ---------------------------------------------------------------------------
// Fetch a manufacturer's product page for context
// ---------------------------------------------------------------------------

async function fetchManufacturerPage(manufacturer: string, url?: string): Promise<string | null> {
  // Known manufacturer product page URLs
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
    // Strip HTML tags, scripts, styles — keep text content
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    // Truncate to avoid token limits
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

  // Fetch real web content for context
  const pageContent = await fetchManufacturerPage(manufacturer, url)
  const webContext = pageContent
    ? `\n\nHere is text extracted from the manufacturer's product page. Use this as your PRIMARY source of truth for product names, model names, and platform names. Your training knowledge is SECONDARY — defer to this content when there is any conflict:\n\n---\n${pageContent}\n---\n`
    : ''

  const prompt = `You are an audiology industry expert. Your task is to enumerate the current product lineup for ${manufacturer}.

CRITICAL RULES FOR HEARING AID PRODUCT HIERARCHY:
- A "platform" is the underlying technology generation / chipset (e.g. Signia "IX", Phonak "Infinio", Oticon "Polaris")
- A "product" is a specific MODEL within that platform (e.g. "Pure Charge&Go IX", "Styletto IX", "Audéo Sphere Infinio")
- Each product may come in multiple TIER LEVELS (e.g. 7, 5, 3 or 90, 70, 50) — these are performance/price tiers, NOT separate products
- Each product has one or more FORM FACTORS (RIC, BTE, ITE, CIC, IIC, etc.)
- NOT all form factors are available at every tier level

DO NOT treat tier levels as separate products. A product like "Pure Charge&Go IX" available in tiers 3, 5, and 7 is ONE product with tier information, not three products.
DO NOT use the full platform name as the product name. "Integrated Xperience 7" is WRONG — the product is "Pure Charge&Go IX" at tier 7.
DO use the official marketing model names exactly as the manufacturer uses them.${webContext}

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "manufacturer": "${manufacturer}",
  "products": [
    {
      "name": "official model name without manufacturer prefix (e.g. 'Pure Charge&Go IX', 'Audéo Sphere Infinio', 'Intent')",
      "displayName": "full marketing name with manufacturer (e.g. 'Signia Pure Charge&Go IX')",
      "platform": "technology platform name — use the common abbreviation if one exists (e.g. 'IX' not 'Integrated Xperience', 'Infinio' not 'Infinio Platform')",
      "tier": "one of: premium, advanced, standard, essential — the HIGHEST tier this model is available in, or null",
      "availableTiers": ["array of all tier level identifiers this model comes in, e.g. ['7IX', '5IX', '3IX'] or ['90', '70', '50'] or ['premium', 'advanced']"],
      "releaseYear": year as integer or null,
      "formFactorStyles": ["array of form factor styles: RIC, BTE, ITE, CIC, IIC, miniRITE, slimRIC, other"],
      "formFactorRestrictions": "brief note if not all form factors are available at all tiers, or null"
    }
  ]
}

Sort products by platform (newest first), then by tier within each platform (premium first).
Be comprehensive — include ALL distinct models. Remember: different form factors of the same model at the same tier are ONE product, not multiple.`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
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
