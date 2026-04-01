import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { manufacturer, modelName } = await req.json()

  if (!manufacturer || !modelName) {
    return NextResponse.json({ error: 'manufacturer and modelName are required' }, { status: 400 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 })
  }

  const prompt = `You are a hearing aid product database expert with deep knowledge of the audiology industry.

Research the ${manufacturer} ${modelName} hearing aid and return a comprehensive JSON object.
Use your knowledge to fill in as much accurate detail as possible.
Set fields to null only when you genuinely do not know — do not guess uncertain values.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "platform": "technology platform/chipset name (e.g. 'Lumity', 'IX', 'Infinio') or null",
  "displayName": "full marketing name including manufacturer (e.g. 'Phonak Audéo L90') or null",
  "tier": "one of: premium, advanced, standard, essential — based on the model number/tier, or null",
  "canonicalDescription": "2-3 factual sentences describing this product's technology, target user, and key benefits. Do not use superlatives or marketing hype.",
  "bestFor": ["array of specific use cases, e.g. 'Active outdoor lifestyles', 'Streaming audio from phone'"],
  "pros": ["array of genuine advantages — be specific, not generic"],
  "cons": ["array of real limitations or trade-offs — do not include universal hearing aid caveats like 'requires fitting'"],
  "targetUser": "one sentence describing the ideal wearer profile",
  "hearingLossRange": ["mild-to-moderate", "moderate", "moderate-to-severe", "severe", "profound" — include all that apply],
  "capabilities": [
    {
      "key": "kebab-case-key",
      "label": "Human Readable Label",
      "category": "one of: processing, connectivity, health, physical",
      "description": "one-line description of what this capability does"
    }
  ],
  "connectivity": {
    "ios": true or false,
    "android": true or false,
    "bluetooth": true or false,
    "auracast": true or false,
    "handsFree": true or false,
    "remoteControl": true or false
  },
  "formFactors": [
    {
      "style": "one of: RIC, BTE, ITE, CIC, IIC, miniRITE, other",
      "name": "canonical name e.g. 'miniRITE R' or 'RIC 02'",
      "batteryType": "disposable or rechargeable",
      "batterySize": "312 or 13 etc for disposable, null for rechargeable",
      "batteryEstimatedHours": number of estimated hours per charge/battery or null,
      "ipRating": "e.g. IP68, IP68/IP69K, or null",
      "waterResistant": true or false,
      "colors": ["list of available color names"],
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
  "confidenceLevel": "high if you have strong specific knowledge of this exact model, medium if approximate, low if mostly inferred"
}`

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
    return NextResponse.json({ error: 'AI research request failed' }, { status: 502 })
  }

  const geminiData = await geminiRes.json()
  const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

  if (!rawText) {
    return NextResponse.json({ error: 'No content returned from AI' }, { status: 502 })
  }

  let product: unknown
  try {
    product = JSON.parse(rawText)
  } catch {
    return NextResponse.json({ error: 'AI returned malformed JSON' }, { status: 502 })
  }

  return NextResponse.json({ manufacturer, modelName, product })
}
