import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ---------------------------------------------------------------------------
// Fetch product-specific web content for context
// ---------------------------------------------------------------------------

async function fetchProductPage(manufacturer: string, modelName: string): Promise<string | null> {
  // Search-friendly slug for the product
  const query = encodeURIComponent(`${manufacturer} ${modelName} hearing aid site:${getManufacturerDomain(manufacturer)}`)

  // Try the manufacturer's known product page patterns first
  const directUrl = getDirectProductUrl(manufacturer, modelName)
  const urls = directUrl ? [directUrl] : []

  // Also try a general search-engine-friendly fetch
  const searchUrl = `https://www.google.com/search?q=${query}&num=3`

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'ELM-CMS-Bot/1.0 (product-research)' },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) continue
      const html = await res.text()
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (text.length > 500) return text.slice(0, 15000)
    } catch {
      continue
    }
  }

  return null
}

function getManufacturerDomain(manufacturer: string): string {
  const domains: Record<string, string> = {
    phonak: 'phonak.com', signia: 'signia.net', oticon: 'oticon.com',
    starkey: 'starkey.com', resound: 'resound.com', widex: 'widex.com',
    unitron: 'unitron.com', beltone: 'beltone.com', audibel: 'audibel.com',
  }
  return domains[manufacturer.toLowerCase()] ?? `${manufacturer.toLowerCase()}.com`
}

function getDirectProductUrl(manufacturer: string, modelName: string): string | null {
  const slug = modelName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  const mfr = manufacturer.toLowerCase()

  const patterns: Record<string, (s: string) => string> = {
    phonak:  (s) => `https://www.phonak.com/en-us/hearing-devices/hearing-aids/${s}`,
    signia:  (s) => `https://www.signia.net/en-us/hearing-aids/integrated-xperience/${s}/`,
    oticon:  (s) => `https://www.oticon.com/hearing-aid-users/hearing-aids/${s}`,
    starkey: (s) => `https://www.starkey.com/hearing-aids/${s}`,
    resound: (s) => `https://www.resound.com/en-us/hearing-aids/${s}`,
    widex:   (s) => `https://www.widex.com/en-us/hearing-aids/${s}`,
  }

  return patterns[mfr]?.(slug) ?? null
}

// ---------------------------------------------------------------------------
// POST /api/ingest
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const { manufacturer, modelName } = await req.json()

  if (!manufacturer || !modelName) {
    return NextResponse.json({ error: 'manufacturer and modelName are required' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 })
  }

  // Fetch real web content for this specific product
  const pageContent = await fetchProductPage(manufacturer, modelName)
  const webContext = pageContent
    ? `\n\nHere is text extracted from a manufacturer web page about this product. Use this as your PRIMARY source of truth. Your training knowledge is SECONDARY — defer to this content for product names, features, specs, and claims:\n\n---\n${pageContent}\n---\n`
    : '\n\nNote: Could not fetch the manufacturer web page. Use your training knowledge but be conservative — set confidenceLevel to "medium" or "low" and leave fields as null if you are not certain.\n'

  const prompt = `You are a hearing aid product database expert. Research the ${manufacturer} ${modelName} hearing aid.

CRITICAL RULES:
- Use the EXACT product name and platform name as the manufacturer uses them
- "Platform" means the technology generation/chipset (e.g. Phonak "Infinio", Signia "IX", Oticon "Polaris") — NOT the product model name
- The product name is the specific model (e.g. "Pure Charge&Go IX", "Audéo Sphere Infinio")
- Tier levels (e.g. 7/5/3 or 90/70/50) are performance tiers of the SAME product, not different products
- Form factors are physical device styles (RIC, BTE, CIC, etc.) — list ALL that this model comes in
- Do NOT confabulate: if you don't know a specific detail, set it to null
- Do NOT mix up platforms between manufacturers (e.g. "IX" is Signia, "Infinio" is Phonak)${webContext}

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "platform": "technology platform/chipset name as the manufacturer uses it (e.g. 'Infinio', 'IX', 'Polaris', 'Lumity') or null",
  "displayName": "full official marketing name including manufacturer (e.g. 'Phonak Audéo Sphere Infinio') or null",
  "tier": "one of: premium, advanced, standard, essential — based on the highest available tier, or null",
  "availableTiers": ["array of tier identifiers this model comes in, e.g. ['7IX', '5IX', '3IX'] or ['90', '70', '50']"],
  "canonicalDescription": "2-3 factual sentences describing this product. Include the OFFICIAL platform name and key branded technology features by name. No superlatives or marketing hype.",
  "keyTechnologies": ["array of specific branded technology feature names, e.g. 'Spheric Speech Clarity 2.0', 'RealTime Conversation Enhancement', 'AutoSense OS 7.0'"],
  "bestFor": ["array of specific use cases"],
  "pros": ["array of genuine advantages — cite specific features and specs, not generic claims"],
  "cons": ["array of real limitations or trade-offs — not universal hearing aid caveats"],
  "targetUser": "one sentence describing the ideal wearer profile",
  "hearingLossRange": ["mild", "moderate", "moderately-severe", "severe", "profound" — include all that this specific model covers],
  "capabilities": [
    {
      "key": "kebab-case-key",
      "label": "Human Readable Label (use official branded name if one exists)",
      "category": "one of: processing, connectivity, health, physical",
      "description": "one-line description of what this capability does"
    }
  ],
  "connectivity": {
    "ios": true or false,
    "android": true or false,
    "bluetooth": true or false,
    "bluetoothVersion": "e.g. '5.3' or '5.2' or null",
    "auracast": true or false or null,
    "handsFree": true or false,
    "remoteControl": true or false,
    "maxPairedDevices": number or null
  },
  "formFactors": [
    {
      "style": "one of: RIC, BTE, ITE, CIC, IIC, miniRITE, slimRIC, other",
      "name": "official model name for this form factor (e.g. 'Pure Charge&Go IX', 'Styletto IX', 'Silk Charge&Go IX')",
      "batteryType": "disposable or rechargeable",
      "batterySize": "312, 13, 10, etc. for disposable; null for rechargeable",
      "batteryEstimatedHours": number of estimated hours per charge/battery or null,
      "ipRating": "e.g. IP68 or null — do not guess",
      "waterResistant": true or false,
      "colors": ["list of available color names — use official names"],
      "availableTiers": ["which tiers this specific form factor comes in, e.g. ['7IX', '5IX', '3IX']"],
      "connectivityIos": true or false,
      "connectivityAndroid": true or false,
      "connectivityBluetooth": true or false,
      "connectivityHandsFree": true or false
    }
  ],
  "compSpeechInNoise": "low, medium, or high — relative to this product tier, or null",
  "compMusicQuality": "low, medium, or high — or null",
  "compTinnitusSupport": true or false or null,
  "compAiProcessing": true or false or null,
  "compRemoteCare": true or false or null,
  "compHealthTracking": true or false or null,
  "confidenceLevel": "high if you have strong specific knowledge verified by web content, medium if from training knowledge only, low if mostly inferred"
}`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6-20250514',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : null
    if (!rawText) {
      return NextResponse.json({ error: 'No content returned from AI' }, { status: 502 })
    }

    const cleaned = rawText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()

    let product: unknown
    try {
      product = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'AI returned malformed JSON' }, { status: 502 })
    }

    return NextResponse.json({ manufacturer, modelName, product })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'AI research request failed'
    console.error('Anthropic research error:', e)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
