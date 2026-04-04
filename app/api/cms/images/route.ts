import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processAndUploadImage } from '@/lib/storage'

export const dynamic = 'force-dynamic'

/**
 * POST /api/cms/images
 * Body: {
 *   formFactorId: string,
 *   images: Array<{ url: string, type: 'hero' | 'gallery', description?: string }>
 * }
 *
 * Fetches each image, processes to webp in standard sizes, uploads to GCS,
 * and creates FormFactorImage records.
 */
export async function POST(req: NextRequest) {
  try {
    const { formFactorId, images } = await req.json()

    if (!formFactorId || !images?.length) {
      return NextResponse.json(
        { error: 'formFactorId and images array are required' },
        { status: 400 },
      )
    }

    // Verify the form factor exists
    const formFactor = await prisma.formFactor.findUnique({
      where: { id: formFactorId },
      select: { id: true, slug: true, productId: true },
    })
    if (!formFactor) {
      return NextResponse.json({ error: 'Form factor not found' }, { status: 404 })
    }

    const folder = `form-factors/${formFactor.id}`
    const results = []

    for (let i = 0; i < images.length; i++) {
      const img = images[i]
      try {
        const processed = await processAndUploadImage(img.url, folder, {
          type: img.type ?? 'gallery',
        })

        // Create the FormFactorImage record
        const record = await prisma.formFactorImage.create({
          data: {
            formFactorId: formFactor.id,
            type: img.type === 'hero' ? 'hero' : 'gallery',
            sourceUrl: img.url,
            localUrl: processed.localUrl,
            variantHeroWide: processed.variantHeroWide,
            variantSquare: processed.variantSquare,
            variantThumbnail: processed.variantThumbnail,
            sortOrder: img.type === 'hero' ? 0 : i + 1,
          },
        })

        results.push({
          id: record.id,
          sourceUrl: img.url,
          localUrl: processed.localUrl,
          status: 'success',
        })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to process image'
        console.error(`Image processing error for ${img.url}:`, message)
        results.push({
          sourceUrl: img.url,
          status: 'error',
          error: message,
        })
      }
    }

    return NextResponse.json({ formFactorId, results })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Image processing failed'
    console.error('Images API error:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
