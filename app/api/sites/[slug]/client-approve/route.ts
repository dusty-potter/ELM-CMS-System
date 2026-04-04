import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
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
    include: { pipelineRun: true },
  })

  if (!intake?.pipelineRun) {
    return NextResponse.json({ error: 'No pipeline run found' }, { status: 404 })
  }

  const data: Record<string, unknown> = { clientApproved: true }

  // If admin has already approved, advance status to approved
  if (intake.pipelineRun.approved) {
    data.status = 'approved'
  }

  const updated = await prisma.pipelineRun.update({
    where: { id: intake.pipelineRun.id },
    data,
  })

  return NextResponse.json(updated)
}
