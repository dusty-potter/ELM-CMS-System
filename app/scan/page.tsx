'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ImageApproval, type CandidateImage } from '../components/ImageApproval'

const MANUFACTURERS = [
  'Phonak', 'Oticon', 'Starkey', 'ReSound', 'Widex',
  'Signia', 'Unitron', 'Audibel', 'Beltone', 'Lenire',
]

const CUSTOM = '__custom__'

const TIER_STYLES: Record<string, string> = {
  premium:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  advanced:  'bg-blue-500/20   text-blue-400   border-blue-500/30',
  standard:  'bg-zinc-700      text-zinc-300   border-zinc-600',
  essential: 'bg-zinc-800      text-zinc-400   border-zinc-700',
}

const STYLE_COLORS: Record<string, string> = {
  RIC:     'bg-blue-500/10 text-blue-400',
  BTE:     'bg-purple-500/10 text-purple-400',
  ITE:     'bg-orange-500/10 text-orange-400',
  CIC:     'bg-emerald-500/10 text-emerald-400',
  IIC:     'bg-emerald-500/10 text-emerald-400',
  miniRITE:'bg-blue-500/10 text-blue-400',
  slimRIC: 'bg-indigo-500/10 text-indigo-400',
  other:   'bg-zinc-700 text-zinc-400',
}

type ResearchStatus = 'idle' | 'loading' | 'done' | 'error'
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
type ImageStatus = 'idle' | 'storing' | 'stored' | 'error'

type EnumTier = { id: string; label: string; tier: string }
type EnumFormFactor = { name: string; style: string; availableTiers: string[]; notes?: string | null }
type EnumFittingOption = { name: string; description: string; styles: string[] }

type ScannedPlatform = {
  name: string
  displayName: string
  generationYear: number | null
  isLegacy: boolean
  tiers: EnumTier[]
  formFactors: EnumFormFactor[]
  fittingOptions: EnumFittingOption[]
  active: boolean
  researchStatus: ResearchStatus
  researchedData: Record<string, unknown> | null
  saveStatus: SaveStatus
  imageStatus: ImageStatus
  savedPlatformId: string | null
  savedProductIds: string[]
  savedFormFactorIds: string[]
  candidateImages: CandidateImage[]
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

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ScanPage() {
  const [step, setStep] = useState<'input' | 'loading' | 'results'>('input')
  const [manufacturerSelect, setManufacturerSelect] = useState('')
  const [customName, setCustomName] = useState('')
  const [customUrl, setCustomUrl] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [platforms, setPlatforms] = useState<ScannedPlatform[]>([])
  const [error, setError] = useState<string | null>(null)
  const [bulkResearching, setBulkResearching] = useState(false)

  const isCustom = manufacturerSelect === CUSTOM
  const resolvedManufacturer = isCustom ? customName.trim() : manufacturerSelect
  const canScan = isCustom ? !!customName.trim() : !!manufacturerSelect

  // ── Helpers to update a specific platform ──

  function updatePlatform(name: string, update: Partial<ScannedPlatform>) {
    setPlatforms(prev => prev.map(p => p.name === name ? { ...p, ...update } : p))
  }

  // ── Scan ──

  async function handleScan() {
    if (!canScan) return
    const mfr = resolvedManufacturer
    setManufacturer(mfr)
    setStep('loading')
    setError(null)

    try {
      const res = await fetch('/api/ingest/enumerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manufacturer: mfr,
          url: isCustom && customUrl.trim() ? customUrl.trim() : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scan failed')

      const scanned: ScannedPlatform[] = (data.platforms ?? []).map((p: Record<string, unknown>) => ({
        name: (p.name as string) ?? 'Unknown',
        displayName: (p.displayName as string) ?? '',
        generationYear: (p.generationYear as number) ?? null,
        isLegacy: (p.isLegacy as boolean) ?? false,
        tiers: (p.tiers as EnumTier[]) ?? [],
        formFactors: (p.formFactors as EnumFormFactor[]) ?? [],
        fittingOptions: (p.fittingOptions as EnumFittingOption[]) ?? [],
        active: !(p.isLegacy as boolean),
        researchStatus: 'idle' as ResearchStatus,
        researchedData: null,
        saveStatus: 'idle' as SaveStatus,
        imageStatus: 'idle' as ImageStatus,
        savedPlatformId: null,
        savedProductIds: [],
        savedFormFactorIds: [],
        candidateImages: [],
      }))

      setPlatforms(scanned)
      setStep('results')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setStep('input')
    }
  }

  // ── Research a platform ──

  async function researchPlatform(name: string) {
    const platform = platforms.find(p => p.name === name)
    if (!platform) return

    updatePlatform(name, { researchStatus: 'loading' })

    try {
      const res = await fetch('/api/ingest/platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manufacturer,
          platform: {
            name: platform.name,
            tiers: platform.tiers,
            formFactors: platform.formFactors,
            fittingOptions: platform.fittingOptions,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Research failed')

      // Extract candidate images from research
      const imageUrls = (data.research?.imageUrls as Array<{
        url: string; type: string; description?: string; formFactorName?: string
      }>) ?? []

      const candidates: CandidateImage[] = imageUrls.map(img => ({
        url: img.url,
        type: (img.type === 'hero' ? 'hero' : 'gallery') as 'hero' | 'gallery',
        description: img.description,
        formFactorName: img.formFactorName ?? undefined,
        status: 'pending' as const,
      }))

      updatePlatform(name, {
        researchStatus: 'done',
        researchedData: data.research,
        candidateImages: candidates,
      })
    } catch {
      updatePlatform(name, { researchStatus: 'error' })
    }
  }

  // ── Save a platform ──

  async function savePlatform(name: string) {
    const platform = platforms.find(p => p.name === name)
    if (!platform?.researchedData) return

    updatePlatform(name, { saveStatus: 'saving' })

    try {
      const res = await fetch('/api/cms/save-platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manufacturer,
          platform: {
            name: platform.name,
            displayName: platform.displayName,
            generationYear: platform.generationYear,
            isLegacy: platform.isLegacy,
            tiers: platform.tiers,
            formFactors: platform.formFactors,
            fittingOptions: platform.fittingOptions,
          },
          research: platform.researchedData,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')

      updatePlatform(name, {
        saveStatus: 'saved',
        savedPlatformId: data.platformId,
        savedProductIds: data.productIds ?? [],
        savedFormFactorIds: data.formFactorIds ?? [],
      })
    } catch {
      updatePlatform(name, { saveStatus: 'error' })
    }
  }

  // ── Store approved images ──

  async function storeImages(name: string) {
    const platform = platforms.find(p => p.name === name)
    if (!platform || !platform.savedFormFactorIds.length) return

    const approved = platform.candidateImages.filter(i => i.status === 'approved')
    if (approved.length === 0) return

    updatePlatform(name, { imageStatus: 'storing' })

    try {
      // Store images on the first form factor (primary) for now
      // TODO: match by formFactorName when multi-FF image storage is implemented
      const formFactorId = platform.savedFormFactorIds[0]
      const res = await fetch('/api/cms/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formFactorId,
          images: approved.map(i => ({
            url: i.url,
            type: i.type,
            description: i.description,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Image storage failed')

      updatePlatform(name, { imageStatus: 'stored' })
    } catch {
      updatePlatform(name, { imageStatus: 'error' })
    }
  }

  // ── Bulk actions ──

  async function handleResearchActive() {
    setBulkResearching(true)
    const targets = platforms.filter(p => p.active && p.researchStatus === 'idle')
    for (const p of targets) {
      await researchPlatform(p.name)
    }
    setBulkResearching(false)
  }

  async function handleSaveActive() {
    const targets = platforms.filter(p => p.active && p.researchStatus === 'done' && p.saveStatus === 'idle')
    for (const p of targets) {
      await savePlatform(p.name)
    }
  }

  // ── Derived counts ──

  const activeCount = platforms.filter(p => p.active).length
  const inactiveCount = platforms.length - activeCount
  const researchableCount = platforms.filter(p => p.active && p.researchStatus === 'idle').length
  const savableCount = platforms.filter(p => p.active && p.researchStatus === 'done' && p.saveStatus === 'idle').length
  const savedCount = platforms.filter(p => p.saveStatus === 'saved').length

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
              Select a manufacturer and the AI will enumerate their product platforms,
              technology tiers, form factors, and fitting options.
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
                value={manufacturerSelect}
                onChange={(e) => setManufacturerSelect(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-brand-blue outline-none transition-colors"
              >
                <option value="">Select manufacturer…</option>
                {MANUFACTURERS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
                <option value={CUSTOM}>Custom / Other…</option>
              </select>
            </div>

            {isCustom && (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Manufacturer / Brand Name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Amplifon, Costco Kirkland"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-brand-blue outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    Product Listing URL <span className="text-zinc-600 font-normal">(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://example.com/hearing-aids"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-brand-blue outline-none transition-colors"
                  />
                </div>
              </>
            )}

            <button
              onClick={handleScan}
              disabled={!canScan}
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
          <p className="text-zinc-500 text-sm mt-1">Identifying platforms, tiers, and form factors.</p>
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
          <h1 className="text-2xl font-bold text-white mt-2">{manufacturer} Platforms</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            {platforms.length} platform{platforms.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <button
          onClick={() => { setStep('input'); setPlatforms([]) }}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          Scan Another
        </button>
      </div>

      {/* Summary bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-4 flex-1 flex-wrap">
          <div className="text-sm">
            <span className="text-emerald-400 font-bold">{activeCount}</span>
            <span className="text-zinc-500 ml-1">active</span>
          </div>
          <div className="text-sm">
            <span className="text-zinc-400 font-bold">{inactiveCount}</span>
            <span className="text-zinc-500 ml-1">inactive</span>
          </div>
          {savedCount > 0 && (
            <div className="text-sm">
              <span className="text-emerald-400 font-bold">{savedCount}</span>
              <span className="text-zinc-500 ml-1">saved to CMS</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleResearchActive}
            disabled={bulkResearching || researchableCount === 0}
            className="text-xs bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-4 py-1.5 rounded-lg transition-colors"
          >
            {bulkResearching ? 'Researching…' : `Research Active (${researchableCount})`}
          </button>
          <button
            onClick={handleSaveActive}
            disabled={savableCount === 0}
            className="text-xs bg-brand-blue hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-4 py-1.5 rounded-lg transition-colors"
          >
            Save to CMS ({savableCount})
          </button>
        </div>
      </div>

      {/* Platform cards */}
      <div className="space-y-6">
        {platforms.map((platform) => (
          <div
            key={platform.name}
            className={`bg-zinc-900 border rounded-2xl overflow-hidden transition-all ${
              platform.isLegacy
                ? 'border-zinc-800 opacity-60'
                : platform.active
                ? 'border-zinc-800'
                : 'border-zinc-800 opacity-50'
            }`}
          >
            {/* Platform header */}
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-4">
              <Toggle checked={platform.active} onChange={() => updatePlatform(platform.name, { active: !platform.active })} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg font-bold text-white">{platform.name}</span>
                  {platform.isLegacy && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-700 text-zinc-400 border border-zinc-600">
                      Legacy
                    </span>
                  )}
                  {platform.generationYear && (
                    <span className="text-xs text-zinc-600">{platform.generationYear}</span>
                  )}
                </div>
                {platform.displayName && (
                  <p className="text-xs text-zinc-500 mt-0.5">{platform.displayName}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                {/* Research status */}
                {platform.researchStatus === 'idle' && (
                  <button
                    onClick={() => researchPlatform(platform.name)}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Research
                  </button>
                )}
                {platform.researchStatus === 'loading' && (
                  <span className="text-xs text-blue-400 animate-pulse px-2">Researching…</span>
                )}
                {platform.researchStatus === 'error' && (
                  <button
                    onClick={() => researchPlatform(platform.name)}
                    className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                )}
                {platform.researchStatus === 'done' && (
                  <>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase">Researched</span>
                    {platform.saveStatus === 'idle' && (
                      <button
                        onClick={() => savePlatform(platform.name)}
                        className="text-xs bg-brand-blue hover:bg-blue-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Save to CMS
                      </button>
                    )}
                    {platform.saveStatus === 'saving' && (
                      <span className="text-xs text-blue-400 animate-pulse px-1">Saving…</span>
                    )}
                    {platform.saveStatus === 'saved' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-400 font-semibold">✓ Saved</span>
                        {platform.savedPlatformId && (
                          <Link
                            href={`/platforms/${platform.savedPlatformId}`}
                            className="text-xs text-brand-blue hover:text-blue-400 transition-colors"
                          >
                            View →
                          </Link>
                        )}
                      </div>
                    )}
                    {platform.saveStatus === 'error' && (
                      <button
                        onClick={() => savePlatform(platform.name)}
                        className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Retry Save
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Platform body */}
            <div className="px-5 py-4 space-y-4">
              {/* Tiers */}
              {platform.tiers.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    Technology Tiers
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {platform.tiers.map(tier => (
                      <span
                        key={tier.id}
                        className={`text-xs font-bold px-3 py-1 rounded-lg border ${TIER_STYLES[tier.tier] ?? TIER_STYLES.standard}`}
                      >
                        {tier.label}
                        <span className="font-normal opacity-70 ml-1">({tier.tier})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Form Factors */}
              {platform.formFactors.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    Form Factors ({platform.formFactors.length})
                  </div>
                  <div className="space-y-1.5">
                    {platform.formFactors.map(ff => (
                      <div key={ff.name} className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${STYLE_COLORS[ff.style] ?? STYLE_COLORS.other}`}>
                          {ff.style}
                        </span>
                        <span className="text-sm text-zinc-300">{ff.name}</span>
                        {ff.availableTiers && ff.availableTiers.length > 0 && ff.availableTiers.length < platform.tiers.length && (
                          <span className="text-[10px] text-zinc-600">
                            ({ff.availableTiers.join(', ')} only)
                          </span>
                        )}
                        {ff.notes && (
                          <span className="text-[10px] text-zinc-600 italic">{ff.notes}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fitting Options */}
              {platform.fittingOptions.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                    Fitting Options
                  </div>
                  {platform.fittingOptions.map(fo => (
                    <div key={fo.name} className="flex items-start gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 shrink-0">
                        FITTING
                      </span>
                      <div>
                        <span className="text-sm text-zinc-300">{fo.name}</span>
                        {fo.description && (
                          <p className="text-[10px] text-zinc-600 mt-0.5">{fo.description}</p>
                        )}
                        {fo.styles.length > 0 && (
                          <span className="text-[10px] text-zinc-600">Styles: {fo.styles.join(', ')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Image Approval (after research) */}
              {platform.candidateImages.length > 0 && (
                <div className="pt-2 border-t border-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      Product Images
                    </div>
                    {platform.saveStatus === 'saved' && (
                      <>
                        {platform.imageStatus === 'idle' && (
                          <button
                            onClick={() => storeImages(platform.name)}
                            disabled={platform.candidateImages.filter(i => i.status === 'approved').length === 0}
                            className="text-[10px] bg-purple-500/20 hover:bg-purple-500/30 disabled:opacity-40 text-purple-400 font-semibold px-3 py-1 rounded-lg transition-colors"
                          >
                            Store {platform.candidateImages.filter(i => i.status === 'approved').length} Approved
                          </button>
                        )}
                        {platform.imageStatus === 'storing' && (
                          <span className="text-[10px] text-purple-400 animate-pulse">Storing images…</span>
                        )}
                        {platform.imageStatus === 'stored' && (
                          <span className="text-[10px] text-purple-400 font-semibold">✓ Images stored</span>
                        )}
                        {platform.imageStatus === 'error' && (
                          <button
                            onClick={() => storeImages(platform.name)}
                            className="text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1 rounded-lg transition-colors"
                          >
                            Retry
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  <ImageApproval
                    images={platform.candidateImages}
                    onChange={(images) => updatePlatform(platform.name, { candidateImages: images })}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="pb-8" />
    </div>
  )
}
