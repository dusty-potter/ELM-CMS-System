'use client'

import { useState } from 'react'

type ClientImage = {
  id: string
  sourceUrl: string
  localUrl: string | null
  variantThumbnail: string | null
  classification: string
  confidence: number | null
  altText: string | null
  imported: boolean
  slot: string | null
}

const CLASS_STYLES: Record<string, string> = {
  provider_headshot: 'bg-blue-500/20 text-blue-400',
  staff_headshot: 'bg-blue-500/20 text-blue-400',
  team_group: 'bg-blue-500/20 text-blue-400',
  location_exterior: 'bg-emerald-500/20 text-emerald-400',
  location_interior: 'bg-emerald-500/20 text-emerald-400',
  lifestyle: 'bg-purple-500/20 text-purple-400',
  logo: 'bg-yellow-500/20 text-yellow-400',
  hero: 'bg-orange-500/20 text-orange-400',
  service: 'bg-zinc-700 text-zinc-300',
  other: 'bg-zinc-800 text-zinc-500',
}

const CLASS_LABELS: Record<string, string> = {
  provider_headshot: 'Provider',
  staff_headshot: 'Staff',
  team_group: 'Team Group',
  location_exterior: 'Exterior',
  location_interior: 'Interior',
  lifestyle: 'Lifestyle',
  logo: 'Logo',
  hero: 'Hero',
  service: 'Service',
  other: 'Other',
}

export default function ImageScanPanel({
  slug,
  images,
  onRefresh,
}: {
  slug: string
  images: ClientImage[]
  onRefresh: () => void
}) {
  const [scanning, setScanning] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  async function handleScan() {
    setScanning(true)
    setError(null)
    try {
      const res = await fetch(`/api/sites/${slug}/scan-images`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Scan failed')
      }
      onRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  async function handleImport() {
    if (selected.size === 0) return
    setImporting(true)
    setError(null)
    try {
      const res = await fetch(`/api/sites/${slug}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds: Array.from(selected) }),
      })
      if (!res.ok) throw new Error('Import failed')
      setSelected(new Set())
      onRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    const unimported = images.filter((i) => !i.imported).map((i) => i.id)
    setSelected(new Set(unimported))
  }

  const unimported = images.filter((i) => !i.imported)
  const imported = images.filter((i) => i.imported)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Client Images</h3>
        <div className="flex gap-2">
          {unimported.length > 0 && (
            <button
              onClick={selectAll}
              className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              Select All ({unimported.length})
            </button>
          )}
          <button
            onClick={handleScan}
            disabled={scanning}
            className="text-xs bg-brand-blue hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors font-semibold"
          >
            {scanning ? 'Scanning...' : images.length > 0 ? 'Re-scan' : 'Scan for Images'}
          </button>
        </div>
      </div>

      {scanning && (
        <div className="flex items-center gap-3 text-zinc-400 text-sm py-4">
          <div className="w-5 h-5 border-2 border-zinc-700 border-t-brand-blue rounded-full animate-spin" />
          Scanning website for images...
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Unimported images */}
      {unimported.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500">Discovered — select to import:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {unimported.map((img) => (
              <label
                key={img.id}
                className={`relative cursor-pointer rounded-xl border overflow-hidden transition-colors ${
                  selected.has(img.id)
                    ? 'border-brand-blue bg-brand-blue/5'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(img.id)}
                  onChange={() => toggleSelect(img.id)}
                  className="absolute top-2 left-2 z-10 w-4 h-4"
                />
                <div className="aspect-square bg-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.sourceUrl}
                    alt={img.altText || ''}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
                <div className="p-2 space-y-1">
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${CLASS_STYLES[img.classification] || CLASS_STYLES.other}`}>
                    {CLASS_LABELS[img.classification] || img.classification}
                  </span>
                  {img.altText && (
                    <p className="text-[10px] text-zinc-500 line-clamp-2">{img.altText}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
          {selected.size > 0 && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="bg-brand-blue hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2 px-6 rounded-xl transition-colors text-sm"
            >
              {importing ? 'Importing...' : `Import ${selected.size} Selected`}
            </button>
          )}
        </div>
      )}

      {/* Imported images */}
      {imported.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500">Imported ({imported.length}):</p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {imported.map((img) => (
              <div key={img.id} className="rounded-lg border border-zinc-800 overflow-hidden">
                <div className="aspect-square bg-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.variantThumbnail || img.localUrl || img.sourceUrl}
                    alt={img.altText || ''}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="px-1.5 py-1">
                  <span className={`text-[8px] font-bold uppercase px-1 py-0.5 rounded ${CLASS_STYLES[img.classification] || CLASS_STYLES.other}`}>
                    {CLASS_LABELS[img.classification] || img.classification}
                  </span>
                  {img.slot && (
                    <p className="text-[9px] text-emerald-400 mt-0.5 truncate">{img.slot}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {images.length === 0 && !scanning && (
        <p className="text-sm text-zinc-600 italic py-4">
          No images scanned yet. Click &quot;Scan for Images&quot; to discover images from the client&apos;s website.
        </p>
      )}
    </div>
  )
}
