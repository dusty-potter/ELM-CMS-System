'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Capability = { id: string; key: string; label: string; category: string; description: string | null }
type DeclaredCapability = { id: string; confirmed: boolean; capability: Capability }
type FormFactorImage = { id: string; type: string; localUrl: string; variantHeroWide: string | null; variantSquare: string | null; variantThumbnail: string | null; sortOrder: number }
type FormFactor = {
  id: string; style: string; name: string; slug: string; status: string
  batteryType: string | null; batterySize: string | null; batteryEstimatedHours: number | null
  ipRating: string | null; waterResistant: boolean; colors: string[]
  connectivityIos: boolean; connectivityAndroid: boolean
  connectivityBluetooth: boolean; connectivityHandsFree: boolean
  images: FormFactorImage[]
}
type Product = {
  id: string; name: string; displayName: string | null; slug: string
  tier: string | null; status: string
  canonicalDescription: string | null; targetUser: string | null
  bestFor: string[]; pros: string[]; cons: string[]; hearingLossRange: string[]
  formFactors: FormFactor[]
  declaredCapabilities: DeclaredCapability[]
  _count: { variants: number; publications: number }
}
type FittingOption = { id: string; name: string; description: string | null; styles: string[] }
type Platform = {
  id: string; name: string; displayName: string | null; slug: string
  generationYear: number | null; status: string; isLegacy: boolean
  summary: string | null; keyDifferentiators: string[]; techTerms: string[]
  connectivityIos: boolean; connectivityAndroid: boolean; connectivityBluetooth: boolean
  connectivityAuracast: boolean; connectivityHandsFree: boolean; connectivityRemoteControl: boolean
  autoFilled: boolean; confidenceLevel: string | null
  manufacturer: { id: string; name: string; logoUrl: string | null }
  capabilityPool: Capability[]
  fittingOptions: FittingOption[]
  images: Array<{ id: string; type: string; localUrl: string; variantHeroWide: string | null; variantSquare: string | null; variantThumbnail: string | null; sortOrder: number }>
  products: Product[]
  _publishedSiteCount: number
  createdAt: string; updatedAt: string
}

// ---------------------------------------------------------------------------
// Style maps
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  published: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  approved:  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  draft:     'bg-zinc-800 text-zinc-500 border-zinc-700',
}
const TIER_STYLES: Record<string, string> = {
  premium:   'bg-yellow-500/20 text-yellow-400',
  advanced:  'bg-blue-500/20 text-blue-400',
  standard:  'bg-zinc-700 text-zinc-300',
  essential: 'bg-zinc-800 text-zinc-400',
}
const CAP_CATEGORY_STYLES: Record<string, string> = {
  processing:   'bg-purple-500/20 text-purple-400',
  connectivity: 'bg-blue-500/20 text-blue-400',
  health:       'bg-emerald-500/20 text-emerald-400',
  physical:     'bg-orange-500/20 text-orange-400',
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PlatformDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedTier, setExpandedTier] = useState<string | null>(null)
  const [rescanning, setRescanning] = useState(false)
  const [rescanResult, setRescanResult] = useState<string | null>(null)

  const fetchPlatform = useCallback(() => {
    fetch(`/api/cms/platforms/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setPlatform(data)
        // Auto-expand first tier
        if (data.products?.length > 0 && !expandedTier) {
          setExpandedTier(data.products[0].id)
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { fetchPlatform() }, [fetchPlatform])

  async function patchPlatform(fields: Record<string, unknown>) {
    setSaving(true)
    try {
      const res = await fetch(`/api/cms/platforms/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      fetchPlatform()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function deletePlatform() {
    if (!confirm('This will permanently delete the platform and all its data. This cannot be undone. Continue?')) return
    setSaving(true)
    try {
      const res = await fetch(`/api/cms/platforms/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/platforms')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed')
      setSaving(false)
    }
  }

  async function rescanPlatform() {
    if (!platform) return
    setRescanning(true)
    setRescanResult(null)
    try {
      // Step 1: Re-enumerate the manufacturer
      const enumRes = await fetch('/api/ingest/enumerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manufacturer: platform.manufacturer.name }),
      })
      const enumData = await enumRes.json()
      if (!enumRes.ok) throw new Error(enumData.error || 'Enumerate failed')

      // Find matching platform
      const match = (enumData.platforms ?? []).find(
        (p: { name: string }) => p.name.toLowerCase() === platform.name.toLowerCase()
      )
      if (!match) throw new Error(`Platform "${platform.name}" not found in manufacturer lineup`)

      // Step 2: Research the platform
      const researchRes = await fetch('/api/ingest/platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manufacturer: platform.manufacturer.name, platform: match }),
      })
      const researchData = await researchRes.json()
      if (!researchRes.ok) throw new Error(researchData.error || 'Research failed')

      // Step 3: Save/update the platform
      const saveRes = await fetch('/api/cms/save-platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manufacturer: platform.manufacturer.name,
          platform: match,
          research: researchData.research,
        }),
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok) throw new Error(saveData.error || 'Save failed')

      setRescanResult(`Rescan complete — ${saveData.productIds?.length ?? 0} tiers, ${saveData.formFactorIds?.length ?? 0} form factors updated`)
      fetchPlatform()
    } catch (e) {
      setRescanResult(`Error: ${e instanceof Error ? e.message : 'Rescan failed'}`)
    } finally {
      setRescanning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="w-8 h-8 border-4 border-zinc-700 border-t-brand-blue rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !platform) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link href="/products" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">← Products</Link>
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mt-4">
          {error || 'Platform not found'}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

      {/* Header */}
      <div>
        <Link href="/products" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">← Products</Link>
        <div className="flex items-start justify-between gap-4 mt-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white">
                {platform.manufacturer.name} {platform.displayName || platform.name}
              </h1>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${STATUS_STYLES[platform.status]}`}>
                {platform.status}
              </span>
              {platform.isLegacy && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-700 text-zinc-400 border border-zinc-600">
                  Legacy
                </span>
              )}
            </div>
            <p className="text-zinc-500 text-sm mt-1">
              {platform.manufacturer.name} · {platform.name}
              {platform.generationYear && <> · {platform.generationYear}</>}
              {platform.autoFilled && <> · <span className="text-zinc-600">AI-generated</span></>}
              {platform.confidenceLevel && <> · <span className="text-zinc-600">{platform.confidenceLevel} confidence</span></>}
            </p>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap justify-end">
            {/* Rescan */}
            <button onClick={rescanPlatform} disabled={saving || rescanning}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
              {rescanning ? 'Rescanning…' : 'Rescan'}
            </button>

            {/* Status workflow */}
            {platform.status === 'draft' && (
              <button onClick={() => patchPlatform({ status: 'approved' })} disabled={saving}
                className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
                Approve
              </button>
            )}
            {platform.status === 'approved' && (
              <button onClick={() => patchPlatform({ status: 'published' })} disabled={saving}
                className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
                Publish
              </button>
            )}
            {(platform.status === 'published' || platform.status === 'approved') && (
              <button
                onClick={() => {
                  if (confirm('This will unpublish all products from all sites and retire this platform. Continue?'))
                    patchPlatform({ status: 'retired' })
                }}
                disabled={saving}
                className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
                Retire
              </button>
            )}
            {platform.status === 'retired' && (
              <button onClick={() => patchPlatform({ status: 'draft' })} disabled={saving}
                className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
                Reactivate
              </button>
            )}

            {/* Legacy toggle */}
            {platform.isLegacy ? (
              <button onClick={() => patchPlatform({ isLegacy: false })} disabled={saving}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
                Remove Legacy
              </button>
            ) : (
              <button onClick={() => patchPlatform({ isLegacy: true })} disabled={saving}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
                Mark Legacy
              </button>
            )}

            {/* Delete — only when not published to sites */}
            {(platform.status === 'draft' || platform.status === 'retired') && (
              <button onClick={deletePlatform} disabled={saving}
                className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {saving && <div className="text-xs text-blue-400 animate-pulse">Saving…</div>}

      {platform.status === 'retired' && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
          This platform is retired and unpublished from all sites.
        </div>
      )}

      {rescanResult && (
        <div className={`rounded-xl px-4 py-3 text-sm ${
          rescanResult.startsWith('Error') ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
        }`}>
          {rescanResult}
        </div>
      )}

      {/* Manufacturer Logo + Platform Images */}
      {(platform.manufacturer.logoUrl || platform.images.length > 0) && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-6">
            {platform.manufacturer.logoUrl && (
              <div className="shrink-0">
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Manufacturer</label>
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800">
                  <img src={platform.manufacturer.logoUrl} alt={platform.manufacturer.name} className="w-full h-full object-contain p-2" />
                </div>
              </div>
            )}
            {platform.images.length > 0 && (
              <div className="flex-1">
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Platform Images ({platform.images.length})</label>
                <div className="flex gap-3 overflow-x-auto">
                  {platform.images.map(img => (
                    <div key={img.id} className="shrink-0 w-32 h-24 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800">
                      <img src={img.variantHeroWide || img.localUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Platform Summary */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Platform Overview</h2>
        {platform.summary ? (
          <p className="text-sm text-zinc-300">{platform.summary}</p>
        ) : (
          <p className="text-sm text-zinc-600 italic">No summary yet.</p>
        )}
        {platform.keyDifferentiators.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Key Differentiators</label>
            <div className="flex flex-wrap gap-2">
              {platform.keyDifferentiators.map((d, i) => (
                <span key={i} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-lg">{d}</span>
              ))}
            </div>
          </div>
        )}
        {platform.techTerms.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Tech Terms (Locked)</label>
            <div className="flex flex-wrap gap-2">
              {platform.techTerms.map((t, i) => (
                <span key={i} className="text-xs bg-purple-500/10 text-purple-400 px-2 py-1 rounded-lg">{t}</span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Connectivity Ceiling */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Connectivity Ceiling</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'iOS', val: platform.connectivityIos },
            { label: 'Android', val: platform.connectivityAndroid },
            { label: 'Bluetooth', val: platform.connectivityBluetooth },
            { label: 'Auracast', val: platform.connectivityAuracast },
            { label: 'Hands-Free', val: platform.connectivityHandsFree },
            { label: 'Remote Control', val: platform.connectivityRemoteControl },
          ].map(({ label, val }) => (
            <div key={label} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
              val ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800/50 text-zinc-600'
            }`}>
              <span className="text-xs font-medium">{val ? '✓' : '–'} {label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Fitting Options */}
      {platform.fittingOptions.length > 0 && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
            Fitting Options ({platform.fittingOptions.length})
          </h2>
          {platform.fittingOptions.map(fo => (
            <div key={fo.id} className="bg-zinc-800/50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                  FITTING
                </span>
                <span className="text-sm font-semibold text-white">{fo.name}</span>
              </div>
              {fo.description && <p className="text-xs text-zinc-400 mt-1">{fo.description}</p>}
              {fo.styles.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {fo.styles.map(s => (
                    <span key={s} className="text-[10px] bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded">{s}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Capability Pool */}
      {platform.capabilityPool.length > 0 && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
            Capability Pool ({platform.capabilityPool.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {platform.capabilityPool.map(cap => (
              <div key={cap.id} className="flex items-center gap-2 bg-zinc-800/50 rounded-xl px-3 py-2">
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${CAP_CATEGORY_STYLES[cap.category] ?? 'bg-zinc-700 text-zinc-400'}`}>
                  {cap.category}
                </span>
                <span className="text-sm text-zinc-300 flex-1">{cap.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Technology Tiers (Products) */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider px-1">
          Technology Tiers ({platform.products.length})
        </h2>

        {platform.products.map(product => {
          const isExpanded = expandedTier === product.id
          return (
            <div key={product.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              {/* Tier header — clickable */}
              <button
                onClick={() => setExpandedTier(isExpanded ? null : product.id)}
                className="w-full px-6 py-4 flex items-center gap-3 hover:bg-zinc-800/50 transition-colors text-left"
              >
                <span className="text-sm font-bold text-white">{product.displayName || product.name}</span>
                {product.tier && (
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${TIER_STYLES[product.tier]}`}>
                    {product.tier}
                  </span>
                )}
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${STATUS_STYLES[product.status]}`}>
                  {product.status}
                </span>
                <span className="text-xs text-zinc-600 ml-auto">
                  {product.formFactors.length} form factors
                  {product._count.variants > 0 && <> · {product._count.variants} variants</>}
                </span>
                <span className="text-zinc-600 text-xs">{isExpanded ? '▼' : '▶'}</span>
              </button>

              {/* Tier details */}
              {isExpanded && (
                <div className="px-6 pb-6 space-y-4 border-t border-zinc-800 pt-4">
                  {/* Description */}
                  {product.canonicalDescription && (
                    <p className="text-sm text-zinc-300">{product.canonicalDescription}</p>
                  )}

                  {/* Positioning */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {product.bestFor.length > 0 && (
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Best For</label>
                        <ul className="space-y-0.5">
                          {product.bestFor.map((b, i) => (
                            <li key={i} className="text-xs text-zinc-400 flex gap-1"><span className="text-zinc-600">•</span> {b}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {product.pros.length > 0 && (
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Pros</label>
                        <ul className="space-y-0.5">
                          {product.pros.map((p, i) => (
                            <li key={i} className="text-xs text-emerald-400/70 flex gap-1"><span>+</span> {p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {product.cons.length > 0 && (
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Cons</label>
                        <ul className="space-y-0.5">
                          {product.cons.map((c, i) => (
                            <li key={i} className="text-xs text-red-400/70 flex gap-1"><span>–</span> {c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {product.targetUser && (
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Target User</label>
                        <p className="text-xs text-zinc-400">{product.targetUser}</p>
                      </div>
                    )}
                  </div>

                  {/* Form Factors for this tier */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
                      Form Factors ({product.formFactors.length})
                    </label>
                    <div className="space-y-2">
                      {product.formFactors.map(ff => (
                        <div key={ff.id} className="bg-zinc-800/50 rounded-xl px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white text-sm">{ff.name}</span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-700 text-zinc-400">{ff.style}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-zinc-500">
                            {ff.batteryType && <span>Battery: {ff.batteryType}{ff.batterySize ? ` (${ff.batterySize})` : ''}</span>}
                            {ff.batteryEstimatedHours && <span>{ff.batteryEstimatedHours}h</span>}
                            {ff.ipRating && <span>{ff.ipRating}</span>}
                            {ff.colors.length > 0 && <span>{ff.colors.length} colors</span>}
                          </div>
                          {ff.images.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {ff.images.slice(0, 4).map(img => (
                                <div key={img.id} className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-700">
                                  <img
                                    src={img.variantThumbnail || img.localUrl}
                                    alt={ff.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Link to full product editor */}
                  <Link
                    href={`/products/${product.id}`}
                    className="inline-block text-xs text-brand-blue hover:text-blue-400 transition-colors"
                  >
                    Edit full product details →
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </section>

      {/* Metadata */}
      <div className="text-xs text-zinc-700 flex gap-4">
        <span>Created: {new Date(platform.createdAt).toLocaleDateString()}</span>
        <span>Updated: {new Date(platform.updatedAt).toLocaleDateString()}</span>
        <span>Slug: {platform.slug}</span>
      </div>
    </div>
  )
}
