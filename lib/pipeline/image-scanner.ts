// Scan a client website for images using the Anthropic API with web_search.
// Classifies each discovered image by type for slot assignment.

import Anthropic from '@anthropic-ai/sdk'

export type ScannedImage = {
  url: string
  classification: string
  confidence: number
  altText: string
  context: string
}

const SYSTEM_PROMPT = `You are an image analyst for a hearing care website builder. Given a hearing care practice website URL, search the site and find all meaningful images.

For each image found, classify it into one of these categories:
- provider_headshot — photo of an individual healthcare provider (audiologist, hearing specialist, doctor)
- staff_headshot — photo of an individual staff member (front desk, coordinator)
- team_group — group photo of the practice team
- location_exterior — exterior photo of the practice building
- location_interior — interior photo (reception, waiting room, exam room, office)
- lifestyle — lifestyle/stock photo showing people in everyday situations (conversations, family gatherings, outdoor activities)
- logo — the practice logo
- hero — large banner/hero image used at the top of a page
- service — image depicting a specific service (hearing test, fitting, consultation)
- other — any other meaningful image

Return ONLY valid JSON (no markdown fences) with this shape:
{
  "images": [
    {
      "url": "https://full-url-to-image.jpg",
      "classification": "provider_headshot",
      "confidence": 0.95,
      "altText": "Dr. Smith, audiologist",
      "context": "Found on the About Us page, team section"
    }
  ]
}

Rules:
- Only include images that are actual photographs or logos — skip icons, decorative elements, social media badges, and tiny UI elements
- Use the full absolute URL for each image (not relative paths)
- Set confidence between 0 and 1 based on how certain you are of the classification
- Provide descriptive alt text for each image
- Note where on the site each image was found (which page, which section)
- Prioritize high-resolution images over thumbnails
- If you find the same image in multiple sizes, include only the largest version`

export async function scanClientImages(websiteUrl: string): Promise<ScannedImage[]> {
  const apiKey = process.env.ELM_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const client = new Anthropic({ apiKey })

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 10,
      } as unknown as Anthropic.Messages.Tool,
    ],
    messages: [
      {
        role: 'user',
        content: `Scan this hearing care practice website for all meaningful images. Visit multiple pages (home, about, team, services, contact, locations) to find as many images as possible: ${websiteUrl}`,
      },
    ],
  })

  // Extract text blocks — use the last one (after web_search tool calls)
  const textBlocks = message.content.filter(
    (b): b is Anthropic.Messages.TextBlock => b.type === 'text'
  )

  if (!textBlocks.length) {
    console.error('[image-scanner] No text response from scan')
    return []
  }

  const rawText = textBlocks[textBlocks.length - 1].text.trim()

  // Extract JSON
  let jsonStr = rawText
  const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (fenceMatch) {
    jsonStr = fenceMatch[1]
  } else {
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (jsonMatch) jsonStr = jsonMatch[0]
  }

  try {
    const parsed = JSON.parse(jsonStr)
    return (parsed.images || []) as ScannedImage[]
  } catch (err) {
    console.error('[image-scanner] Failed to parse response:', err)
    return []
  }
}
