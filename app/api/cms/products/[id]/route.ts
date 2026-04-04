import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    return NextResponse.json(product)
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

    await prisma.product.delete({ where: { id: params.id } })
    return NextResponse.json({ deleted: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to delete product'
    console.error('Product delete error:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
