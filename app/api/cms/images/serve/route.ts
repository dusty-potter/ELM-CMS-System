import { NextRequest, NextResponse } from 'next/server'
import { signedUrl } from '@/lib/storage'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cms/images/serve?path=gs://bucket/path/to/image.webp
 *
 * Returns a redirect to a short-lived signed URL for a GCS image.
 * Use this to serve images stored as gs:// paths in the database.
 */
export async function GET(req: NextRequest) {
  const gcsPath = req.nextUrl.searchParams.get('path')

  if (!gcsPath || !gcsPath.startsWith('gs://')) {
    return NextResponse.json({ error: 'path parameter required (gs://... format)' }, { status: 400 })
  }

  try {
    const url = await signedUrl(gcsPath, 3600) // 1 hour
    return NextResponse.redirect(url)
  } catch (e) {
    console.error('Image serve error:', e)
    return NextResponse.json({ error: 'Failed to serve image' }, { status: 500 })
  }
}
