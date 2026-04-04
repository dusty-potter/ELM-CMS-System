import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = session.user.role

  const intakes = await prisma.clientIntake.findMany({
    include: {
      pipelineRun: {
        include: { revisions: { orderBy: { createdAt: 'desc' }, take: 1 } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Strip operator-hidden fields
  if (role === 'operator') {
    const stripped = intakes.map((intake) => ({
      ...intake,
      pipelineRun: intake.pipelineRun
        ? {
            ...intake.pipelineRun,
            stageLogs: undefined,
            auditScores: undefined,
            auditFixList: undefined,
          }
        : null,
    }))
    return NextResponse.json(stripped)
  }

  return NextResponse.json(intakes)
}
