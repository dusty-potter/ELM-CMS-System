import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { manufacturer, url } = await req.json()

  if (!manufacturer) {
    return NextResponse.json({ error: 'manufacturer is required' }, { status: 400 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 })
  }

  const urlHint = url ? `\nThe user has provided this URL as a reference: ${url}\nUse it as a hint for the brand context, but rely on your training knowledge for product details.` : ''

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

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    }
  )

  if (!geminiRes.ok) {
    const errText = await geminiRes.text()
    console.error('Gemini error:', errText)
    let detail = 'AI enumeration request failed'
    try {
      const errJson = JSON.parse(errText)
      detail = errJson?.error?.message ?? detail
    } catch {}
    return NextResponse.json({ error: detail }, { status: 502 })
  }

  const geminiData = await geminiRes.json()
  const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

  if (!rawText) {
    return NextResponse.json({ error: 'No content returned from AI' }, { status: 502 })
  }

  let result: unknown
  try {
    result = JSON.parse(rawText)
  } catch {
    return NextResponse.json({ error: 'AI returned malformed JSON' }, { status: 502 })
  }

  return NextResponse.json(result)
}
