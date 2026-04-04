import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        manufacturer: { select: { name: true } },
        platform: { select: { id: true, name: true } },
        formFactors: { select: { id: true, style: true, name: true, status: true } },
        _count: { select: { variants: true, publications: true } },
      },
      orderBy: [{ manufacturer: { name: 'asc' } }, { name: 'asc' }],
    })
    return NextResponse.json(products)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch products'
    console.error('Products fetch error:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
