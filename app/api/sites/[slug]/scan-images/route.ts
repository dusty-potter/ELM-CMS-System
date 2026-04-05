import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { scanClientImages } from '@/lib/pipeline/image-scanner'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = session.user.role
  if (role !== 'admin' && role !== 'operator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const intake = await prisma.clientIntake.findUnique({
    where: { slug: params.slug },
  })

  if (!intake) {
    return NextResponse.json({ error: 'Intake not found' }, { status: 404 })
  }

  const payload = intake.payload as Record<string, unknown>
  const websiteUrl = (payload.existingUrl as string) || (payload.domain as string)

  if (!websiteUrl) {
    return NextResponse.json({ error: 'No website URL available to scan' }, { status: 400 })
  }

  try {
    const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`
    const scannedImages = await scanClientImages(url)

    // Create ClientImage records for each discovered image
    const created = await Promise.all(
      scannedImages.map((img) =>
        prisma.clientImage.create({
          data: {
            intakeId: intake.id,
            sourceUrl: img.url,
            classification: img.classification as never,
            confidence: img.confidence,
            altText: img.altText,
            imported: false,
          },
        })
      )
    )

    return NextResponse.json({
      count: created.length,
      images: created,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Image scan failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
