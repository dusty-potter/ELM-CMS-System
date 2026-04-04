import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const manufacturers = await prisma.manufacturer.findMany({
      include: {
        _count: { select: { platforms: true, products: true } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(manufacturers)
  } catch (e) {
    console.error('Manufacturers fetch error:', e)
    return NextResponse.json({ error: 'Failed to fetch manufacturers' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const { id, logoUrl } = await req.json()
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  try {
    const updated = await prisma.manufacturer.update({
      where: { id },
      data: { ...(logoUrl !== undefined && { logoUrl }) },
    })
    return NextResponse.json(updated)
  } catch (e) {
    console.error('Manufacturer update error:', e)
    return NextResponse.json({ error: 'Failed to update manufacturer' }, { status: 500 })
  }
}
