'use client'

import { useEffect, useState } from 'react'
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
  createdAt: string
  updatedAt: string
  revisions: Revision[]
}

type ClientIntake = {
  id: string
  slug: string
  payload: Record<string, unknown>
  intakeBy: string
  createdAt: string
  pipelineRun: PipelineRun | null
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

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

const ALL_STATUSES = Object.keys(STATUS_CONFIG)

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// ---------------------------------------------------------------------------
// Project Card
// ---------------------------------------------------------------------------

function ProjectCard({
  intake,
  isAdmin,
  onStatusChange,
  onClientApprove,
}: {
  intake: ClientIntake
  isAdmin: boolean
  onStatusChange: (slug: string, status: string) => void
  onClientApprove: (slug: string) => void
}) {
  const payload = intake.payload as Record<string, unknown>
  const run = intake.pipelineRun
  const status = run?.status ?? 'unknown'
  const config = STATUS_CONFIG[status] ?? { label: status, style: 'bg-zinc-800 text-zinc-500' }

  return (
    <div className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-6 space-y-4 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/sites/${intake.slug}`} className="block">
            <h3 className="font-bold text-white truncate hover:text-brand-blue transition-colors">
              {(payload.businessName as string) || intake.slug}
            </h3>
          </Link>
          <p className="text-xs text-zinc-500 truncate">{(payload.domain as string) || ''}</p>
        </div>
        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded whitespace-nowrap ${config.style}`}>
          {config.label}
        </span>
      </div>

      {/* Staging URL */}
      {run?.stagingUrl && (
        <a
          href={run.stagingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-blue hover:underline truncate block"
        >
          {run.stagingUrl}
        </a>
      )}

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-zinc-600">
        <span>{timeAgo(intake.createdAt)}</span>
        <span>by {intake.intakeBy}</span>
      </div>

      {/* Admin extras */}
      {isAdmin && run && (
        <div className="space-y-2 pt-2 border-t border-zinc-800">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-zinc-500">Stage {run.currentStage}</span>
            {run.approved && <span className="text-emerald-400">Approved</span>}
            {run.clientApproved && <span className="text-emerald-400">Client Approved</span>}
          </div>

          {run.auditScores && typeof run.auditScores === 'object' && (
            <div className="flex gap-2">
              {Object.entries(run.auditScores).map(([key, val]) => (
                <span key={key} className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                  {key}: {String(val)}
                </span>
              ))}
            </div>
          )}

          {(intake.pipelineRun as PipelineRun & { stageLogs?: unknown[] })?.stageLogs && (
            <p className="text-[10px] text-zinc-600">
              {((intake.pipelineRun as PipelineRun & { stageLogs?: unknown[] }).stageLogs as unknown[])?.length ?? 0} stage log entries
            </p>
          )}

          {run.mondayItemId && (
            <a href={`https://monday.com`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-brand-blue hover:underline">
              Monday: {run.mondayItemId}
            </a>
          )}

          {/* Status override */}
          <div className="flex items-center gap-2 pt-1">
            <select
              defaultValue={run.status}
              onChange={(e) => onStatusChange(intake.slug, e.target.value)}
              className="text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-zinc-300 focus:border-brand-blue outline-none"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>

          {!run.approved && (
            <button
              onClick={() => {
                fetch(`/api/sites/${intake.slug}/approve`, { method: 'PATCH' })
                  .then(() => window.location.reload())
              }}
              className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-lg hover:bg-emerald-500/30 transition-colors"
            >
              Approve for Go-Live
            </button>
          )}
        </div>
      )}

      {/* Operator action buttons */}
      {!isAdmin && run && (
        <div className="pt-2">
          {status === 'awaiting_review' && (
            <Link
              href={`/sites/${intake.slug}`}
              className="inline-block text-sm bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-4 py-2 rounded-xl hover:bg-yellow-500/30 transition-colors font-semibold"
            >
              Submit Revision Request
            </Link>
          )}
          {status === 'awaiting_client' && (
            <button
              onClick={() => onClientApprove(intake.slug)}
              className="text-sm bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl hover:bg-emerald-500/30 transition-colors font-semibold"
            >
              Mark Client Approved
            </button>
          )}
          {status === 'live' && run.liveUrl && (
            <a
              href={run.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl hover:bg-emerald-500/30 transition-colors font-semibold"
            >
              View Site
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Past Intakes Tab
// ---------------------------------------------------------------------------

function PastIntakesTab({ intakes }: { intakes: ClientIntake[] }) {
  return (
    <div className="space-y-3">
      {intakes.length === 0 ? (
        <div className="text-center py-20 text-zinc-600">No intake records yet.</div>
      ) : (
        intakes.map((intake) => {
          const payload = intake.payload as Record<string, unknown>
          const hasPipeline = !!intake.pipelineRun
          return (
            <div
              key={intake.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white text-sm truncate">
                    {(payload.businessName as string) || intake.slug}
                  </h3>
                  <span
                    className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      hasPipeline
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {hasPipeline ? 'Pipeline Launched' : 'Not Launched'}
                  </span>
                  {hasPipeline && intake.pipelineRun && (
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        STATUS_CONFIG[intake.pipelineRun.status]?.style ?? 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {STATUS_CONFIG[intake.pipelineRun.status]?.label ?? intake.pipelineRun.status}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {(payload.domain as string) || ''} — {timeAgo(intake.createdAt)}
                </p>
              </div>
              <Link
                href={`/intake?resume=${intake.slug}`}
                className="shrink-0 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors font-semibold"
              >
                Resume
              </Link>
            </div>
          )
        })
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SitesPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'
  const [intakes, setIntakes] = useState<ClientIntake[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'active' | 'history'>('active')

  useEffect(() => {
    fetch('/api/sites')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setIntakes(data)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function handleStatusChange(slug: string, status: string) {
    fetch(`/api/sites/${slug}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).then(() => window.location.reload())
  }

  function handleClientApprove(slug: string) {
    fetch(`/api/sites/${slug}/client-approve`, { method: 'PATCH' })
      .then(() => window.location.reload())
  }

  const activeIntakes = intakes.filter((i) => i.pipelineRun && i.pipelineRun.status !== 'failed')
  const allIntakes = intakes

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Client Projects</h1>
        <p className="text-zinc-500 text-sm mt-0.5">
          {isAdmin ? 'All client site projects with pipeline details.' : 'Track client site build progress.'}
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800 pb-px">
        <button
          onClick={() => setTab('active')}
          className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
            tab === 'active'
              ? 'text-white border-b-2 border-brand-blue'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Active Projects
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
            tab === 'history'
              ? 'text-white border-b-2 border-brand-blue'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Past Intakes
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-zinc-700 border-t-brand-blue rounded-full animate-spin" />
        </div>
      ) : tab === 'active' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {activeIntakes.length === 0 ? (
            <div className="md:col-span-2 text-center py-20 text-zinc-600">
              No active projects. Launch an intake to get started.
            </div>
          ) : (
            activeIntakes.map((intake) => (
              <ProjectCard
                key={intake.id}
                intake={intake}
                isAdmin={isAdmin}
                onStatusChange={handleStatusChange}
                onClientApprove={handleClientApprove}
              />
            ))
          )}
        </div>
      ) : (
        <PastIntakesTab intakes={allIntakes} />
      )}
    </div>
  )
}
