import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/slugify'
import { runStage2 } from '@/lib/pipeline/stage2'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = session.user.role
  if (role !== 'admin' && role !== 'operator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const payload = await req.json()

    if (!payload.businessName) {
      return NextResponse.json({ error: 'businessName is required' }, { status: 400 })
    }

    // Generate slug from business name, append timestamp for uniqueness
    const baseSlug = slugify(payload.businessName)
    const slug = `${baseSlug}-${Date.now().toString(36)}`

    // Step 1: Create the intake record
    const intake = await prisma.clientIntake.create({
      data: {
        slug,
        payload,
        intakeBy: session.user.email ?? session.user.name ?? session.user.id,
      },
    })

    // Step 2: Create the pipeline run record
    await prisma.pipelineRun.create({
      data: {
        intakeId: intake.id,
        currentStage: 0,
        stageLogs: [],
        status: 'running',
      },
    })

    // Step 3: Fire Stage 2 in background (do not await on request thread)
    // Safe on Cloud Run (persistent container) and Next.js dev (long-running process)
    void runStage2(intake.id).catch((err) => {
      console.error(`[pipeline] stage2 failed for intake ${intake.id}:`, err)
    })

    return NextResponse.json(
      { id: intake.id, slug: intake.slug, message: 'Pipeline launched' },
      { status: 201 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create intake'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
