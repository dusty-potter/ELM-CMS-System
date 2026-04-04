import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

  const { requestText } = await req.json()
  if (!requestText?.trim()) {
    return NextResponse.json({ error: 'requestText is required' }, { status: 400 })
  }

  const intake = await prisma.clientIntake.findUnique({
    where: { slug: params.slug },
    include: { pipelineRun: true },
  })

  if (!intake?.pipelineRun) {
    return NextResponse.json({ error: 'No pipeline run found' }, { status: 404 })
  }

  const [revision] = await prisma.$transaction([
    prisma.revision.create({
      data: {
        pipelineRunId: intake.pipelineRun.id,
        requestText: requestText.trim(),
        submittedBy: session.user.email ?? session.user.name ?? session.user.id,
      },
    }),
    prisma.pipelineRun.update({
      where: { id: intake.pipelineRun.id },
      data: { status: 'revision_requested' },
    }),
  ])

  return NextResponse.json(revision, { status: 201 })
}
