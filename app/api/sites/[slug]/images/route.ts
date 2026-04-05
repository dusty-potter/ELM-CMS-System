import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { processAndUploadImage } from '@/lib/storage'

export const dynamic = 'force-dynamic'

// GET — list all images for this intake
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const intake = await prisma.clientIntake.findUnique({
    where: { slug: params.slug },
    include: {
      images: { orderBy: [{ classification: 'asc' }, { sortOrder: 'asc' }] },
    },
  })

  if (!intake) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(intake.images)
}

// POST — import selected images (download, process, upload to GCS)
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = session.user.role
  if (role !== 'admin' && role !== 'operator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { imageIds } = await req.json()
  if (!Array.isArray(imageIds) || imageIds.length === 0) {
    return NextResponse.json({ error: 'imageIds array is required' }, { status: 400 })
  }

  const intake = await prisma.clientIntake.findUnique({
    where: { slug: params.slug },
  })

  if (!intake) {
    return NextResponse.json({ error: 'Intake not found' }, { status: 404 })
  }

  const results = []

  for (const imageId of imageIds) {
    const image = await prisma.clientImage.findUnique({ where: { id: imageId } })
    if (!image || image.intakeId !== intake.id) {
      results.push({ imageId, status: 'error', error: 'Image not found' })
      continue
    }

    try {
      const processed = await processAndUploadImage(
        image.sourceUrl,
        `client-images/${intake.id}`
      )

      await prisma.clientImage.update({
        where: { id: imageId },
        data: {
          localUrl: processed.localUrl,
          variantHeroWide: processed.variantHeroWide,
          variantSquare: processed.variantSquare,
          variantThumbnail: processed.variantThumbnail,
          imported: true,
        },
      })

      results.push({ imageId, status: 'success', localUrl: processed.localUrl })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed'
      results.push({ imageId, status: 'error', error: msg })
    }
  }

  return NextResponse.json({ results })
}

// PATCH — update slot assignments
export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = session.user.role
  if (role !== 'admin' && role !== 'operator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { assignments } = await req.json()
  if (!Array.isArray(assignments)) {
    return NextResponse.json({ error: 'assignments array is required' }, { status: 400 })
  }

  const intake = await prisma.clientIntake.findUnique({
    where: { slug: params.slug },
  })

  if (!intake) {
    return NextResponse.json({ error: 'Intake not found' }, { status: 404 })
  }

  for (const { imageId, slot } of assignments) {
    await prisma.clientImage.update({
      where: { id: imageId },
      data: { slot },
    })
  }

  return NextResponse.json({ ok: true })
}
