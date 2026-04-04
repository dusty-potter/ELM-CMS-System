'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Capability = { id: string; key: string; label: string; category: string; description: string | null }
type DeclaredCapability = { id: string; confirmed: boolean; capability: Capability }
type FormFactorImage = {
  id: string; type: string; sourceUrl: string; localUrl: string
  variantHeroWide: string | null; variantSquare: string | null; variantThumbnail: string | null
  sortOrder: number
}
type FormFactor = {
  id: string; style: string; name: string; slug: string; status: string
  batteryType: string | null; batterySize: string | null; batteryEstimatedHours: number | null
  ipRating: string | null; waterResistant: boolean; colors: string[]
  connectivityIos: boolean; connectivityAndroid: boolean
  connectivityBluetooth: boolean; connectivityHandsFree: boolean
  images: FormFactorImage[]
}
type Variant = { id: string; text: string; status: string; scope: string; aiGenerated: boolean; createdAt: string }
type Publication = { id: string; status: string; site: { id: string; name: string; domain: string } }

type Product = {
  id: string; name: string; displayName: string | null; slug: string
  tier: string | null; status: string
  canonicalDescription: string | null; targetUser: string | null
  bestFor: string[]; pros: string[]; cons: string[]; hearingLossRange: string[]
  compSpeechInNoise: string | null; compMusicQuality: string | null
  compTinnitusSupport: boolean | null; compAiProcessing: boolean | null
  compRemoteCare: boolean | null; compHealthTracking: boolean | null
  autoFilled: boolean; confidenceLevel: string | null; ingestSource: string | null
  manufacturer: { id: string; name: string }
  platform: { id: string; name: string; displayName: string | null }
  formFactors: FormFactor[]
  declaredCapabilities: DeclaredCapability[]
  variants: Variant[]
  publications: Publication[]
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
// Editable text field
// ---------------------------------------------------------------------------

function EditableText({
  label, value, multiline, onSave,
}: {
  label: string; value: string; multiline?: boolean
  onSave: (val: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => { setDraft(value) }, [value])

  if (!editing) {
    return (
      <div className="group">
        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">{label}</label>
        <div
          onClick={() => setEditing(true)}
          className="text-sm text-zinc-300 cursor-pointer hover:bg-zinc-800/50 rounded-lg px-3 py-2 -mx-3 transition-colors min-h-[2.5rem] flex items-start"
        >
          {value || <span className="text-zinc-600 italic">Click to add…</span>}
          <span className="ml-auto text-zinc-700 group-hover:text-zinc-500 text-xs shrink-0">Edit</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">{label}</label>
      {multiline ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          className="w-full bg-zinc-950 border border-zinc-600 rounded-xl px-3 py-2 text-sm text-white focus:border-brand-blue outline-none transition-colors"
          autoFocus
        />
      ) : (
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-600 rounded-xl px-3 py-2 text-sm text-white focus:border-brand-blue outline-none transition-colors"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') { onSave(draft); setEditing(false) } }}
        />
      )}
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => { onSave(draft); setEditing(false) }}
          className="text-xs bg-brand-blue hover:bg-blue-500 text-white font-semibold px-3 py-1 rounded-lg transition-colors"
        >
          Save
        </button>
        <button
          onClick={() => { setDraft(value); setEditing(false) }}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-3 py-1 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Editable list field
// ---------------------------------------------------------------------------

function EditableList({
  label, items, onSave,
}: {
  label: string; items: string[]
  onSave: (items: string[]) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(items.join('\n'))

  useEffect(() => { setDraft(items.join('\n')) }, [items])

  if (!editing) {
    return (
      <div className="group">
        <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">{label}</label>
        <div
          onClick={() => setEditing(true)}
          className="cursor-pointer hover:bg-zinc-800/50 rounded-lg px-3 py-2 -mx-3 transition-colors"
        >
          {items.length > 0 ? (
            <ul className="space-y-1">
              {items.map((item, i) => (
                <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                  <span className="text-zinc-600 shrink-0">•</span>
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-zinc-600 italic text-sm">Click to add…</span>
          )}
          <span className="text-zinc-700 group-hover:text-zinc-500 text-xs mt-1 block text-right">Edit</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">{label} (one per line)</label>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={Math.max(3, items.length + 1)}
        className="w-full bg-zinc-950 border border-zinc-600 rounded-xl px-3 py-2 text-sm text-white focus:border-brand-blue outline-none transition-colors"
        autoFocus
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => {
            onSave(draft.split('\n').map(s => s.trim()).filter(Boolean))
            setEditing(false)
          }}
          className="text-xs bg-brand-blue hover:bg-blue-500 text-white font-semibold px-3 py-1 rounded-lg transition-colors"
        >
          Save
        </button>
        <button
          onClick={() => { setDraft(items.join('\n')); setEditing(false) }}
          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-3 py-1 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Form Factors section with per-FF image search
// ---------------------------------------------------------------------------

type FFImageCandidate = { url: string; status: 'pending' | 'approved' | 'rejected' }

function FormFactorsSection({
  formFactors, manufacturer, onImagesUpdated,
}: {
  formFactors: FormFactor[]; manufacturer: string; onImagesUpdated: () => void
}) {
  const [searchingFF, setSearchingFF] = useState<string | null>(null)
  const [storingFF, setStoringFF] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<Record<string, FFImageCandidate[]>>({})
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(new Set())
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  async function searchImages(ff: FormFactor) {
    setSearchingFF(ff.id)
    try {
      const res = await fetch('/api/cms/images/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manufacturer, query: ff.name }),
      })
      const data = await res.json()
      if (data.images?.length > 0) {
        const existing = new Set((candidates[ff.id] ?? []).map(c => c.url))
        const newCandidates = data.images
          .filter((img: { url: string }) => !existing.has(img.url))
          .map((img: { url: string }) => ({ url: img.url, status: 'pending' as const }))
        setCandidates(prev => ({
          ...prev,
          [ff.id]: [...(prev[ff.id] ?? []), ...newCandidates],
        }))
      }
    } catch {
      // silently fail
    } finally {
      setSearchingFF(null)
    }
  }

  async function storeApproved(ff: FormFactor) {
    const approved = (candidates[ff.id] ?? []).filter(c => c.status === 'approved')
    if (approved.length === 0) return

    setStoringFF(ff.id)
    try {
      const res = await fetch('/api/cms/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formFactorId: ff.id,
          images: approved.map(c => ({ url: c.url, type: 'gallery' })),
        }),
      })
      if (res.ok) {
        setCandidates(prev => ({ ...prev, [ff.id]: [] }))
        onImagesUpdated()
      }
    } catch {
      // silently fail
    } finally {
      setStoringFF(null)
    }
  }

  function updateCandidate(ffId: string, url: string, status: FFImageCandidate['status']) {
    setCandidates(prev => ({
      ...prev,
      [ffId]: (prev[ffId] ?? []).map(c => c.url === url ? { ...c, status } : c),
    }))
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
      <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
        Form Factors ({formFactors.length})
      </h2>
      {formFactors.length === 0 ? (
        <p className="text-sm text-zinc-600 italic">No form factors yet.</p>
      ) : (
        <div className="space-y-4">
          {formFactors.map((ff) => {
            const ffCandidates = candidates[ff.id] ?? []
            const pending = ffCandidates.filter(c => c.status === 'pending')
            const approved = ffCandidates.filter(c => c.status === 'approved')
            const isSearching = searchingFF === ff.id
            const isStoring = storingFF === ff.id

            return (
              <div key={ff.id} className="bg-zinc-800/50 rounded-xl px-4 py-3 space-y-3">
                {/* FF header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-white text-sm">{ff.name}</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-700 text-zinc-400">{ff.style}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${STATUS_STYLES[ff.status]}`}>{ff.status}</span>
                    {ff.images.length > 0 && (
                      <span className="text-[10px] text-purple-400">{ff.images.length} img</span>
                    )}
                  </div>
                  <button
                    onClick={() => searchImages(ff)}
                    disabled={isSearching}
                    className="text-[10px] bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-zinc-300 px-3 py-1 rounded-lg transition-colors shrink-0"
                  >
                    {isSearching ? 'Searching…' : 'Find Images'}
                  </button>
                </div>

                {/* FF specs */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                  {ff.batteryType && <span>Battery: {ff.batteryType}{ff.batterySize ? ` (${ff.batterySize})` : ''}</span>}
                  {ff.batteryEstimatedHours && <span>{ff.batteryEstimatedHours}h battery life</span>}
                  {ff.ipRating && <span>{ff.ipRating}</span>}
                  {ff.waterResistant && <span>Water resistant</span>}
                  {ff.colors.length > 0 && <span>{ff.colors.length} colors</span>}
                </div>
                <div className="flex gap-3">
                  {ff.connectivityBluetooth && <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">Bluetooth</span>}
                  {ff.connectivityIos && <span className="text-[10px] bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded">iOS</span>}
                  {ff.connectivityAndroid && <span className="text-[10px] bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded">Android</span>}
                  {ff.connectivityHandsFree && <span className="text-[10px] bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded">Hands-free</span>}
                </div>

                {/* Existing stored images */}
                {ff.images.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {ff.images.map(img => (
                      <div key={img.id} className="w-16 h-16 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-700">
                        <img src={img.variantThumbnail || img.localUrl} alt={ff.name} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Image candidates — pending review */}
                {pending.length > 0 && (
                  <div>
                    <div className="text-[9px] font-bold text-amber-400 uppercase tracking-wider mb-1">Review ({pending.length})</div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {pending.map(c => (
                        <div key={c.url} className="relative group rounded-lg overflow-hidden border border-zinc-700 bg-zinc-950">
                          <div className="aspect-square">
                            {brokenUrls.has(c.url) ? (
                              <div className="w-full h-full flex items-center justify-center text-zinc-700 text-[9px]">N/A</div>
                            ) : (
                              <img src={c.url} alt="" className="w-full h-full object-cover cursor-pointer"
                                referrerPolicy="no-referrer"
                                onClick={() => setPreviewUrl(c.url)}
                                onError={() => setBrokenUrls(prev => new Set(prev).add(c.url))} />
                            )}
                          </div>
                          <div className="absolute top-0 left-0 right-0 flex justify-between p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!brokenUrls.has(c.url) && (
                              <button onClick={() => updateCandidate(ff.id, c.url, 'approved')}
                                className="w-5 h-5 bg-emerald-500/90 hover:bg-emerald-500 rounded-full text-white text-[10px] flex items-center justify-center">✓</button>
                            )}
                            <button onClick={() => updateCandidate(ff.id, c.url, 'rejected')}
                              className="w-5 h-5 bg-red-500/70 hover:bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center ml-auto">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Approved — ready to store */}
                {approved.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {approved.map(c => (
                        <div key={c.url} className="w-10 h-10 rounded border border-emerald-500/30 overflow-hidden">
                          <img src={c.url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => storeApproved(ff)}
                      disabled={isStoring}
                      className="text-[10px] bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50 text-emerald-400 font-semibold px-3 py-1 rounded-lg transition-colors"
                    >
                      {isStoring ? 'Storing…' : `Store ${approved.length} Image${approved.length > 1 ? 's' : ''}`}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8 cursor-pointer"
          onClick={() => setPreviewUrl(null)}>
          <div className="relative max-w-4xl max-h-full" onClick={e => e.stopPropagation()}>
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-[80vh] object-contain rounded-xl" referrerPolicy="no-referrer" />
            <button onClick={() => setPreviewUrl(null)}
              className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full text-white flex items-center justify-center">✕</button>
          </div>
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchProduct = useCallback(() => {
    fetch(`/api/cms/products/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setProduct(data)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { fetchProduct() }, [fetchProduct])

  async function patchProduct(fields: Record<string, unknown>) {
    setSaving(true)
    try {
      const res = await fetch(`/api/cms/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      fetchProduct()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="w-8 h-8 border-4 border-zinc-700 border-t-brand-blue rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link href="/products" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">← Products</Link>
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mt-4">
          {error || 'Product not found'}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm">
          <Link href="/products" className="text-zinc-500 hover:text-zinc-300 transition-colors">Products</Link>
          <span className="text-zinc-700">→</span>
          <Link href={`/platforms/${product.platform.id}`} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            {product.manufacturer.name} {product.platform.name}
          </Link>
          <span className="text-zinc-700">→</span>
          <span className="text-zinc-400">{product.name}</span>
        </div>
        <div className="flex items-start justify-between gap-4 mt-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{product.displayName || product.name}</h1>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${STATUS_STYLES[product.status]}`}>
                {product.status}
              </span>
              {product.tier && (
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${TIER_STYLES[product.tier]}`}>
                  {product.tier}
                </span>
              )}
            </div>
            <p className="text-zinc-500 text-sm mt-1">
              {product.manufacturer.name} · {product.platform.name}
              {product.autoFilled && <> · <span className="text-zinc-600">AI-generated</span></>}
              {product.confidenceLevel && <> · <span className="text-zinc-600">{product.confidenceLevel} confidence</span></>}
            </p>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap justify-end">
            {product.status === 'draft' && (
              <button
                onClick={() => patchProduct({ status: 'approved' })}
                disabled={saving}
                className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                Approve
              </button>
            )}
            {product.status === 'approved' && (
              <button
                onClick={() => patchProduct({ status: 'published' })}
                disabled={saving}
                className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                Publish
              </button>
            )}
            {(product.status === 'published' || product.status === 'approved') && (
              <button
                onClick={() => {
                  if (confirm('This will unpublish from all sites and retire this product. Continue?'))
                    patchProduct({ status: 'retired' })
                }}
                disabled={saving}
                className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                Retire
              </button>
            )}
            {product.status === 'retired' && (
              <button
                onClick={() => patchProduct({ status: 'draft' })}
                disabled={saving}
                className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                Reactivate
              </button>
            )}
            {product.status !== 'published' && product.status !== 'approved' && (
              <button
                onClick={async () => {
                  if (!confirm('Permanently delete this product and all its data? This cannot be undone.')) return
                  setSaving(true)
                  try {
                    const res = await fetch(`/api/cms/products/${id}`, { method: 'DELETE' })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.error)
                    router.push(`/platforms/${product.platform.id}`)
                  } catch (e) {
                    alert(e instanceof Error ? e.message : 'Delete failed')
                    setSaving(false)
                  }
                }}
                disabled={saving}
                className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {saving && (
        <div className="text-xs text-blue-400 animate-pulse">Saving…</div>
      )}

      {/* Description */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Content</h2>
        <EditableText
          label="Canonical Description"
          value={product.canonicalDescription ?? ''}
          multiline
          onSave={(val) => patchProduct({ canonicalDescription: val || null })}
        />
        <EditableText
          label="Display Name"
          value={product.displayName ?? ''}
          onSave={(val) => patchProduct({ displayName: val || null })}
        />
        <EditableText
          label="Target User"
          value={product.targetUser ?? ''}
          onSave={(val) => patchProduct({ targetUser: val || null })}
        />
      </section>

      {/* Lists */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Positioning</h2>
        <EditableList label="Best For" items={product.bestFor} onSave={(items) => patchProduct({ bestFor: items })} />
        <EditableList label="Pros" items={product.pros} onSave={(items) => patchProduct({ pros: items })} />
        <EditableList label="Cons" items={product.cons} onSave={(items) => patchProduct({ cons: items })} />
        <EditableList label="Hearing Loss Range" items={product.hearingLossRange} onSave={(items) => patchProduct({ hearingLossRange: items })} />
      </section>

      {/* Comparison data */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Comparison Data</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Speech in Noise', key: 'compSpeechInNoise', val: product.compSpeechInNoise },
            { label: 'Music Quality', key: 'compMusicQuality', val: product.compMusicQuality },
          ].map(({ label, key, val }) => (
            <div key={key}>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">{label}</label>
              <select
                value={val ?? ''}
                onChange={(e) => patchProduct({ [key]: e.target.value || null })}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-blue transition-colors"
              >
                <option value="">Not set</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          ))}
          {[
            { label: 'Tinnitus Support', key: 'compTinnitusSupport', val: product.compTinnitusSupport },
            { label: 'AI Processing', key: 'compAiProcessing', val: product.compAiProcessing },
            { label: 'Remote Care', key: 'compRemoteCare', val: product.compRemoteCare },
            { label: 'Health Tracking', key: 'compHealthTracking', val: product.compHealthTracking },
          ].map(({ label, key, val }) => (
            <div key={key}>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">{label}</label>
              <select
                value={val === null ? '' : val ? 'true' : 'false'}
                onChange={(e) => patchProduct({ [key]: e.target.value === '' ? null : e.target.value === 'true' })}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-blue transition-colors"
              >
                <option value="">Not set</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      {product.declaredCapabilities.length > 0 && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
            Capabilities ({product.declaredCapabilities.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {product.declaredCapabilities.map((dc) => (
              <div
                key={dc.id}
                className="flex items-center gap-2 bg-zinc-800/50 rounded-xl px-3 py-2"
              >
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${CAP_CATEGORY_STYLES[dc.capability.category] ?? 'bg-zinc-700 text-zinc-400'}`}>
                  {dc.capability.category}
                </span>
                <span className="text-sm text-zinc-300 flex-1">{dc.capability.label}</span>
                {dc.confirmed && <span className="text-emerald-500 text-xs">✓</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Form Factors */}
      <FormFactorsSection
        formFactors={product.formFactors}
        manufacturer={product.manufacturer.name}
        onImagesUpdated={fetchProduct}
      />

      {/* Content Variants */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
          Content Variants ({product.variants.length})
        </h2>
        {product.variants.length === 0 ? (
          <p className="text-sm text-zinc-600 italic">No content variants yet. Variants are site-specific rewrites of the canonical description.</p>
        ) : (
          <div className="space-y-3">
            {product.variants.map((v) => (
              <div key={v.id} className="bg-zinc-800/50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${STATUS_STYLES[v.status]}`}>{v.status}</span>
                  <span className="text-[10px] text-zinc-600 uppercase">{v.scope}</span>
                  {v.aiGenerated && <span className="text-[10px] text-zinc-600">AI</span>}
                </div>
                <p className="text-sm text-zinc-400 line-clamp-3">{v.text}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Site Publications */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
          Published to Sites ({product.publications.length})
        </h2>
        {product.publications.length === 0 ? (
          <p className="text-sm text-zinc-600 italic">Not published to any sites yet.</p>
        ) : (
          <div className="space-y-2">
            {product.publications.map((pub) => (
              <div key={pub.id} className="flex items-center gap-3 bg-zinc-800/50 rounded-xl px-4 py-3">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${STATUS_STYLES[pub.status] ?? 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>
                  {pub.status}
                </span>
                <span className="text-sm text-white">{pub.site.name}</span>
                <span className="text-xs text-zinc-600">{pub.site.domain}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Metadata footer */}
      <div className="text-xs text-zinc-700 flex gap-4">
        <span>Created: {new Date(product.createdAt).toLocaleDateString()}</span>
        <span>Updated: {new Date(product.updatedAt).toLocaleDateString()}</span>
        <span>Slug: {product.slug}</span>
        {product.ingestSource && <span>Source: {product.ingestSource}</span>}
      </div>

    </div>
  )
}
