import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
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
    const body = await req.json()
    const { _resumeSlug, ...payload } = body

    if (!payload.businessName) {
      return NextResponse.json({ error: 'businessName is required' }, { status: 400 })
    }

    let intake

    if (_resumeSlug) {
      // Resume flow: update existing intake record
      const existing = await prisma.clientIntake.findUnique({
        where: { slug: _resumeSlug },
        include: { pipelineRun: true },
      })

      if (existing) {
        // Update payload on existing record
        intake = await prisma.clientIntake.update({
          where: { id: existing.id },
          data: {
            payload,
            intakeBy: session.user.email ?? session.user.name ?? session.user.id,
          },
        })

        // Reset or create PipelineRun
        if (existing.pipelineRun) {
          if (existing.pipelineRun.status === 'failed') {
            await prisma.pipelineRun.update({
              where: { id: existing.pipelineRun.id },
              data: {
                currentStage: 0,
                stageLogs: [],
                status: 'running',
                approved: false,
                clientApproved: false,
                buildDocument: null,
                stagingUrl: null,
                auditScores: Prisma.JsonNull,
                auditFixList: null,
                liveUrl: null,
              },
            })
          }
          // If not failed, leave the existing PipelineRun as-is
        } else {
          await prisma.pipelineRun.create({
            data: {
              intakeId: intake.id,
              currentStage: 0,
              stageLogs: [],
              status: 'running',
            },
          })
        }
      } else {
        // Resume slug not found — fall through to create new
        intake = null
      }
    }

    if (!intake) {
      // New intake flow
      const baseSlug = slugify(payload.businessName)
      const slug = `${baseSlug}-${Date.now().toString(36)}`

      intake = await prisma.clientIntake.create({
        data: {
          slug,
          payload,
          intakeBy: session.user.email ?? session.user.name ?? session.user.id,
        },
      })

      await prisma.pipelineRun.create({
        data: {
          intakeId: intake.id,
          currentStage: 0,
          stageLogs: [],
          status: 'running',
        },
      })
    }

    // Fire Stage 2 in background
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
