import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { slugify } from '@/lib/slugify'

export async function GET() {
  try {
    const sites = await prisma.site.findMany({
      include: {
        supportedManufacturers: { include: { manufacturer: { select: { name: true } } } },
        _count: { select: { publications: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(sites)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch sites'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { name, domain, webhookUrl, githubRepo, cloudRunService, cloudRunRegion, manufacturerNames } = await req.json()

  if (!name || !domain) {
    return NextResponse.json({ error: 'name and domain are required' }, { status: 400 })
  }

  const id = slugify(name)
  const apiKey = randomBytes(24).toString('hex')

  try {
    const site = await prisma.site.create({
      data: {
        id,
        name,
        domain,
        webhookUrl: webhookUrl || null,
        githubRepo: githubRepo || null,
        cloudRunService: cloudRunService || null,
        cloudRunRegion: cloudRunRegion || 'us-central1',
        apiKey,
        active: true,
        supportedManufacturers: manufacturerNames?.length
          ? {
              create: await Promise.all(
                (manufacturerNames as string[]).map(async (mName: string) => {
                  const mfr = await prisma.manufacturer.findFirst({ where: { name: mName } })
                  if (!mfr) throw new Error(`Manufacturer not found: ${mName}`)
                  return { manufacturerId: mfr.id }
                })
              ),
            }
          : undefined,
      },
      include: {
        supportedManufacturers: { include: { manufacturer: { select: { name: true } } } },
        _count: { select: { publications: true } },
      },
    })
    return NextResponse.json(site)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create site'
    console.error('Site create error:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  try {
    await prisma.site.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to delete site'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
