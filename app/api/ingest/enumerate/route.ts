import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { manufacturer, url } = await req.json()

  if (!manufacturer) {
    return NextResponse.json({ error: 'manufacturer is required' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 500 })
  }

  const urlHint = url
    ? `\nThe user has provided this URL as a reference: ${url}\nUse it as a hint for the brand context, but rely on your training knowledge for product details.`
    : ''

  const prompt = `You are an audiology industry expert with comprehensive knowledge of hearing aid and hearing health product lineups.

List ALL currently available products made by ${manufacturer}.
Include every tier level across every active platform or product family.
Do NOT include discontinued products unless they are still actively sold and supported as of 2024-2025.
If ${manufacturer} is not a hearing aid brand but a related hearing health product (e.g. a tinnitus treatment device), list their current product(s) accurately — do not force them into hearing aid categories.${urlHint}

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "manufacturer": "${manufacturer}",
  "products": [
    {
      "name": "canonical product name only, no manufacturer prefix (e.g. 'Audéo L90', 'Intent 1', 'IX7')",
      "displayName": "full marketing name with manufacturer (e.g. 'Phonak Audéo L90')",
      "platform": "technology platform or product family name, or null if not applicable",
      "tier": "one of: premium, advanced, standard, essential — or null if not applicable",
      "releaseYear": year as integer or null,
      "formFactorStyles": ["array of applicable styles: RIC, BTE, ITE, CIC, IIC, miniRITE, other — use ['other'] for non-hearing-aid devices"]
    }
  ]
}

Sort products by platform (newest first), then by tier within each platform (premium first).
Be comprehensive — include ALL tiers for each platform.`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : null
    if (!rawText) {
      return NextResponse.json({ error: 'No content returned from AI' }, { status: 502 })
    }

    // Strip markdown code fences if present
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
    console.error('Anthropic error:', e)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
