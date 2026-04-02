'use client'

import { useState } from 'react'

const MANUFACTURERS = [
  'Phonak', 'Oticon', 'Starkey', 'ReSound', 'Widex',
  'Signia', 'Unitron', 'Audibel', 'Beltone', 'Lenire',
]

type Capability = {
  key: string
  label: string
  category: 'processing' | 'connectivity' | 'health' | 'physical'
  description: string | null
}

type FormFactor = {
  style: string
  name: string
  batteryType: 'disposable' | 'rechargeable' | null
  batterySize: string | null
  batteryEstimatedHours: number | null
  ipRating: string | null
  waterResistant: boolean
  colors: string[]
  connectivityIos: boolean
  connectivityAndroid: boolean
  connectivityBluetooth: boolean
  connectivityHandsFree: boolean
}

type IngestProduct = {
  platform: string | null
  displayName: string | null
  tier: 'premium' | 'advanced' | 'standard' | 'essential' | null
  canonicalDescription: string | null
  bestFor: string[]
  pros: string[]
  cons: string[]
  targetUser: string | null
  hearingLossRange: string[]
  capabilities: Capability[]
  connectivity: {
    ios: boolean
    android: boolean
    bluetooth: boolean
    auracast: boolean
    handsFree: boolean
    remoteControl: boolean
  }
  formFactors: FormFactor[]
  compSpeechInNoise: 'low' | 'medium' | 'high' | null
  compMusicQuality: 'low' | 'medium' | 'high' | null
  compTinnitusSupport: boolean | null
  compAiProcessing: boolean | null
  compRemoteCare: boolean | null
  compHealthTracking: boolean | null
  confidenceLevel: 'high' | 'medium' | 'low'
}

type IngestResult = {
  manufacturer: string
  modelName: string
  product: IngestProduct
}

const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const CATEGORY_STYLES: Record<string, string> = {
  processing: 'bg-blue-500/20 text-blue-400',
  connectivity: 'bg-purple-500/20 text-purple-400',
  health: 'bg-emerald-500/20 text-emerald-400',
  physical: 'bg-zinc-700 text-zinc-300',
}

const TIER_STYLES: Record<string, string> = {
  premium: 'bg-yellow-500/20 text-yellow-400',
  advanced: 'bg-blue-500/20 text-blue-400',
  standard: 'bg-zinc-700 text-zinc-300',
  essential: 'bg-zinc-800 text-zinc-400',
}

function Tag({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg text-xs">
      {label}
      {onRemove && (
        <button onClick={onRemove} className="text-zinc-500 hover:text-zinc-200 ml-0.5">×</button>
      )}
    </span>
  )
}

function BoolDot({ value }: { value: boolean | null }) {
  if (value === null) return <span className="text-zinc-600 text-xs">unknown</span>
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${value ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
      <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  )
}

export default function IngestPage() {
  const [step, setStep] = useState<'input' | 'loading' | 'review'>('input')
  const [manufacturer, setManufacturer] = useState('')
  const [modelName, setModelName] = useState('')
  const [result, setResult] = useState<IngestResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [copied, setCopied] = useState(false)

  async function handleResearch() {
    if (!manufacturer || !modelName.trim()) return
    setStep('loading')
    setError(null)

    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manufacturer, modelName: modelName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Research failed')
      setResult(data)
      setDescription(data.product.canonicalDescription ?? '')
      setStep('review')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setStep('input')
    }
  }

  function handleCopyJson() {
    if (!result) return
    const export_ = { ...result, product: { ...result.product, canonicalDescription: description } }
    navigator.clipboard.writeText(JSON.stringify(export_, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Input step ────────────────────────────────────────────────────────────

  if (step === 'input') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Research a Product</h1>
            <p className="mt-2 text-zinc-400 text-sm">
              Enter a manufacturer and model name. The AI will research specs, form factors,
              and capabilities for your review.
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

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Model Name</label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
                placeholder="e.g. Audéo L90, Intent 1, IX7"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:border-brand-blue outline-none transition-colors"
              />
            </div>

            <button
              onClick={handleResearch}
              disabled={!manufacturer || !modelName.trim()}
              className="w-full bg-brand-blue hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Research Product
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Loading step ──────────────────────────────────────────────────────────

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6">
        <div className="w-10 h-10 border-4 border-zinc-700 border-t-brand-blue rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-white font-semibold">Researching {manufacturer} {modelName}…</p>
          <p className="text-zinc-500 text-sm mt-1">This usually takes 5–10 seconds.</p>
        </div>
      </div>
    )
  }

  // ── Review step ───────────────────────────────────────────────────────────

  const p = result!.product

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">
              {result!.manufacturer} {result!.modelName}
            </h1>
            {p.tier && (
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${TIER_STYLES[p.tier] ?? ''}`}>
                {p.tier}
              </span>
            )}
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${CONFIDENCE_STYLES[p.confidenceLevel]}`}>
              {p.confidenceLevel} confidence
            </span>
          </div>
          {p.displayName && <p className="text-zinc-500 text-sm">{p.displayName}</p>}
          {p.platform && <p className="text-zinc-500 text-sm">Platform: <span className="text-zinc-300">{p.platform}</span></p>}
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleCopyJson}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            {copied ? 'Copied!' : 'Copy JSON'}
          </button>
          <button
            onClick={() => { setStep('input'); setResult(null) }}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            Research Another
          </button>
        </div>
      </div>

      <p className="text-xs text-zinc-600 border border-zinc-800 rounded-xl px-4 py-3">
        Review the AI-researched data below. The canonical description is editable. All other fields
        can be refined in the full product editor after saving to the CMS.
      </p>

      {/* Canonical Description */}
      <SectionCard title="Canonical Description">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors resize-none"
        />
        <p className="text-xs text-zinc-600">This is the human-controlled source of truth. Edit freely before saving.</p>
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Positioning */}
        <SectionCard title="Best For">
          <div className="flex flex-wrap gap-2">
            {p.bestFor?.length ? p.bestFor.map((s) => <Tag key={s} label={s} />) : <span className="text-zinc-600 text-xs">None found</span>}
          </div>
        </SectionCard>

        <SectionCard title="Target User">
          <p className="text-sm text-zinc-300">{p.targetUser ?? <span className="text-zinc-600">Not found</span>}</p>
        </SectionCard>

        <SectionCard title="Pros">
          <ul className="space-y-1.5">
            {p.pros?.length
              ? p.pros.map((s) => <li key={s} className="flex gap-2 text-sm text-zinc-300"><span className="text-emerald-500 shrink-0">+</span>{s}</li>)
              : <li className="text-zinc-600 text-xs">None found</li>}
          </ul>
        </SectionCard>

        <SectionCard title="Cons">
          <ul className="space-y-1.5">
            {p.cons?.length
              ? p.cons.map((s) => <li key={s} className="flex gap-2 text-sm text-zinc-300"><span className="text-red-400 shrink-0">−</span>{s}</li>)
              : <li className="text-zinc-600 text-xs">None found</li>}
          </ul>
        </SectionCard>

        {/* Hearing Loss Range */}
        <SectionCard title="Hearing Loss Range">
          <div className="flex flex-wrap gap-2">
            {p.hearingLossRange?.length ? p.hearingLossRange.map((s) => <Tag key={s} label={s} />) : <span className="text-zinc-600 text-xs">None found</span>}
          </div>
        </SectionCard>

        {/* Comparison Data */}
        <SectionCard title="Comparison Ratings">
          <div className="space-y-2 text-sm">
            {[
              ['Speech in Noise', p.compSpeechInNoise],
              ['Music Quality', p.compMusicQuality],
            ].map(([label, val]) => (
              <div key={label as string} className="flex justify-between items-center">
                <span className="text-zinc-400">{label}</span>
                {val ? (
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                    val === 'high' ? 'bg-emerald-500/20 text-emerald-400' :
                    val === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-zinc-700 text-zinc-400'
                  }`}>{val}</span>
                ) : <span className="text-zinc-600 text-xs">unknown</span>}
              </div>
            ))}
            {[
              ['Tinnitus Support', p.compTinnitusSupport],
              ['AI Processing', p.compAiProcessing],
              ['Remote Care', p.compRemoteCare],
              ['Health Tracking', p.compHealthTracking],
            ].map(([label, val]) => (
              <div key={label as string} className="flex justify-between items-center">
                <span className="text-zinc-400">{label}</span>
                <BoolDot value={val as boolean | null} />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Connectivity */}
      <SectionCard title="Platform Connectivity">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(p.connectivity ?? {}).map(([key, val]) => (
            <div key={key} className="flex items-center gap-2">
              <BoolDot value={val} />
              <span className="text-sm text-zinc-300 capitalize">{key === 'ios' ? 'iOS' : key === 'handsFree' ? 'Hands-Free' : key === 'remoteControl' ? 'Remote Control' : key.charAt(0).toUpperCase() + key.slice(1)}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Form Factors */}
      {p.formFactors?.length > 0 && (
        <SectionCard title={`Form Factors (${p.formFactors.length})`}>
          <div className="space-y-4">
            {p.formFactors.map((ff, i) => (
              <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-white text-sm">{ff.name}</span>
                  <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-bold uppercase">{ff.style}</span>
                  {ff.batteryType && (
                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-bold uppercase">{ff.batteryType}</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                  {ff.batteryType === 'disposable' && ff.batterySize && (
                    <div><span className="text-zinc-500">Battery: </span><span className="text-zinc-300">Size {ff.batterySize}</span></div>
                  )}
                  {ff.batteryEstimatedHours && (
                    <div><span className="text-zinc-500">Hours: </span><span className="text-zinc-300">{ff.batteryEstimatedHours}h</span></div>
                  )}
                  {ff.ipRating && (
                    <div><span className="text-zinc-500">IP Rating: </span><span className="text-zinc-300">{ff.ipRating}</span></div>
                  )}
                  <div><span className="text-zinc-500">Water Resistant: </span><span className="text-zinc-300">{ff.waterResistant ? 'Yes' : 'No'}</span></div>
                </div>
                {ff.colors?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {ff.colors.map((c) => <Tag key={c} label={c} />)}
                  </div>
                )}
                <div className="flex gap-3 text-xs text-zinc-500 pt-1">
                  {ff.connectivityIos && <span className="text-zinc-300">iOS</span>}
                  {ff.connectivityAndroid && <span className="text-zinc-300">Android</span>}
                  {ff.connectivityBluetooth && <span className="text-zinc-300">Bluetooth</span>}
                  {ff.connectivityHandsFree && <span className="text-zinc-300">Hands-Free</span>}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Capabilities */}
      {p.capabilities?.length > 0 && (
        <SectionCard title={`Capabilities (${p.capabilities.length})`}>
          <div className="space-y-2">
            {p.capabilities.map((cap) => (
              <div key={cap.key} className="flex items-start gap-3">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded shrink-0 mt-0.5 ${CATEGORY_STYLES[cap.category] ?? 'bg-zinc-700 text-zinc-400'}`}>
                  {cap.category}
                </span>
                <div>
                  <span className="text-sm font-medium text-zinc-200">{cap.label}</span>
                  {cap.description && <p className="text-xs text-zinc-500 mt-0.5">{cap.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2 pb-8">
        <button
          onClick={handleCopyJson}
          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-3 rounded-xl transition-colors"
        >
          {copied ? 'Copied to Clipboard!' : 'Copy as JSON'}
        </button>
        <button
          disabled
          title="Save to CMS requires database setup"
          className="flex-1 bg-brand-blue/40 text-blue-300 font-semibold py-3 rounded-xl cursor-not-allowed opacity-60"
        >
          Save to CMS (coming soon)
        </button>
      </div>

    </div>
  )
}
