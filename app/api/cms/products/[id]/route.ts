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
