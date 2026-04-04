import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const intake = await prisma.clientIntake.findUnique({
    where: { slug: params.slug },
    include: { pipelineRun: true },
  })

  if (!intake?.pipelineRun) {
    return NextResponse.json({ error: 'No pipeline run found' }, { status: 404 })
  }

  const updated = await prisma.pipelineRun.update({
    where: { id: intake.pipelineRun.id },
    data: { approved: true, status: 'approved' },
  })

  return NextResponse.json(updated)
}
