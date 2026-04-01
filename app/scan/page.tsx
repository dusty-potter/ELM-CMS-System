'use client'

import { useState } from 'react'
import Link from 'next/link'

const MANUFACTURERS = [
  'Phonak', 'Oticon', 'Starkey', 'ReSound', 'Widex',
  'Signia', 'Unitron', 'Philips', 'Bernafon', 'Hansaton',
]

const TIER_STYLES: Record<string, string> = {
  premium:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  advanced:  'bg-blue-500/20   text-blue-400   border-blue-500/30',
  standard:  'bg-zinc-700      text-zinc-300   border-zinc-600',
  essential: 'bg-zinc-800      text-zinc-400   border-zinc-700',
}

const TIER_ORDER: Record<string, number> = {
  premium: 0, advanced: 1, standard: 2, essential: 3,
}

type ResearchStatus = 'idle' | 'loading' | 'done' | 'error'

type ScannedProduct = {
  name: string
  displayName: string | null
  platform: string | null
  tier: 'premium' | 'advanced' | 'standard' | 'essential' | null
  releaseYear: number | null
  formFactorStyles: string[]
  active: boolean
  researchStatus: ResearchStatus
}

// ── Toggle switch ──────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      aria-pressed={checked}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-emerald-500' : 'bg-zinc-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

// ── Status pill ────────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: ResearchStatus }) {
  const styles: Record<ResearchStatus, string> = {
    idle:    'bg-zinc-800 text-zinc-500',
    loading: 'bg-brand-blue/20 text-blue-400 animate-pulse',
    done:    'bg-emerald-500/20 text-emerald-400',
    error:   'bg-red-500/20 text-red-400',
  }
  const labels: Record<ResearchStatus, string> = {
    idle:    'Not researched',
    loading: 'Researching…',
    done:    'Researched',
    error:   'Error',
  }
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ScanPage() {
  const [step, setStep] = useState<'input' | 'loading' | 'results'>('input')
  const [manufacturer, setManufacturer] = useState('')
  const [products, setProducts] = useState<ScannedProduct[]>([])
  const [error, setError] = useState<string | null>(null)
  const [bulkResearching, setBulkResearching] = useState(false)

  // ── Scan ──

  async function handleScan() {
    if (!manufacturer) return
    setStep('loading')
    setError(null)

    try {
      const res = await fetch('/api/ingest/enumerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manufacturer }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scan failed')

      const scanned: ScannedProduct[] = (data.products ?? []).map((p: Omit<ScannedProduct, 'active' | 'researchStatus'>) => ({
        ...p,
        active: true,
        researchStatus: 'idle' as ResearchStatus,
      }))

      setProducts(scanned)
      setStep('results')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setStep('input')
    }
  }

  // ── Per-product toggle ──

  function toggleActive(name: string) {
    setProducts((prev) =>
      prev.map((p) => p.name === name ? { ...p, active: !p.active } : p)
    )
  }

  // ── Bulk toggles ──

  function activateAll()   { setProducts((prev) => prev.map((p) => ({ ...p, active: true }))) }
  function deactivateAll() { setProducts((prev) => prev.map((p) => ({ ...p, active: false }))) }

  // ── Research individual product ──

  async function researchProduct(name: string) {
    setProducts((prev) =>
      prev.map((p) => p.name === name ? { ...p, researchStatus: 'loading' } : p)
    )
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manufacturer, modelName: name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Research failed')
      setProducts((prev) =>
        prev.map((p) => p.name === name ? { ...p, researchStatus: 'done' } : p)
      )
    } catch {
      setProducts((prev) =>
        prev.map((p) => p.name === name ? { ...p, researchStatus: 'error' } : p)
      )
    }
  }

  // ── Bulk research active products sequentially ──

  async function handleResearchActive() {
    setBulkResearching(true)
    const targets = products.filter((p) => p.active && p.researchStatus === 'idle')
    for (const product of targets) {
      await researchProduct(product.name)
    }
    setBulkResearching(false)
  }

  // ── Derived counts ──

  const activeCount   = products.filter((p) => p.active).length
  const inactiveCount = products.length - activeCount
  const researchableCount = products.filter((p) => p.active && p.researchStatus === 'idle').length

  // ── Group by platform ──

  const platforms = Array.from(
    new Map(
      products.map((p) => [p.platform ?? '(No Platform)', p.platform ?? '(No Platform)'])
    ).keys()
  )

  // ── Input step ──

  if (step === 'input') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8">
          <div>
            <Link href="/" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
              ← Back
            </Link>
            <h1 className="text-3xl font-bold text-white mt-4">Scan Manufacturer Lineup</h1>
            <p className="mt-2 text-zinc-400 text-sm">
              Select a manufacturer and the AI will enumerate their full current product lineup.
              You can then toggle which products are active and research each one.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Manufacturer</label>
              <select
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-brand-blue outline-none transition-colors"
              >
                <option value="">Select manufacturer…</option>
                {MANUFACTURERS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleScan}
              disabled={!manufacturer}
              className="w-full bg-brand-blue hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Scan Lineup
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Loading step ──

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6">
        <div className="w-10 h-10 border-4 border-zinc-700 border-t-brand-blue rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-white font-semibold">Scanning {manufacturer} lineup…</p>
          <p className="text-zinc-500 text-sm mt-1">Enumerating all current products.</p>
        </div>
      </div>
    )
  }

  // ── Results step ──

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-white mt-2">{manufacturer} Lineup</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {products.length} products found
          </p>
        </div>
        <button
          onClick={() => { setStep('input'); setProducts([]) }}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          Scan Another
        </button>
      </div>

      {/* Summary bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="text-sm">
            <span className="text-emerald-400 font-bold">{activeCount}</span>
            <span className="text-zinc-500 ml-1">active</span>
          </div>
          <div className="text-sm">
            <span className="text-zinc-400 font-bold">{inactiveCount}</span>
            <span className="text-zinc-500 ml-1">inactive</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={activateAll}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            Activate All
          </button>
          <button
            onClick={deactivateAll}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            Deactivate All
          </button>
          <button
            onClick={handleResearchActive}
            disabled={bulkResearching || researchableCount === 0}
            className="text-xs bg-brand-blue hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-4 py-1.5 rounded-lg transition-colors"
          >
            {bulkResearching
              ? 'Researching…'
              : `Research Active (${researchableCount})`}
          </button>
        </div>
      </div>

      {/* Product table grouped by platform */}
      <div className="space-y-6">
        {platforms.map((platformName) => {
          const platformProducts = products
            .filter((p) => (p.platform ?? '(No Platform)') === platformName)
            .sort((a, b) => (TIER_ORDER[a.tier ?? ''] ?? 9) - (TIER_ORDER[b.tier ?? ''] ?? 9))

          return (
            <div key={platformName} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              {/* Platform header */}
              <div className="px-5 py-3 bg-zinc-800/60 border-b border-zinc-800 flex items-center gap-3">
                <span className="text-sm font-bold text-white">{platformName}</span>
                <span className="text-xs text-zinc-500">{platformProducts.length} products</span>
              </div>

              {/* Product rows */}
              <div className="divide-y divide-zinc-800">
                {platformProducts.map((product) => (
                  <div
                    key={product.name}
                    className={`px-5 py-4 flex items-center gap-4 transition-colors ${
                      product.active ? '' : 'opacity-50'
                    }`}
                  >
                    {/* Active toggle — most prominent element */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <Toggle
                        checked={product.active}
                        onChange={() => toggleActive(product.name)}
                      />
                      <span className={`text-[9px] font-bold uppercase ${product.active ? 'text-emerald-400' : 'text-zinc-600'}`}>
                        {product.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm">{product.name}</span>
                        {product.tier && (
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${TIER_STYLES[product.tier] ?? ''}`}>
                            {product.tier}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {product.displayName && (
                          <span className="text-xs text-zinc-500">{product.displayName}</span>
                        )}
                        {product.formFactorStyles?.length > 0 && (
                          <span className="text-xs text-zinc-600">{product.formFactorStyles.join(' · ')}</span>
                        )}
                        {product.releaseYear && (
                          <span className="text-xs text-zinc-600">{product.releaseYear}</span>
                        )}
                      </div>
                    </div>

                    {/* Research status + action */}
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusPill status={product.researchStatus} />
                      {product.researchStatus === 'idle' && (
                        <button
                          onClick={() => researchProduct(product.name)}
                          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Research
                        </button>
                      )}
                      {product.researchStatus === 'done' && (
                        <Link
                          href={`/ingest?manufacturer=${encodeURIComponent(manufacturer)}&model=${encodeURIComponent(product.name)}`}
                          className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          View
                        </Link>
                      )}
                      {product.researchStatus === 'error' && (
                        <button
                          onClick={() => researchProduct(product.name)}
                          className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer action */}
      <div className="flex gap-3 pt-2 pb-8">
        <button
          disabled
          title="Save to CMS requires database setup"
          className="flex-1 bg-brand-blue/40 text-blue-300 font-semibold py-3 rounded-xl cursor-not-allowed opacity-60"
        >
          Push Active to CMS (coming soon)
        </button>
      </div>

    </div>
  )
}
