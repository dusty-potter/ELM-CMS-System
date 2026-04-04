import { useState } from 'react'
import type { IntakeData } from '../page'

type Props = {
  data: IntakeData
  updateData: (partial: Partial<IntakeData>) => void
  onNext: () => void
}

export default function Section0SiteScan({ data, updateData, onNext }: Props) {
  const [url, setUrl] = useState(data.scannedUrl ?? '')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleScan() {
    if (!url.trim()) return
    setScanning(true)
    setError(null)

    try {
      const res = await fetch('/api/intake/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Scan failed')
        return
      }

      // Pre-fill from scan results
      updateData({
        scannedUrl: url.trim(),
        businessName: json.businessName ?? data.businessName,
        domain: json.domain ?? data.domain,
        practiceType: json.practiceType ?? data.practiceType,
        numberOfLocations: json.numberOfLocations ?? data.numberOfLocations,
        serviceArea: json.serviceArea ?? data.serviceArea,
        primaryServices: json.primaryServices ?? data.primaryServices,
        credentials: json.credentials ?? data.credentials,
        teamMembers: json.teamMembers?.length ? json.teamMembers : data.teamMembers,
        manufacturersCarried: json.manufacturersCarried?.length
          ? json.manufacturersCarried
          : data.manufacturersCarried,
        existingUrl: json.existingUrl ?? url.trim(),
        keyPages: json.keyPages ?? data.keyPages,
        currentCtaPattern: json.currentCtaPattern ?? data.currentCtaPattern,
        contentToKeep: json.contentToKeep ?? data.contentToKeep,
        contentToRemove: json.contentToRemove ?? data.contentToRemove,
        missingContent: json.missingContent ?? data.missingContent,
        primaryBrandColor: json.primaryBrandColor ?? data.primaryBrandColor,
        brandTone: json.brandTone?.length ? json.brandTone : data.brandTone,
        styleNotes: json.styleNotes ?? data.styleNotes,
      })
      onNext()
    } catch {
      setError('Network error — scan could not be completed')
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Site Scan</h2>
        <p className="text-sm text-zinc-500">
          Enter the client&apos;s existing website URL. The AI will scan it and pre-fill the intake
          form. All pre-filled fields remain editable.
        </p>
      </div>

      <div>
        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
          Existing Website URL
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example-hearing.com"
          disabled={scanning}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors disabled:opacity-50"
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {scanning && (
        <div className="flex items-center gap-3 text-zinc-400 text-sm">
          <div className="w-5 h-5 border-2 border-zinc-700 border-t-brand-blue rounded-full animate-spin" />
          Scanning website and researching business...
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleScan}
          disabled={scanning || !url.trim()}
          className="bg-brand-blue hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          {scanning ? 'Scanning...' : 'Scan Site'}
        </button>
        <button
          onClick={onNext}
          disabled={scanning}
          className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          Skip Scan
        </button>
      </div>
    </div>
  )
}
