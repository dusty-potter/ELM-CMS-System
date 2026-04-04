import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ---------------------------------------------------------------------------
// Fetch web content for a platform
// ---------------------------------------------------------------------------

function getManufacturerDomain(manufacturer: string): string {
  const domains: Record<string, string> = {
    phonak: 'phonak.com', signia: 'signia.net', oticon: 'oticon.com',
    starkey: 'starkey.com', resound: 'resound.com', widex: 'widex.com',
    unitron: 'unitron.com', beltone: 'beltone.com', audibel: 'audibel.com',
  }
  return domains[manufacturer.toLowerCase()] ?? `${manufacturer.toLowerCase()}.com`
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ELM-CMS-Bot/1.0 (product-research)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const html = await res.text()
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 12000)
  } catch {
    return null
  }
}

async function fetchPlatformContext(manufacturer: string, platformName: string, formFactorNames: string[]): Promise<string> {
  const domain = getManufacturerDomain(manufacturer)
  const slug = platformName.toLowerCase().replace(/[^a-z0-9]+/g, '-')

  // Try known URL patterns for the platform overview page
  const overviewUrls = [
    `https://www.${domain}/hearing-aids/${slug}`,
    `https://www.${domain}/en-us/hearing-aids/${slug}`,
    `https://www.${domain}/hearing-aids/`,
    `https://www.${domain}/en-us/hearing-aids/`,
  ]

  const pages: string[] = []

  // Fetch platform overview
  for (const url of overviewUrls) {
    const content = await fetchPage(url)
    if (content && content.length > 500) {
      pages.push(`[Platform overview page]\n${content}`)
      break
    }
  }

  // Fetch up to 3 form factor pages for additional context
  const ffSlugPatterns = formFactorNames.slice(0, 3).map(name =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  )
  for (const ffSlug of ffSlugPatterns) {
    const ffUrls = [
      `https://www.${domain}/hearing-aids/${ffSlug}`,
      `https://www.${domain}/en-us/hearing-aids/${slug}/${ffSlug}`,
      `https://www.${domain}/hearing-aids/${slug}/${ffSlug}`,
    ]
    for (const url of ffUrls) {
      const content = await fetchPage(url)
      if (content && content.length > 500) {
        pages.push(`[Form factor page: ${ffSlug}]\n${content.slice(0, 6000)}`)
        break
      }
    }
  }

  if (pages.length === 0) return ''

  const combined = pages.join('\n\n---\n\n').slice(0, 25000)
  return `\n\nHere is text extracted from manufacturer web pages about this platform and its products. Use this as your PRIMARY source of truth. Your training knowledge is SECONDARY — defer to this content for product names, features, specs, and claims:\n\n---\n${combined}\n---\n`
}

// ---------------------------------------------------------------------------
// POST /api/ingest/platform
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const { manufacturer, platform } = await req.json()

  if (!manufacturer || !platform?.name) {
    return NextResponse.json({ error: 'manufacturer and platform are required' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 })
  }

  const formFactorNames = (platform.formFactors ?? []).map((ff: { name: string }) => ff.name)
  const webContext = await fetchPlatformContext(manufacturer, platform.name, formFactorNames)

  const tierList = (platform.tiers ?? [])
    .map((t: { id: string; label: string; tier: string }) => `${t.id} (${t.tier})`)
    .join(', ')

  const ffList = (platform.formFactors ?? [])
    .map((ff: { name: string; style: string; availableTiers?: string[] }) =>
      `${ff.name} [${ff.style}]${ff.availableTiers ? ` — tiers: ${ff.availableTiers.join(', ')}` : ''}`)
    .join('\n  ')

  const foList = (platform.fittingOptions ?? [])
    .map((fo: { name: string; description?: string }) => `${fo.name}: ${fo.description ?? ''}`)
    .join('\n  ')

  const prompt = `You are a hearing aid product database expert. Research the ${manufacturer} ${platform.name} platform (product family) in comprehensive detail.

This platform has:
- Tiers: ${tierList || 'unknown'}
- Form factors:
  ${ffList || 'unknown'}
- Fitting options:
  ${foList || 'none identified'}
${webContext || '\nNote: Could not fetch manufacturer web pages. Use your training knowledge but be conservative — set confidenceLevel to "medium" or "low" and leave fields as null if uncertain.\n'}

CRITICAL RULES:
- Use the EXACT product, platform, and technology names as the manufacturer uses them
- "Platform" is the technology generation (e.g., "IX" for Signia, "Infinio" for Phonak)
- Tiers are performance levels of the SAME platform — research each tier's positioning separately
- Form factors are physical device styles — research specs for each independently
- CROS/BiCROS are fitting options (contralateral routing of sound for single-sided deafness), NOT products
- Do NOT confabulate: if you don't know a detail, set it to null
- FIND IMAGE URLs: Look for product image URLs in the web content. Only include HTTPS URLs from the manufacturer's domain. Do NOT guess or fabricate image URLs. Tag each image with the form factor name it depicts if identifiable.

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "summary": "2-4 sentences describing this platform's technology, philosophy, and key innovations. Include official platform/technology names.",
  "keyDifferentiators": ["array of specific branded technology differentiators"],
  "techTerms": ["controlled vocabulary — official branded technology names used by this platform"],
  "connectivity": {
    "ios": true/false,
    "android": true/false,
    "bluetooth": true/false,
    "bluetoothVersion": "e.g. '5.3' or null",
    "auracast": true/false/null,
    "handsFree": true/false,
    "remoteControl": true/false
  },
  "capabilities": [
    {
      "key": "kebab-case-key",
      "label": "Human Readable Label (use official branded name if one exists)",
      "category": "one of: processing, connectivity, health, physical",
      "description": "one-line description of what this capability does"
    }
  ],
  "tiers": [
    {
      "id": "tier identifier matching the enumerate output (e.g. '7IX')",
      "tier": "premium/advanced/standard/essential",
      "canonicalDescription": "2-3 factual sentences about THIS tier specifically. How does it differ from other tiers?",
      "bestFor": ["specific use cases for this tier level"],
      "pros": ["genuine advantages of this tier — cite specific features"],
      "cons": ["real limitations vs higher tiers — not universal hearing aid caveats"],
      "targetUser": "one sentence describing the ideal wearer for this tier",
      "hearingLossRange": ["mild", "moderate", "moderately-severe", "severe", "profound"],
      "valueSummary": "why this tier delivers value at its price point, or null",
      "upgradeReasons": ["reasons to choose a higher tier over this one"],
      "compSpeechInNoise": "low/medium/high relative to the tier, or null",
      "compMusicQuality": "low/medium/high or null",
      "compTinnitusSupport": true/false/null,
      "compAiProcessing": true/false/null,
      "compRemoteCare": true/false/null,
      "compHealthTracking": true/false/null
    }
  ],
  "formFactors": [
    {
      "name": "official model name (e.g. 'Pure Charge&Go IX')",
      "style": "one of: RIC, BTE, ITE, CIC, IIC, miniRITE, slimRIC, other",
      "availableTiers": ["which tier IDs this form factor comes in"],
      "batteryType": "disposable or rechargeable",
      "batterySize": "312, 13, 10 for disposable; null for rechargeable",
      "batteryEstimatedHours": number or null,
      "ipRating": "e.g. IP68 or null — do not guess",
      "waterResistant": true/false,
      "colors": ["official color names"],
      "receiverOptions": ["receiver power options if RIC/miniRITE, e.g. 'S', 'M', 'P', 'UP'"],
      "connectivityIos": true/false,
      "connectivityAndroid": true/false,
      "connectivityBluetooth": true/false,
      "connectivityHandsFree": true/false
    }
  ],
  "fittingOptions": [
    {
      "name": "e.g. 'CROS IX'",
      "description": "detailed description of what this fitting option does and who it's for",
      "styles": ["RIC", "BTE", etc.]
    }
  ],
  "imageUrls": [
    {
      "url": "full absolute HTTPS URL to a product image on the manufacturer's website",
      "type": "hero or gallery",
      "description": "brief description of what the image shows",
      "formFactorName": "name of the form factor depicted, or null for platform-level images"
    }
  ],
  "confidenceLevel": "high if verified by web content, medium if from training only, low if mostly inferred"
}`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 12000,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : null
    if (!rawText) {
      return NextResponse.json({ error: 'No content returned from AI' }, { status: 502 })
    }

    const cleaned = rawText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()

    let research: unknown
    try {
      research = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'AI returned malformed JSON' }, { status: 502 })
    }

    return NextResponse.json({ manufacturer, platform: platform.name, research })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'AI platform research failed'
    console.error('Anthropic platform research error:', e)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
