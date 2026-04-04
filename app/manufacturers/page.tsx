'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Manufacturer = {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  active: boolean
  _count: { platforms: number; products: number }
}

export default function ManufacturersPage() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [loading, setLoading] = useState(true)
  const [editingLogo, setEditingLogo] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [saving, setSaving] = useState(false)

  function fetchAll() {
    fetch('/api/cms/manufacturers')
      .then(r => r.json())
      .then(data => setManufacturers(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])

  async function saveLogo(mfr: Manufacturer) {
    if (!logoUrl.trim()) return
    setSaving(true)
    try {
      // Process and store the logo image
      const res = await fetch('/api/cms/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manufacturerId: mfr.id,
          isLogo: true,
          images: [{ url: logoUrl.trim(), type: 'hero' }],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEditingLogo(null)
      setLogoUrl('')
      fetchAll()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save logo')
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Manufacturers</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Manage manufacturer logos and branding. Logos are used across all platform pages and product listings.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {manufacturers.map(mfr => (
          <div key={mfr.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div className="shrink-0">
                {mfr.logoUrl ? (
                  <div className="group relative">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800">
                      <img src={mfr.logoUrl} alt={mfr.name} className="w-full h-full object-contain p-1.5" />
                    </div>
                    <button
                      onClick={() => { setEditingLogo(mfr.id); setLogoUrl('') }}
                      className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-zinc-300"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingLogo(mfr.id); setLogoUrl('') }}
                    className="w-16 h-16 rounded-xl border-2 border-dashed border-zinc-700 hover:border-zinc-500 flex items-center justify-center text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    <span className="text-[10px] text-center leading-tight">Set<br/>Logo</span>
                  </button>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white">{mfr.name}</h3>
                <div className="flex gap-3 mt-1 text-xs text-zinc-500">
                  <span>{mfr._count.platforms} platform{mfr._count.platforms !== 1 ? 's' : ''}</span>
                  <span>{mfr._count.products} product{mfr._count.products !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            {/* Logo URL input */}
            {editingLogo === mfr.id && (
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <label className="block text-xs font-bold text-zinc-500 uppercase">Logo Image URL</label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  placeholder="https://www.manufacturer.com/logo.png"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-brand-blue"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') saveLogo(mfr) }}
                />
                <p className="text-[10px] text-zinc-600">
                  Paste a direct URL to the manufacturer logo. It will be downloaded, converted to webp, and stored in the CMS.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => saveLogo(mfr)}
                    disabled={saving || !logoUrl.trim()}
                    className="text-xs bg-brand-blue hover:bg-blue-500 disabled:opacity-50 text-white font-semibold px-4 py-1.5 rounded-lg transition-colors"
                  >
                    {saving ? 'Processing…' : 'Save Logo'}
                  </button>
                  <button
                    onClick={() => { setEditingLogo(null); setLogoUrl('') }}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-4 py-1.5 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {manufacturers.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-zinc-800 rounded-2xl">
          <p className="text-zinc-500">No manufacturers yet.</p>
          <Link href="/scan" className="text-brand-blue text-sm hover:text-blue-400 mt-2 inline-block transition-colors">
            Scan a manufacturer →
          </Link>
        </div>
      )}
    </div>
  )
}
