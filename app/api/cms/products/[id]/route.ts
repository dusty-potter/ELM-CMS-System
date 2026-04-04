import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveImageRecord } from '@/lib/storage'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        manufacturer: true,
        platform: {
          include: {
            capabilityPool: true,
          },
        },
        formFactors: {
          include: {
            images: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        declaredCapabilities: {
          include: {
            capability: true,
          },
        },
        variants: {
          orderBy: { createdAt: 'desc' },
        },
        publications: {
          include: { site: true },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Resolve gs:// image URLs to signed URLs
    const resolvedFormFactors = await Promise.all(
      product.formFactors.map(async (ff) => ({
        ...ff,
        images: await Promise.all((ff.images || []).map(img => resolveImageRecord(img))),
      }))
    )

    return NextResponse.json({ ...product, formFactors: resolvedFormFactors })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch product'
    console.error('Product fetch error:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const {
      name, displayName, tier, status,
      canonicalDescription, targetUser,
      bestFor, pros, cons, hearingLossRange,
      compSpeechInNoise, compMusicQuality,
      compTinnitusSupport, compAiProcessing,
      compRemoteCare, compHealthTracking,
    } = body

    // Retire cascade: unpublish from all sites
    if (status === 'retired') {
      await prisma.sitePublication.deleteMany({
        where: { productId: params.id },
      })
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(displayName !== undefined && { displayName }),
        ...(tier !== undefined && { tier }),
        ...(status !== undefined && { status }),
        ...(canonicalDescription !== undefined && { canonicalDescription }),
        ...(targetUser !== undefined && { targetUser }),
        ...(bestFor !== undefined && { bestFor }),
        ...(pros !== undefined && { pros }),
        ...(cons !== undefined && { cons }),
        ...(hearingLossRange !== undefined && { hearingLossRange }),
        ...(compSpeechInNoise !== undefined && { compSpeechInNoise }),
        ...(compMusicQuality !== undefined && { compMusicQuality }),
        ...(compTinnitusSupport !== undefined && { compTinnitusSupport }),
        ...(compAiProcessing !== undefined && { compAiProcessing }),
        ...(compRemoteCare !== undefined && { compRemoteCare }),
        ...(compHealthTracking !== undefined && { compHealthTracking }),
      },
      include: {
        manufacturer: true,
        platform: true,
      },
    })

    return NextResponse.json(product)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to update product'
    console.error('Product update error:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/cms/products/[id]
//
// Hard delete — only when no published site publications exist.
// Cascades: FormFactors, ContentVariants, SitePublications, Declarations.
// ---------------------------------------------------------------------------

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const publishedCount = await prisma.sitePublication.count({
      where: { productId: params.id, status: 'published' },
    })

    if (publishedCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete — product is published to ${publishedCount} site(s). Retire it first.` },
        { status: 409 },
      )
    }

    // Must delete in order to respect RESTRICT constraints:
    // FormFactorCapabilityDeclarations → FormFactorCapabilityExclusions
    //   (both RESTRICT on ProductCapabilityDeclaration)
    // Then ProductCapabilityDeclarations, FormFactors, etc. can cascade
    await prisma.$transaction(async (tx) => {
      // 1. Delete FF capability declarations & exclusions (they RESTRICT ProductCapabilityDeclaration)
      await tx.formFactorCapabilityDeclaration.deleteMany({
        where: { formFactor: { productId: params.id } },
      })
      await tx.formFactorCapabilityExclusion.deleteMany({
        where: { formFactor: { productId: params.id } },
      })
      // 2. Now safe to delete the product (cascades: ProductCapDecls, FormFactors, Variants, Publications)
      await tx.product.delete({ where: { id: params.id } })
    })

    return NextResponse.json({ deleted: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to delete product'
    console.error('Product delete error:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
