import { NextRequest, NextResponse } from 'next/server'
import { uploadImageFromUrl } from '@/lib/storage'

/**
 * POST /api/storage/upload
 * Body: { sourceUrl: string, folder: string, filename?: string }
 *
 * Downloads an image from sourceUrl and stores it in GCS.
 * Returns { localUrl } — the gs:// path stored in the DB.
 */
export async function POST(req: NextRequest) {
  const { sourceUrl, folder, filename } = await req.json()

  if (!sourceUrl || !folder) {
    return NextResponse.json({ error: 'sourceUrl and folder are required' }, { status: 400 })
  }

  // Basic URL validation — reject anything that isn't http/https
  let parsed: URL
  try {
    parsed = new URL(sourceUrl)
  } catch {
    return NextResponse.json({ error: 'sourceUrl is not a valid URL' }, { status: 400 })
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return NextResponse.json({ error: 'sourceUrl must be http or https' }, { status: 400 })
  }

  try {
    const { localUrl, contentType } = await uploadImageFromUrl(sourceUrl, folder, filename)
    return NextResponse.json({ localUrl, contentType })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Upload failed'
    console.error('Storage upload error:', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
