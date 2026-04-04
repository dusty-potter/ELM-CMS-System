import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const platforms = await prisma.platform.findMany({
      include: {
        manufacturer: { select: { name: true } },
        _count: { select: { products: true, formFactors: true, fittingOptions: true } },
      },
      orderBy: [{ isLegacy: 'asc' }, { generationYear: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json(platforms)
  } catch (e) {
    console.error('Platforms list error:', e)
    return NextResponse.json({ error: 'Failed to fetch platforms' }, { status: 500 })
  }
}
