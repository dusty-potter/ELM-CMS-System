'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Product = {
  id: string
  name: string
  displayName: string | null
  slug: string
  tier: string | null
  status: 'draft' | 'approved' | 'published'
  confidenceLevel: string | null
  autoFilled: boolean
  manufacturer: { name: string }
  platform: { id: string; name: string }
  formFactors: { id: string; style: string; name: string; status: string }[]
  _count: { variants: number; publications: number }
}

const STATUS_STYLES: Record<string, string> = {
  published: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  approved:  'bg-blue-500/20   text-blue-400   border-blue-500/30',
  draft:     'bg-zinc-800      text-zinc-500   border-zinc-700',
}

const TIER_STYLES: Record<string, string> = {
  premium:   'bg-yellow-500/20 text-yellow-400',
  advanced:  'bg-blue-500/20   text-blue-400',
  standard:  'bg-zinc-700      text-zinc-300',
  essential: 'bg-zinc-800      text-zinc-400',
}

const CONFIDENCE_STYLES: Record<string, string> = {
  high:   'text-emerald-400',
  medium: 'text-yellow-400',
  low:    'text-red-400',
}

// Stable color for each manufacturer (based on name hash)
const MFR_COLORS = [
  'bg-blue-500',    'bg-emerald-500', 'bg-purple-500', 'bg-amber-500',
  'bg-rose-500',    'bg-cyan-500',    'bg-indigo-500',  'bg-orange-500',
  'bg-teal-500',    'bg-pink-500',
]

function mfrColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i)
  return MFR_COLORS[Math.abs(hash) % MFR_COLORS.length]
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterMfr, setFilterMfr] = useState<string>('all')

  useEffect(() => {
    fetch('/api/cms/products')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setProducts(data)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const manufacturers = Array.from(new Set(products.map((p) => p.manufacturer.name))).sort()

  const filtered = products.filter((p) => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false
    if (filterMfr !== 'all' && p.manufacturer.name !== filterMfr) return false
    if (search) {
      const q = search.toLowerCase()
      if (
        !p.name.toLowerCase().includes(q) &&
        !p.manufacturer.name.toLowerCase().includes(q) &&
        !p.platform.name.toLowerCase().includes(q)
      ) return false
    }
    return true
  })

  // Group filtered products by manufacturer, then by platform
  const grouped: Record<string, Record<string, Product[]>> = {}
  for (const p of filtered) {
    const mfr = p.manufacturer.name
    const plat = p.platform.name
    if (!grouped[mfr]) grouped[mfr] = {}
    if (!grouped[mfr][plat]) grouped[mfr][plat] = []
    grouped[mfr][plat].push(p)
  }

  const counts = {
    all: products.length,
    draft: products.filter((p) => p.status === 'draft').length,
    approved: products.filter((p) => p.status === 'approved').length,
    published: products.filter((p) => p.status === 'published').length,
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{products.length} total in CMS</p>
        </div>
        <Link
          href="/scan"
          className="bg-brand-blue hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          + Add Products
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white placeholder-zinc-600 focus:border-brand-blue outline-none transition-colors w-56"
        />
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          {(['all', 'draft', 'approved', 'published'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors ${
                filterStatus === s ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {s} ({counts[s]})
            </button>
          ))}
        </div>
        <select
          value={filterMfr}
          onChange={(e) => setFilterMfr(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brand-blue transition-colors"
        >
          <option value="all">All Manufacturers</option>
          {manufacturers.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-zinc-700 border-t-brand-blue rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-20 text-zinc-600">No products found.</div>
      )}

      {!loading && !error && Object.keys(grouped).length > 0 && (
        <div className="space-y-8">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([mfrName, platforms]) => {
            const color = mfrColor(mfrName)
            return (
              <div key={mfrName}>
                {/* Manufacturer header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-3 h-3 rounded-full ${color}`} />
                  <h2 className="text-lg font-bold text-white">{mfrName}</h2>
                  <span className="text-xs text-zinc-600">
                    {Object.values(platforms).flat().length} products
                  </span>
                </div>

                {/* Platforms within manufacturer */}
                <div className="space-y-4">
                  {Object.entries(platforms).map(([platName, prods]) => (
                    <div key={platName}>
                      {/* Platform sub-header */}
                      <div className="flex items-center gap-2 mb-2 ml-6">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{platName}</span>
                        <span className="text-[10px] text-zinc-700">{prods.length} tier{prods.length !== 1 ? 's' : ''}</span>
                      </div>

                      {/* Product rows */}
                      <div className="space-y-1.5">
                        {prods.map((p) => (
                          <Link
                            key={p.id}
                            href={`/products/${p.id}`}
                            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl px-5 py-3 flex items-center gap-4 transition-colors block"
                          >
                            {/* Manufacturer color bar */}
                            <div className={`w-1 h-10 rounded-full ${color} shrink-0`} />

                            {/* Status */}
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border shrink-0 ${STATUS_STYLES[p.status]}`}>
                              {p.status}
                            </span>

                            {/* Name + meta */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-white text-sm">{p.displayName || p.name}</span>
                                {p.tier && (
                                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${TIER_STYLES[p.tier] ?? ''}`}>
                                    {p.tier}
                                  </span>
                                )}
                                {p.autoFilled && (
                                  <span className="text-[10px] text-zinc-600 uppercase font-bold">AI</span>
                                )}
                                {p.confidenceLevel && (
                                  <span className={`text-[10px] font-bold uppercase ${CONFIDENCE_STYLES[p.confidenceLevel] ?? ''}`}>
                                    {p.confidenceLevel}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-600 mt-0.5">
                                {p.formFactors.length > 0 && (
                                  <>{p.formFactors.length} form factor{p.formFactors.length !== 1 ? 's' : ''}</>
                                )}
                                {p._count.variants > 0 && <> · {p._count.variants} variants</>}
                                {p._count.publications > 0 && <> · {p._count.publications} sites</>}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
