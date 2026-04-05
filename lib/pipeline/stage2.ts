import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/slugify'
import { randomBytes } from 'crypto'
import type { IntakeData, StageLogEntry, Stage2Result } from './types'
import {
  generateSiteConfig,
  generateIndexCss,
  generateRedirects,
  generateBookPage,
} from './templates'

const TEMPLATE_OWNER = 'dusty-potter'
const TEMPLATE_REPO = 'elm-template-hearing-care'
const ORG = 'dusty-potter'

const CONFIG_FILES = [
  { path: 'src/config/site.ts', generator: 'siteConfig' },
  { path: 'src/index.css', generator: 'indexCss' },
  { path: 'src/config/redirects.ts', generator: 'redirects' },
  { path: 'src/pages/Book.tsx', generator: 'bookPage' },
] as const

// ---------------------------------------------------------------------------
// GitHub API helper
// ---------------------------------------------------------------------------

async function ghFetch(path: string, init?: RequestInit): Promise<Response> {
  const pat = process.env.GITHUB_PAT
  if (!pat) throw new Error('GITHUB_PAT environment variable is not set')

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

// ---------------------------------------------------------------------------
// Stage log helpers
// ---------------------------------------------------------------------------

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

export async function runStage2(intakeId: string): Promise<Stage2Result> {
  const stageLogs: StageLogEntry[] = []

  // Load intake + pipeline run
  const intake = await prisma.clientIntake.findUniqueOrThrow({
    where: { id: intakeId },
    include: { pipelineRun: true },
  })

  if (!intake.pipelineRun) {
    throw new Error(`No PipelineRun found for intake ${intakeId}`)
  }

  const payload = intake.payload as unknown as IntakeData
  const repoName = `elm-${intake.slug}`
  const repoFullName = `${ORG}/${repoName}`

  try {
    // ------------------------------------------------------------------
    // Step 1: Fork (generate from) the template repo
    // ------------------------------------------------------------------
    let step = makeLogEntry(2, 'Fork template repo')
    stageLogs.push(step)

    await updatePipelineRun(intakeId, { stageLogs, currentStage: 1 })

    // Diagnostic: verify PAT can access the template repo before attempting generate
    let templateAccessible = false
    try {
      const diagRes = await ghFetch(`/repos/${TEMPLATE_OWNER}/${TEMPLATE_REPO}`)
      const diagData = await diagRes.json()
      console.log(`[pipeline] Template repo check: 200 OK, is_template=${diagData.is_template}, private=${diagData.private}`)
      templateAccessible = true
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[pipeline] Template repo check FAILED:`, msg)
      // Log diagnostic to stageLogs so it's visible in the UI
      stageLogs.push({
        stage: 2,
        name: 'Template repo diagnostic',
        status: 'failed',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        error: `Cannot access template repo: ${msg}`,
      })
      await updatePipelineRun(intakeId, { stageLogs })
    }

    try {
      await ghFetch(`/repos/${TEMPLATE_OWNER}/${TEMPLATE_REPO}/generate`, {
        method: 'POST',
        body: JSON.stringify({
          owner: ORG,
          name: repoName,
          description: `${payload.businessName} — ELM managed site`,
          private: true,
          include_all_branches: false,
        }),
      })
    } catch (err) {
      // 422 = repo already exists, which is fine
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('422')) throw err
    }

    // Poll until repo is queryable
    let repoReady = false
    for (let i = 0; i < 15; i++) {
      try {
        await ghFetch(`/repos/${repoFullName}`)
        repoReady = true
        break
      } catch {
        await sleep(2000)
      }
    }

    if (!repoReady) {
      throw new Error(`Repo ${repoFullName} not ready after 30 seconds`)
    }

    step = completeLogEntry(step, { repo: repoFullName })
    stageLogs[stageLogs.length - 1] = step

    // ------------------------------------------------------------------
    // Step 2: Read template file SHAs
    // ------------------------------------------------------------------
    step = makeLogEntry(2, 'Read template file SHAs')
    stageLogs.push(step)

    const fileShas: Record<string, string | null> = {}

    for (const file of CONFIG_FILES) {
      try {
        const res = await ghFetch(`/repos/${repoFullName}/contents/${file.path}`)
        const data = await res.json()
        fileShas[file.path] = data.sha
      } catch {
        // File doesn't exist in template — will create instead of update
        fileShas[file.path] = null
      }
    }

    step = completeLogEntry(step, { fileShas })
    stageLogs[stageLogs.length - 1] = step

    // ------------------------------------------------------------------
    // Step 3: Generate configured file contents
    // ------------------------------------------------------------------
    step = makeLogEntry(2, 'Generate configured files')
    stageLogs.push(step)

    const fileContents: Record<string, string> = {
      'src/config/site.ts': generateSiteConfig(intake.slug, payload),
      'src/index.css': generateIndexCss(payload),
      'src/config/redirects.ts': generateRedirects(payload),
      'src/pages/Book.tsx': generateBookPage(payload),
    }

    step = completeLogEntry(step)
    stageLogs[stageLogs.length - 1] = step

    // ------------------------------------------------------------------
    // Step 4: Commit files to the repo (sequential to avoid branch race)
    // ------------------------------------------------------------------
    step = makeLogEntry(2, 'Commit configured files')
    stageLogs.push(step)

    const commitResults: Record<string, { sha?: string; error?: string }> = {}

    for (const file of CONFIG_FILES) {
      try {
        const content = Buffer.from(fileContents[file.path]).toString('base64')
        const body: Record<string, unknown> = {
          message: `Stage 2: Configure client site — ${payload.businessName}`,
          content,
        }
        if (fileShas[file.path]) {
          body.sha = fileShas[file.path]
        }

        const res = await ghFetch(`/repos/${repoFullName}/contents/${file.path}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        })
        const data = await res.json()
        commitResults[file.path] = { sha: data.content?.sha }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        commitResults[file.path] = { error: msg }
        console.error(`[pipeline] Failed to commit ${file.path}:`, msg)
      }
    }

    const failedCommits = Object.entries(commitResults).filter(([, r]) => r.error)
    step = completeLogEntry(step, { commits: commitResults })
    stageLogs[stageLogs.length - 1] = step

    // ------------------------------------------------------------------
    // Step 5: Register site in ELM CMS
    // ------------------------------------------------------------------
    step = makeLogEntry(2, 'Register site in CMS')
    stageLogs.push(step)

    let siteApiKey: string | undefined
    let siteId: string | undefined

    try {
      const cmsSiteId = slugify(payload.businessName)
      const apiKey = randomBytes(24).toString('hex')

      // Link manufacturers that exist in the CMS
      const mfrLinks = []
      if (payload.manufacturersCarried?.length) {
        for (const mName of payload.manufacturersCarried) {
          const mfr = await prisma.manufacturer.findFirst({ where: { name: mName } })
          if (mfr) mfrLinks.push({ manufacturerId: mfr.id })
        }
      }

      const site = await prisma.site.create({
        data: {
          id: cmsSiteId,
          name: payload.businessName,
          domain: payload.domain || '',
          webhookUrl: payload.domain ? `https://${payload.domain}/api/revalidate` : null,
          githubRepo: repoFullName,
          apiKey,
          active: true,
          supportedManufacturers: mfrLinks.length ? { create: mfrLinks } : undefined,
        },
      })

      siteApiKey = site.apiKey
      siteId = site.id

      step = completeLogEntry(step, { siteId, apiKey: siteApiKey })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      step = failLogEntry(step, msg)
      console.error('[pipeline] Site registration failed:', msg)
    }

    stageLogs[stageLogs.length - 1] = step

    // ------------------------------------------------------------------
    // Step 6: Update PipelineRun with final result
    // ------------------------------------------------------------------
    const warnings: string[] = []
    if (!payload.primaryPhone) warnings.push('No primary phone number — add manually post-deploy')
    if (failedCommits.length > 0) {
      warnings.push(`${failedCommits.length} file commit(s) failed — check stage logs`)
    }

    await updatePipelineRun(intakeId, {
      currentStage: 2,
      stageLogs: [...stageLogs, ...(warnings.length ? [{
        stage: 2,
        name: 'Warnings',
        status: 'done' as const,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        details: { warnings },
      }] : [])],
      status: failedCommits.length === CONFIG_FILES.length ? 'failed' : 'running',
    })

    return {
      success: true,
      repoUrl: `https://github.com/${repoFullName}`,
      stagingUrl: siteId ? `https://${payload.domain}` : undefined,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`[pipeline] Stage 2 failed for intake ${intakeId}:`, errorMsg)

    const failEntry = failLogEntry(makeLogEntry(2, 'Stage 2'), errorMsg)
    stageLogs.push(failEntry)

    await updatePipelineRun(intakeId, {
      currentStage: 2,
      stageLogs,
      status: 'failed',
    }).catch(e => console.error('[pipeline] Failed to update PipelineRun on error:', e))

    return { success: false, error: errorMsg }
  }
}

// ---------------------------------------------------------------------------
// Prisma helper
// ---------------------------------------------------------------------------

async function updatePipelineRun(
  intakeId: string,
  data: { stageLogs?: StageLogEntry[]; currentStage?: number; status?: string }
) {
  // Prisma's Json type expects InputJsonValue — cast through JSON round-trip
  const update: Record<string, unknown> = {}
  if (data.currentStage !== undefined) update.currentStage = data.currentStage
  if (data.stageLogs) update.stageLogs = JSON.parse(JSON.stringify(data.stageLogs))
  if (data.status) update.status = data.status

  await prisma.pipelineRun.update({
    where: { intakeId },
    data: update,
  })
}
