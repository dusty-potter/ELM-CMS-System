import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { readFileSync } from 'fs'
import type { IntakeData, StageLogEntry } from './types'
import { setRepoSecrets } from './github-secrets'
import { createClientSecrets, getCloudRunServiceUrl } from './gcp-secrets'

const ORG = 'dusty-potter'
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || 'gen-lang-client-0546798119'
const SA_KEY_PATH = process.env.GCP_SA_KEY_PATH || '/tmp/elm-client-deployer-key.json'
const CMS_BASE_URL = 'https://ear-level-cms-429266701915.us-west1.run.app'

export type Stage3Result = {
  success: boolean
  stagingUrl?: string
  cloudRunService?: string
  error?: string
}

// ---------------------------------------------------------------------------
// GitHub API helper (reuse pattern from stage2)
// ---------------------------------------------------------------------------

async function ghFetch(path: string, init?: RequestInit): Promise<Response> {
  const pat = process.env.GITHUB_PAT
  if (!pat) throw new Error('GITHUB_PAT not set')

  const url = path.startsWith('https://') ? path : `https://api.github.com${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[pipeline] GitHub API error: ${res.status} ${path}`)
    console.error(`[pipeline] Response body: ${body}`)
    throw new Error(`GitHub API ${res.status}: ${path} — ${body}`)
  }
  return res
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function makeLogEntry(stage: number, name: string): StageLogEntry {
  return { stage, name, status: 'running', startedAt: new Date().toISOString() }
}

function completeLogEntry(entry: StageLogEntry, details?: Record<string, unknown>): StageLogEntry {
  return { ...entry, status: 'done', completedAt: new Date().toISOString(), details }
}

function failLogEntry(entry: StageLogEntry, error: string): StageLogEntry {
  return { ...entry, status: 'failed', completedAt: new Date().toISOString(), error }
}

// ---------------------------------------------------------------------------
// Main executor
// ---------------------------------------------------------------------------

export async function runStage3(intakeId: string): Promise<Stage3Result> {
  const intake = await prisma.clientIntake.findUniqueOrThrow({
    where: { id: intakeId },
    include: { pipelineRun: true },
  })

  if (!intake.pipelineRun) throw new Error(`No PipelineRun for intake ${intakeId}`)

  const payload = intake.payload as unknown as IntakeData
  const repoName = `elm-${intake.slug}`
  const repoFullName = `${ORG}/${repoName}`
  const serviceName = repoName // Cloud Run service name = repo name
  const existingLogs = (intake.pipelineRun.stageLogs as unknown as StageLogEntry[]) || []
  const stageLogs = [...existingLogs]

  // Find the Site record from Stage 2
  const site = await prisma.site.findFirst({
    where: { githubRepo: repoFullName },
  })

  if (!site) {
    const error = `No Site record found for repo ${repoFullName}`
    console.error(`[pipeline] ${error}`)
    stageLogs.push(failLogEntry(makeLogEntry(3, 'Stage 3'), error))
    await updatePipelineRun(intakeId, { stageLogs, status: 'failed' })
    return { success: false, error }
  }

  try {
    // ------------------------------------------------------------------
    // Step 1: Create GCP Secret Manager secrets
    // ------------------------------------------------------------------
    let step = makeLogEntry(3, 'Create GCP secrets')
    stageLogs.push(step)
    await updatePipelineRun(intakeId, { stageLogs })

    const revalidateSecret = randomBytes(32).toString('hex')
    const formWebhookUrl = payload.domain
      ? `https://${payload.domain}/api/form-submission`
      : ''

    const gcpSecrets = await createClientSecrets(
      intake.slug,
      site.id,
      site.apiKey,
      CMS_BASE_URL,
      revalidateSecret,
      formWebhookUrl
    )

    step = completeLogEntry(step, { secretNames: Object.keys(gcpSecrets) })
    stageLogs[stageLogs.length - 1] = step

    // ------------------------------------------------------------------
    // Step 2: Set GitHub repo secrets
    // ------------------------------------------------------------------
    step = makeLogEntry(3, 'Set GitHub repo secrets')
    stageLogs.push(step)

    let saKeyJson = ''
    try {
      saKeyJson = readFileSync(SA_KEY_PATH, 'utf-8')
    } catch {
      // If key file not available, check env var
      saKeyJson = process.env.GCP_SA_KEY_JSON || ''
      if (!saKeyJson) throw new Error(`Service account key not found at ${SA_KEY_PATH} or GCP_SA_KEY_JSON env var`)
    }

    await setRepoSecrets(ORG, repoName, {
      GCP_PROJECT_ID: GCP_PROJECT_ID,
      GCP_SA_KEY: saKeyJson,
      CLOUD_RUN_SERVICE_NAME: serviceName,
      VITE_SITE_URL: payload.domain ? `https://${payload.domain}` : '',
      VITE_CMS_SITE_ID: site.id,
    })

    step = completeLogEntry(step, { secrets: ['GCP_PROJECT_ID', 'GCP_SA_KEY', 'CLOUD_RUN_SERVICE_NAME', 'VITE_SITE_URL', 'VITE_CMS_SITE_ID'] })
    stageLogs[stageLogs.length - 1] = step

    // ------------------------------------------------------------------
    // Step 3: Update deploy.yml with client-specific secret names
    // ------------------------------------------------------------------
    step = makeLogEntry(3, 'Update deploy.yml secrets')
    stageLogs.push(step)

    // Read current deploy.yml
    const deployRes = await ghFetch(`/repos/${repoFullName}/contents/.github/workflows/deploy.yml`)
    const deployData = await deployRes.json()
    const deploySha = (deployData as { sha: string }).sha
    const deployContent = Buffer.from((deployData as { content: string }).content, 'base64').toString()

    // Replace generic secret names with client-specific ones
    const updatedDeploy = deployContent
      .replace('ELM_REVALIDATE_SECRET=ELM_REVALIDATE_SECRET:latest', `ELM_REVALIDATE_SECRET=elm-${intake.slug}-revalidate:latest`)
      .replace('ELM_SITE_ID=ELM_SITE_ID:latest', `ELM_SITE_ID=elm-${intake.slug}-site-id:latest`)
      .replace('ELM_FORM_WEBHOOK_URL=ELM_FORM_WEBHOOK_URL:latest', `ELM_FORM_WEBHOOK_URL=elm-${intake.slug}-form-webhook:latest`)
      .replace('VITE_CMS_API_KEY=VITE_CMS_API_KEY:latest', `VITE_CMS_API_KEY=elm-${intake.slug}-api-key:latest`)
      .replace('VITE_CMS_BASE_URL=VITE_CMS_BASE_URL:latest', `VITE_CMS_BASE_URL=elm-${intake.slug}-cms-base-url:latest`)

    await ghFetch(`/repos/${repoFullName}/contents/.github/workflows/deploy.yml`, {
      method: 'PUT',
      body: JSON.stringify({
        message: `Stage 3: Configure deploy secrets — ${payload.businessName}`,
        content: Buffer.from(updatedDeploy).toString('base64'),
        sha: deploySha,
      }),
    })

    step = completeLogEntry(step)
    stageLogs[stageLogs.length - 1] = step

    // ------------------------------------------------------------------
    // Step 4: Trigger GitHub Actions workflow
    // ------------------------------------------------------------------
    step = makeLogEntry(3, 'Trigger deploy workflow')
    stageLogs.push(step)

    // The deploy.yml commit will auto-trigger the workflow (push to main).
    // But let's also dispatch explicitly to be safe.
    try {
      await ghFetch(`/repos/${repoFullName}/actions/workflows/deploy.yml/dispatches`, {
        method: 'POST',
        body: JSON.stringify({ ref: 'main' }),
      })
    } catch {
      // workflow_dispatch may not be needed since push-to-main already triggers it
      console.log('[pipeline] Workflow dispatch failed (push trigger may handle it)')
    }

    step = completeLogEntry(step)
    stageLogs[stageLogs.length - 1] = step

    // ------------------------------------------------------------------
    // Step 5: Poll workflow run until complete
    // ------------------------------------------------------------------
    step = makeLogEntry(3, 'Wait for deploy')
    stageLogs.push(step)
    await updatePipelineRun(intakeId, { stageLogs })

    await sleep(15000) // Wait 15s for workflow to start

    let deploySuccess = false
    let deployError = ''

    for (let i = 0; i < 40; i++) { // 40 * 15s = 10 min max
      try {
        const runsRes = await ghFetch(`/repos/${repoFullName}/actions/runs?per_page=1`)
        const runsData = await runsRes.json()
        const runs = (runsData as { workflow_runs: Array<{ status: string; conclusion: string | null }> }).workflow_runs

        if (runs.length > 0) {
          const latest = runs[0]
          if (latest.status === 'completed') {
            if (latest.conclusion === 'success') {
              deploySuccess = true
            } else {
              deployError = `Workflow completed with conclusion: ${latest.conclusion}`
            }
            break
          }
        }
      } catch {
        // Continue polling
      }
      await sleep(15000)
    }

    if (deploySuccess) {
      step = completeLogEntry(step)
    } else {
      step = failLogEntry(step, deployError || 'Deploy timed out after 10 minutes')
    }
    stageLogs[stageLogs.length - 1] = step

    // ------------------------------------------------------------------
    // Step 6: Read Cloud Run service URL
    // ------------------------------------------------------------------
    let stagingUrl: string | null = null

    if (deploySuccess) {
      step = makeLogEntry(3, 'Capture staging URL')
      stageLogs.push(step)

      // Wait a moment for Cloud Run to propagate
      await sleep(5000)
      stagingUrl = await getCloudRunServiceUrl(serviceName)

      if (stagingUrl) {
        step = completeLogEntry(step, { stagingUrl })
      } else {
        step = failLogEntry(step, 'Could not read Cloud Run service URL')
      }
      stageLogs[stageLogs.length - 1] = step
    }

    // ------------------------------------------------------------------
    // Step 7: Update PipelineRun + Site
    // ------------------------------------------------------------------
    await updatePipelineRun(intakeId, {
      currentStage: 3,
      stageLogs,
      status: deploySuccess ? 'awaiting_review' : 'failed',
      stagingUrl: stagingUrl ?? undefined,
    })

    // Update Site with Cloud Run details
    if (deploySuccess) {
      await prisma.site.update({
        where: { id: site.id },
        data: {
          cloudRunService: serviceName,
          cloudRunRegion: 'us-central1',
        },
      })
    }

    return {
      success: deploySuccess,
      stagingUrl: stagingUrl ?? undefined,
      cloudRunService: deploySuccess ? serviceName : undefined,
      error: deploySuccess ? undefined : deployError,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`[pipeline] Stage 3 failed for intake ${intakeId}:`, errorMsg)

    stageLogs.push(failLogEntry(makeLogEntry(3, 'Stage 3'), errorMsg))
    await updatePipelineRun(intakeId, {
      currentStage: 3,
      stageLogs,
      status: 'failed',
    }).catch(e => console.error('[pipeline] Failed to update PipelineRun:', e))

    return { success: false, error: errorMsg }
  }
}

// ---------------------------------------------------------------------------
// Prisma helper
// ---------------------------------------------------------------------------

async function updatePipelineRun(
  intakeId: string,
  data: { stageLogs?: StageLogEntry[]; currentStage?: number; status?: string; stagingUrl?: string }
) {
  const update: Record<string, unknown> = {}
  if (data.currentStage !== undefined) update.currentStage = data.currentStage
  if (data.stageLogs) update.stageLogs = JSON.parse(JSON.stringify(data.stageLogs))
  if (data.status) update.status = data.status
  if (data.stagingUrl) update.stagingUrl = data.stagingUrl

  await prisma.pipelineRun.update({
    where: { intakeId },
    data: update,
  })
}
