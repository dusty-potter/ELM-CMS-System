'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Platform = {
  id: string
  name: string
  displayName: string | null
  slug: string
  generationYear: number | null
  status: string
  isLegacy: boolean
  autoFilled: boolean
  confidenceLevel: string | null
  manufacturer: { name: string }
  _count: { products: number; formFactors: number; fittingOptions: number }
}

const STATUS_STYLES: Record<string, string> = {
  published: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  approved:  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  draft:     'bg-zinc-800 text-zinc-500 border-zinc-700',
}

export default function PlatformsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/cms/platforms')
      .then(r => r.json())
      .then(data => setPlatforms(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="w-8 h-8 border-4 border-zinc-700 border-t-brand-blue rounded-full animate-spin" />
      </div>
    )
  }

  const active = platforms.filter(p => !p.isLegacy)
  const legacy = platforms.filter(p => p.isLegacy)

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Platforms</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Product families grouped by technology generation.
        </p>
      </div>

      {platforms.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-zinc-800 rounded-2xl">
          <p className="text-zinc-500">No platforms yet.</p>
          <Link href="/scan" className="text-brand-blue text-sm hover:text-blue-400 mt-2 inline-block transition-colors">
            Scan a manufacturer →
          </Link>
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-3">
          {active.map(p => (
            <Link
              key={p.id}
              href={`/platforms/${p.id}`}
              className="block bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-white">{p.manufacturer.name} {p.displayName || p.name}</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${STATUS_STYLES[p.status]}`}>
                  {p.status}
                </span>
                {p.generationYear && <span className="text-xs text-zinc-600">{p.generationYear}</span>}
              </div>
              <div className="flex gap-4 mt-1 text-xs text-zinc-500">
                <span>{p._count.products} tiers</span>
                <span>{p._count.formFactors} form factors</span>
                {p._count.fittingOptions > 0 && <span>{p._count.fittingOptions} fitting options</span>}
                {p.confidenceLevel && <span>{p.confidenceLevel} confidence</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {legacy.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-zinc-600 uppercase tracking-wider mb-3">Legacy Platforms</h2>
          <div className="space-y-2">
            {legacy.map(p => (
              <Link
                key={p.id}
                href={`/platforms/${p.id}`}
                className="block bg-zinc-900/50 border border-zinc-800 rounded-2xl px-6 py-3 opacity-60 hover:opacity-80 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-white">{p.manufacturer.name} {p.displayName || p.name}</span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-700 text-zinc-400 border border-zinc-600">
                    Legacy
                  </span>
                  {p.generationYear && <span className="text-xs text-zinc-600">{p.generationYear}</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
