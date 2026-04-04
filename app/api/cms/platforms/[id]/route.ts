import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveImageUrl, resolveImageRecord } from '@/lib/storage'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// GET /api/cms/platforms/[id]
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const platform = await prisma.platform.findUnique({
      where: { id },
      include: {
        manufacturer: true,
        capabilityPool: { orderBy: { category: 'asc' } },
        fittingOptions: true,
        images: { orderBy: { sortOrder: 'asc' } },
        products: {
          include: {
            formFactors: {
              include: { images: { orderBy: { sortOrder: 'asc' } } },
              orderBy: { name: 'asc' },
            },
            declaredCapabilities: {
              include: { capability: true },
            },
            _count: { select: { variants: true, publications: true } },
          },
          orderBy: { tier: 'asc' },
        },
      },
    })

    if (!platform) {
      return NextResponse.json({ error: 'Platform not found' }, { status: 404 })
    }

    // Include total published site publication count for delete eligibility
    const publishedCount = await prisma.sitePublication.count({
      where: {
        product: { platformId: id },
        status: 'published',
      },
    })

    // Resolve gs:// image URLs to signed URLs for the browser
    const resolvedManufacturer = {
      ...platform.manufacturer,
      logoUrl: await resolveImageUrl(platform.manufacturer.logoUrl),
    }
    const resolvedImages = await Promise.all(
      platform.images.map(img => resolveImageRecord(img))
    )
    const resolvedProducts = await Promise.all(
      platform.products.map(async (product) => ({
        ...product,
        formFactors: await Promise.all(
          product.formFactors.map(async (ff) => ({
            ...ff,
            images: await Promise.all(ff.images.map(img => resolveImageRecord(img))),
          }))
        ),
      }))
    )

    return NextResponse.json({
      ...platform,
      manufacturer: resolvedManufacturer,
      images: resolvedImages,
      products: resolvedProducts,
      _publishedSiteCount: publishedCount,
    })
  } catch (e) {
    console.error('Platform fetch error:', e)
    return NextResponse.json({ error: 'Failed to fetch platform' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/cms/platforms/[id]
//
// When status is set to 'retired':
//   - All SitePublications for products under this platform are deleted
//   - All child Products are also set to 'retired'
// ---------------------------------------------------------------------------

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const fields = await req.json()

  const allowed: Record<string, boolean> = {
    displayName: true, summary: true, keyDifferentiators: true,
    techTerms: true, status: true, isLegacy: true, generationYear: true,
    connectivityIos: true, connectivityAndroid: true, connectivityBluetooth: true,
    connectivityAuracast: true, connectivityHandsFree: true, connectivityRemoteControl: true,
  }

  const data: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (allowed[key]) data[key] = value
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  try {
    // Retire cascade: unpublish from all sites and retire all products
    if (data.status === 'retired') {
      await prisma.$transaction(async (tx) => {
        // Delete all site publications for products under this platform
        await tx.sitePublication.deleteMany({
          where: { product: { platformId: id } },
        })
        // Set all child products to retired
        await tx.product.updateMany({
          where: { platformId: id },
          data: { status: 'retired' },
        })
        // Update the platform itself
        await tx.platform.update({ where: { id }, data })
      })
    } else {
      await prisma.platform.update({ where: { id }, data })
    }

    // Return updated platform
    const updated = await prisma.platform.findUnique({ where: { id } })
    return NextResponse.json(updated)
  } catch (e) {
    console.error('Platform update error:', e)
    return NextResponse.json({ error: 'Failed to update platform' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/cms/platforms/[id]
//
// Hard delete — only allowed when no products are published to sites.
// Deletes all child products first (they cascade their children),
// then deletes the platform.
// ---------------------------------------------------------------------------

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    // Check for published site publications
    const publishedCount = await prisma.sitePublication.count({
      where: {
        product: { platformId: id },
        status: 'published',
      },
    })

    if (publishedCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete — ${publishedCount} product(s) are published to sites. Retire the platform first.` },
        { status: 409 },
      )
    }

    await prisma.$transaction(async (tx) => {
      // Must delete in order to respect RESTRICT constraints:
      // 1. FF capability declarations & exclusions (RESTRICT on ProductCapabilityDeclaration)
      await tx.formFactorCapabilityDeclaration.deleteMany({
        where: { formFactor: { product: { platformId: id } } },
      })
      await tx.formFactorCapabilityExclusion.deleteMany({
        where: { formFactor: { product: { platformId: id } } },
      })
      // 2. Products (cascades: ProductCapDecls, FormFactors, Variants, Publications)
      await tx.product.deleteMany({ where: { platformId: id } })
      // 3. Platform (cascades: FittingOptions, PlatformCapabilities)
      await tx.platform.delete({ where: { id } })
    })

    return NextResponse.json({ deleted: true })
  } catch (e) {
    console.error('Platform delete error:', e)
    return NextResponse.json({ error: 'Failed to delete platform' }, { status: 500 })
  }
}
