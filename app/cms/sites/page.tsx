'use client'

import { useEffect, useState } from 'react'

const MANUFACTURERS = [
  'Phonak', 'Oticon', 'Starkey', 'ReSound', 'Widex',
  'Signia', 'Unitron', 'Audibel', 'Beltone', 'Lenire',
]

type Site = {
  id: string
  name: string
  domain: string
  webhookUrl: string | null
  apiKey: string
  active: boolean
  githubRepo: string | null
  cloudRunService: string | null
  cloudRunRegion: string | null
  supportedManufacturers: { manufacturer: { name: string } }[]
  _count: { publications: number }
  createdAt: string
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors ml-1 shrink-0"
    >
      {copied ? '✓' : 'copy'}
    </button>
  )
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newSite, setNewSite] = useState({ name: '', domain: '', webhookUrl: '', githubRepo: '', cloudRunService: '', cloudRunRegion: 'us-central1', manufacturers: [] as string[] })

  function fetchSites() {
    setLoading(true)
    fetch('/api/cms/sites')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setSites(data)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchSites() }, [])

  function toggleMfr(m: string) {
    setNewSite((prev) => ({
      ...prev,
      manufacturers: prev.manufacturers.includes(m)
        ? prev.manufacturers.filter((x) => x !== m)
        : [...prev.manufacturers, m],
    }))
  }

  async function handleAdd() {
    if (!newSite.name || !newSite.domain) return
    setSaving(true)
    try {
      const res = await fetch('/api/cms/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSite.name,
          domain: newSite.domain,
          webhookUrl: newSite.webhookUrl || null,
          githubRepo: newSite.githubRepo || null,
          cloudRunService: newSite.cloudRunService || null,
          cloudRunRegion: newSite.cloudRunRegion || 'us-central1',
          manufacturerNames: newSite.manufacturers,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSites((prev) => [data, ...prev])
      setIsAdding(false)
      setNewSite({ name: '', domain: '', webhookUrl: '', githubRepo: '', cloudRunService: '', cloudRunRegion: 'us-central1', manufacturers: [] })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add site')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? All publication records for this site will also be removed.`)) return
    try {
      const res = await fetch('/api/cms/sites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSites((prev) => prev.filter((s) => s.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete site')
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Connected Sites</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Manage client websites that receive CMS content.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-brand-blue hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          + Add Site
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Add form */}
      {isAdding && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-white">Register New Site</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Site Name</label>
              <input
                type="text"
                placeholder="e.g. Hearing Center Seattle"
                value={newSite.name}
                onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Domain</label>
              <input
                type="text"
                placeholder="e.g. hearingseattle.com"
                value={newSite.domain}
                onChange={(e) => setNewSite({ ...newSite, domain: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Webhook URL <span className="text-zinc-700 normal-case font-normal">(optional)</span></label>
              <input
                type="url"
                placeholder="https://site.com/api/revalidate"
                value={newSite.webhookUrl}
                onChange={(e) => setNewSite({ ...newSite, webhookUrl: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">GitHub Repo <span className="text-zinc-700 normal-case font-normal">(optional)</span></label>
              <input
                type="text"
                placeholder="e.g. dusty-potter/client-site"
                value={newSite.githubRepo}
                onChange={(e) => setNewSite({ ...newSite, githubRepo: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Cloud Run Service <span className="text-zinc-700 normal-case font-normal">(optional)</span></label>
              <input
                type="text"
                placeholder="e.g. client-site-name"
                value={newSite.cloudRunService}
                onChange={(e) => setNewSite({ ...newSite, cloudRunService: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Cloud Run Region</label>
              <select
                value={newSite.cloudRunRegion}
                onChange={(e) => setNewSite({ ...newSite, cloudRunRegion: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors"
              >
                <option value="us-central1">us-central1</option>
                <option value="us-west1">us-west1</option>
                <option value="us-east1">us-east1</option>
                <option value="europe-west1">europe-west1</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-3">Supported Manufacturers</label>
              <div className="flex flex-wrap gap-2">
                {MANUFACTURERS.map((m) => (
                  <button
                    key={m}
                    onClick={() => toggleMfr(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      newSite.manufacturers.includes(m)
                        ? 'bg-brand-blue/10 border-brand-blue/50 text-brand-blue'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-600'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setIsAdding(false)} className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors px-4 py-2">
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !newSite.name || !newSite.domain}
              className="bg-white text-black font-bold text-sm px-6 py-2 rounded-xl hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving…' : 'Save Site'}
            </button>
          </div>
        </div>
      )}

      {/* Site list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-zinc-700 border-t-brand-blue rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sites.length === 0 ? (
            <div className="md:col-span-2 text-center py-20 text-zinc-600">No sites registered yet.</div>
          ) : (
            sites.map((site) => (
              <div key={site.id} className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-6 space-y-4 group transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-white">{site.name}</h3>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${site.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                        {site.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">{site.domain}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">{site._count.publications} products published</p>
                  </div>
                  <button
                    onClick={() => handleDelete(site.id, site.name)}
                    className="text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    title="Delete site"
                  >
                    ✕
                  </button>
                </div>

                {/* Manufacturers */}
                {site.supportedManufacturers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {site.supportedManufacturers.map(({ manufacturer: m }) => (
                      <span key={m.name} className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-bold uppercase">
                        {m.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* API Key + Webhook + Deployment */}
                <div className="space-y-2">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase mb-1">API Key</p>
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-zinc-400 font-mono truncate">{site.apiKey}</p>
                      <CopyButton value={site.apiKey} />
                    </div>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase mb-1">Webhook URL</p>
                    <p className="text-xs text-zinc-400 truncate">{site.webhookUrl || 'Not configured'}</p>
                  </div>
                  {site.githubRepo && (
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] font-bold text-zinc-600 uppercase mb-1">GitHub Repo</p>
                      <a
                        href={`https://github.com/${site.githubRepo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-blue hover:underline font-mono truncate block"
                      >
                        {site.githubRepo}
                      </a>
                    </div>
                  )}
                  {site.cloudRunService && (
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] font-bold text-zinc-600 uppercase mb-1">Cloud Run</p>
                      <p className="text-xs text-zinc-400 font-mono">{site.cloudRunService} <span className="text-zinc-600">({site.cloudRunRegion})</span></p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
