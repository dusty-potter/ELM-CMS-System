import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    return NextResponse.json(platform)
  } catch (e) {
    console.error('Platform fetch error:', e)
    return NextResponse.json({ error: 'Failed to fetch platform' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/cms/platforms/[id]
// ---------------------------------------------------------------------------

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const fields = await req.json()

  // Whitelist of updatable fields
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
    const updated = await prisma.platform.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (e) {
    console.error('Platform update error:', e)
    return NextResponse.json({ error: 'Failed to update platform' }, { status: 500 })
  }
}
