import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `You are a business research assistant for a hearing aid marketing agency. Given a URL for a hearing care practice website, use web search to find information about the business and return structured JSON.

Return ONLY valid JSON (no markdown fences, no commentary) with this exact shape:

{
  "businessName": "string",
  "domain": "string",
  "practiceType": "Audiologist" | "Hearing Instrument Specialist" | "ENT" | "Multi-location Group",
  "numberOfLocations": number | null,
  "serviceArea": "string",
  "primaryServices": "string",
  "credentials": "string",
  "teamMembers": [{ "name": "string", "title": "string", "credentials": "string" }],
  "manufacturersCarried": ["string"],
  "phoneReliability": null,
  "afterHoursCoverage": null,
  "schedulingMethod": null,
  "existingUrl": "string",
  "keyPages": "string",
  "currentCtaPattern": "string",
  "contentToKeep": "string",
  "contentToRemove": "string",
  "missingContent": "string",
  "primaryBrandColor": "string or null (hex if detectable)",
  "logoStatus": null,
  "photographyAvailable": null,
  "brandTone": ["string"],
  "styleNotes": "string"
}

For fields you cannot determine from the website, use null or empty string. For manufacturersCarried, only include brands from this list if found: Signia, Widex, Phonak, Oticon, ReSound, Starkey, Unitron, Bernafon, Audibel, Miracle-Ear.

Analyze the site's content quality, CTA patterns, and identify content gaps. Be specific about what pages exist and what's missing for a modern hearing care website.`

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    // Use ELM_ANTHROPIC_API_KEY to avoid collision with Claude Code's ANTHROPIC_API_KEY in dev
    const apiKey = process.env.ELM_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured', partial: null }, { status: 500 })
    }
    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 5,
        } as unknown as Anthropic.Messages.Tool,
      ],
      messages: [
        {
          role: 'user',
          content: `Research this hearing care practice website and extract business information: ${url}`,
        },
      ],
    })

    // Extract text blocks — use the last one (after web_search tool calls)
    const textBlocks = message.content.filter(
      (b): b is Anthropic.Messages.TextBlock => b.type === 'text'
    )

    if (!textBlocks.length) {
      return NextResponse.json(
        { error: 'No text response from scan', partial: null },
        { status: 502 }
      )
    }

    // Use the last text block (most likely contains the final JSON)
    const rawText = textBlocks[textBlocks.length - 1].text.trim()

    // Extract JSON from the response — handle markdown fences and prose preambles
    let jsonStr = rawText
    // Strip markdown fences
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
    if (fenceMatch) {
      jsonStr = fenceMatch[1]
    } else {
      // Try to find a JSON object in the text
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonStr = jsonMatch[0]
      }
    }

    const parsed = JSON.parse(jsonStr)
    return NextResponse.json(parsed)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scan failed'
    return NextResponse.json({ error: message, partial: null }, { status: 500 })
  }
}
