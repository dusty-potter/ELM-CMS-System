import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processAndUploadImage } from '@/lib/storage'

export const dynamic = 'force-dynamic'

/**
 * POST /api/cms/images
 * Body: {
 *   // Assign to a form factor:
 *   formFactorId?: string,
 *   // OR assign to a platform:
 *   platformId?: string,
 *   // OR set as manufacturer logo:
 *   manufacturerId?: string,
 *   isLogo?: boolean,
 *   //
 *   images: Array<{ url: string, type: 'hero' | 'gallery', description?: string }>
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { formFactorId, platformId, manufacturerId, isLogo, images } = await req.json()

    if (!images?.length) {
      return NextResponse.json({ error: 'images array is required' }, { status: 400 })
    }

    // ── Manufacturer logo ────────────────────────────────────────────────
    if (isLogo && manufacturerId) {
      const img = images[0]
      try {
        const folder = `manufacturers/${manufacturerId}`
        const processed = await processAndUploadImage(img.url, folder, { type: 'hero' })

        await prisma.manufacturer.update({
          where: { id: manufacturerId },
          data: { logoUrl: processed.variantSquare || processed.localUrl },
        })

        return NextResponse.json({
          manufacturerId,
          logoUrl: processed.variantSquare || processed.localUrl,
          status: 'success',
        })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to process logo'
        return NextResponse.json({ error: message }, { status: 500 })
      }
    }

    // ── Platform images ──────────────────────────────────────────────────
    if (platformId) {
      const platform = await prisma.platform.findUnique({
        where: { id: platformId },
        select: { id: true },
      })
      if (!platform) {
        return NextResponse.json({ error: 'Platform not found' }, { status: 404 })
      }

      const folder = `platforms/${platformId}`
      const results = []

      for (let i = 0; i < images.length; i++) {
        const img = images[i]
        try {
          const processed = await processAndUploadImage(img.url, folder, {
            type: img.type ?? 'gallery',
          })

          const record = await prisma.platformImage.create({
            data: {
              platformId,
              type: img.type === 'hero' ? 'hero' : 'gallery',
              sourceUrl: img.url,
              localUrl: processed.localUrl,
              variantHeroWide: processed.variantHeroWide,
              variantSquare: processed.variantSquare,
              variantThumbnail: processed.variantThumbnail,
              sortOrder: img.type === 'hero' ? 0 : i + 1,
            },
          })

          results.push({ id: record.id, sourceUrl: img.url, localUrl: processed.localUrl, status: 'success' })
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Failed to process image'
          console.error(`Image processing error for ${img.url}:`, message)
          results.push({ sourceUrl: img.url, status: 'error', error: message })
        }
      }

      return NextResponse.json({ platformId, results })
    }

    // ── Form factor images (original behavior) ──────────────────────────
    if (!formFactorId) {
      return NextResponse.json(
        { error: 'formFactorId, platformId, or manufacturerId+isLogo is required' },
        { status: 400 },
      )
    }

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

        results.push({ id: record.id, sourceUrl: img.url, localUrl: processed.localUrl, status: 'success' })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to process image'
        console.error(`Image processing error for ${img.url}:`, message)
        results.push({ sourceUrl: img.url, status: 'error', error: message })
      }
    }

    return NextResponse.json({ formFactorId, results })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Image processing failed'
    console.error('Images API error:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
