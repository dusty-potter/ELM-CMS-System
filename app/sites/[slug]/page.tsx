'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Revision = {
  id: string
  requestText: string
  submittedBy: string
  status: string
  resolvedAt: string | null
  createdAt: string
}

type PipelineRun = {
  id: string
  currentStage: number
  stageLogs?: unknown[]
  buildDocument?: string | null
  stagingUrl?: string | null
  mondayItemId?: string | null
  ghlContactId?: string | null
  auditScores?: Record<string, number> | null
  auditFixList?: string | null
  approved: boolean
  clientApproved: boolean
  liveUrl?: string | null
  status: string
  revisions: Revision[]
}

type IntakeDetail = {
  id: string
  slug: string
  payload: Record<string, unknown>
  intakeBy: string
  createdAt: string
  pipelineRun: PipelineRun | null
}

const STATUS_CONFIG: Record<string, { label: string; style: string }> = {
  running:            { label: 'Building',                     style: 'bg-blue-500/20 text-blue-400' },
  awaiting_review:    { label: 'Staged — Awaiting Review',     style: 'bg-yellow-500/20 text-yellow-400' },
  revision_requested: { label: 'Revisions Requested',          style: 'bg-yellow-500/20 text-yellow-400' },
  in_revision:        { label: 'Revisions In Progress',        style: 'bg-blue-500/20 text-blue-400' },
  awaiting_client:    { label: 'Awaiting Client Approval',     style: 'bg-yellow-500/20 text-yellow-400' },
  approved:           { label: 'Approved — Ready for Launch',  style: 'bg-emerald-500/20 text-emerald-400' },
  live:               { label: 'Live',                         style: 'bg-emerald-500/20 text-emerald-400' },
  on_hold:            { label: 'On Hold',                      style: 'bg-zinc-800 text-zinc-500' },
  failed:             { label: 'Contact Dusty',                style: 'bg-red-500/20 text-red-400' },
}

const REVISION_STATUS_STYLES: Record<string, string> = {
  pending:     'bg-yellow-500/20 text-yellow-400',
  in_progress: 'bg-blue-500/20 text-blue-400',
  resolved:    'bg-emerald-500/20 text-emerald-400',
}

function SummaryField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <span className="text-xs font-bold text-zinc-500 uppercase">{label}</span>
      <p className="text-sm text-zinc-300 mt-0.5 whitespace-pre-wrap">{value}</p>
    </div>
  )
}

function SummaryList({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div>
      <span className="text-xs font-bold text-zinc-500 uppercase">{label}</span>
      <div className="flex flex-wrap gap-1 mt-1">
        {items.map((item) => (
          <span key={item} className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-300">{item}</span>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SiteDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'
  const [intake, setIntake] = useState<IntakeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revisionText, setRevisionText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/sites/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setIntake(data)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [slug])

  async function submitRevision() {
    if (!revisionText.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/sites/${slug}/revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestText: revisionText }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setRevisionText('')
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit revision')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleClientApprove() {
    await fetch(`/api/sites/${slug}/client-approve`, { method: 'PATCH' })
    window.location.reload()
  }

  async function resolveRevision(revisionId: string) {
    // Admin resolves a revision by updating its status directly
    // For now, use a simple fetch to a hypothetical endpoint or inline update
    // Since we don't have a dedicated resolve endpoint, we patch the revision directly
    // This is admin-only UI, so safe to call prisma-backed endpoint
    await fetch(`/api/sites/${slug}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_revision' }),
    })
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-zinc-700 border-t-brand-blue rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !intake) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
          {error ?? 'Intake not found'}
        </div>
      </div>
    )
  }

  const payload = intake.payload as Record<string, unknown>
  const run = intake.pipelineRun
  const status = run?.status ?? 'unknown'
  const config = STATUS_CONFIG[status] ?? { label: status, style: 'bg-zinc-800 text-zinc-500' }
  const showRevisionForm = run && (status === 'awaiting_review' || status === 'revision_requested')
  const showClientApprove = run && status === 'awaiting_client'

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div>
        <Link href="/sites" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Back to Projects
        </Link>
        <h1 className="text-2xl font-bold text-white mt-2">
          {(payload.businessName as string) || intake.slug}
        </h1>
        <div className="flex items-center gap-3 mt-2">
          <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${config.style}`}>
            {config.label}
          </span>
          {typeof payload.domain === 'string' && payload.domain && (
            <span className="text-sm text-zinc-500">{payload.domain}</span>
          )}
        </div>
      </div>

      {/* Staging URL */}
      {run?.stagingUrl && (
        <a
          href={run.stagingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm text-brand-blue hover:underline"
        >
          Staging: {run.stagingUrl}
        </a>
      )}

      {/* Client Approve button */}
      {showClientApprove && (
        <button
          onClick={handleClientApprove}
          className="w-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold py-3 px-6 rounded-xl hover:bg-emerald-500/30 transition-colors"
        >
          Mark Client Approved
        </button>
      )}

      {/* Admin pipeline details */}
      {isAdmin && run && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white">Pipeline Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-zinc-500 block">Stage</span>
              <span className="text-white font-bold text-lg">{run.currentStage}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Approved</span>
              <span className={run.approved ? 'text-emerald-400' : 'text-zinc-500'}>{run.approved ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Client Approved</span>
              <span className={run.clientApproved ? 'text-emerald-400' : 'text-zinc-500'}>{run.clientApproved ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Status</span>
              <span className="text-white">{config.label}</span>
            </div>
          </div>

          {run.buildDocument && (
            <SummaryField label="Build Document" value={run.buildDocument} />
          )}

          {run.auditScores && typeof run.auditScores === 'object' && (
            <div>
              <span className="text-xs font-bold text-zinc-500 uppercase">Audit Scores</span>
              <div className="flex gap-3 mt-1">
                {Object.entries(run.auditScores).map(([key, val]) => (
                  <div key={key} className="bg-zinc-800 rounded-lg px-3 py-2 text-center">
                    <div className="text-lg font-bold text-white">{String(val)}</div>
                    <div className="text-[10px] text-zinc-500 uppercase">{key}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {run.auditFixList && <SummaryField label="Audit Fix List" value={run.auditFixList} />}

          {run.mondayItemId && <SummaryField label="Monday Item" value={run.mondayItemId} />}
          {run.ghlContactId && <SummaryField label="GHL Contact" value={run.ghlContactId} />}

          {/* Stage logs timeline */}
          {run.stageLogs && Array.isArray(run.stageLogs) && run.stageLogs.length > 0 && (
            <div>
              <span className="text-xs font-bold text-zinc-500 uppercase">Stage Logs</span>
              <div className="mt-2 space-y-2">
                {(run.stageLogs as Array<Record<string, unknown>>).map((log, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      log.status === 'done' ? 'bg-emerald-500/20 text-emerald-400' :
                      log.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {log.status === 'done' ? '\u2713' : log.status === 'failed' ? '\u2717' : '\u2022'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">{String(log.name ?? `Stage ${log.stage}`)}</span>
                        {typeof log.completedAt === 'string' && (
                          <span className="text-zinc-600">{new Date(log.completedAt).toLocaleString()}</span>
                        )}
                      </div>
                      {typeof log.error === 'string' ? <p className="text-red-400 mt-0.5">{log.error}</p> : null}
                      {log.details && typeof log.details === 'object' ? (
                        <pre className="text-zinc-500 mt-0.5 text-[10px] overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Intake Summary */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-white">Intake Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SummaryField label="Business Name" value={payload.businessName as string} />
          <SummaryField label="Domain" value={payload.domain as string} />
          <SummaryField label="Practice Type" value={payload.practiceType as string} />
          <SummaryField label="Main Phone" value={payload.primaryPhone as string} />
          <SummaryField label="Service Area" value={payload.serviceArea as string} />
          <SummaryField label="Credentials" value={payload.credentials as string} />
        </div>
        <SummaryField label="Primary Services" value={payload.primaryServices as string} />

        {Array.isArray(payload.locations) && (payload.locations as Array<Record<string, string>>).length > 0 && (
          <div>
            <span className="text-xs font-bold text-zinc-500 uppercase">Locations</span>
            <div className="mt-1 space-y-1">
              {(payload.locations as Array<Record<string, string>>).map((loc, i) => (
                <p key={i} className="text-sm text-zinc-300">
                  {loc.name}{loc.phone ? ` — ${loc.phone}` : ''}{loc.city ? `, ${loc.city}` : ''}{loc.state ? ` ${loc.state}` : ''}
                </p>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(payload.teamMembers) && (payload.teamMembers as Array<Record<string, string>>).length > 0 && (
          <div>
            <span className="text-xs font-bold text-zinc-500 uppercase">Team Members</span>
            <div className="mt-1 space-y-1">
              {(payload.teamMembers as Array<Record<string, string>>).map((m, i) => (
                <p key={i} className="text-sm text-zinc-300">
                  {m.name}{m.title ? ` — ${m.title}` : ''}{m.credentials ? ` (${m.credentials})` : ''}
                </p>
              ))}
            </div>
          </div>
        )}

        <SummaryList label="Manufacturers Carried" items={(payload.manufacturersCarried as string[]) ?? []} />
        <SummaryList label="Featured Manufacturers" items={(payload.featuredManufacturers as string[]) ?? []} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SummaryField label="Phone Reliability" value={payload.phoneReliability as string} />
          <SummaryField label="Scheduling Method" value={payload.schedulingMethod as string} />
        </div>

        <SummaryField label="Existing URL" value={payload.existingUrl as string} />
        <SummaryField label="Primary Brand Color" value={payload.primaryBrandColor as string} />
        <SummaryList label="Brand Tone" items={(payload.brandTone as string[]) ?? []} />
        <SummaryField label="Style Notes" value={payload.styleNotes as string} />

        {Array.isArray(payload.clientOverrides) && (payload.clientOverrides as string[]).length > 0 && (
          <SummaryList label="Client Overrides" items={payload.clientOverrides as string[]} />
        )}
        <SummaryField label="Sensitivities" value={payload.sensitivities as string} />
        <SummaryField label="Required Elements" value={payload.requiredElements as string} />
      </div>

      {/* Revisions */}
      {run && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-white">Revision History</h2>

          {run.revisions.length === 0 ? (
            <p className="text-sm text-zinc-600 italic">No revision requests yet.</p>
          ) : (
            <div className="space-y-3">
              {run.revisions.map((rev) => (
                <div key={rev.id} className="bg-zinc-800 rounded-xl px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${REVISION_STATUS_STYLES[rev.status] ?? 'bg-zinc-700 text-zinc-400'}`}>
                        {rev.status}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {new Date(rev.createdAt).toLocaleDateString()} by {rev.submittedBy}
                      </span>
                    </div>
                    {isAdmin && rev.status === 'pending' && (
                      <button
                        onClick={() => resolveRevision(rev.id)}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-zinc-300">{rev.requestText}</p>
                </div>
              ))}
            </div>
          )}

          {/* Revision form */}
          {showRevisionForm && (
            <div className="space-y-3 pt-3 border-t border-zinc-700">
              <label className="block text-xs font-bold text-zinc-500 uppercase">
                Submit Revision Request
              </label>
              <textarea
                value={revisionText}
                onChange={(e) => setRevisionText(e.target.value)}
                placeholder="Describe the changes needed..."
                rows={4}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors resize-y"
              />
              <button
                onClick={submitRevision}
                disabled={submitting || !revisionText.trim()}
                className="bg-brand-blue hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2 px-6 rounded-xl transition-colors text-sm"
              >
                {submitting ? 'Submitting...' : 'Submit Revision'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
