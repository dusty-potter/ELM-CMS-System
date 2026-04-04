'use client'

import { useState } from 'react'

type CandidateImage = {
  url: string
  type: 'hero' | 'gallery'
  description?: string
  formFactorName?: string
  status: 'pending' | 'approved' | 'rejected'
}

interface ImageApprovalProps {
  images: CandidateImage[]
  onChange: (images: CandidateImage[]) => void
}

export function ImageApproval({ images, onChange }: ImageApprovalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(new Set())

  const pending = images.filter(i => i.status === 'pending')
  const approved = images.filter(i => i.status === 'approved')
  const rejected = images.filter(i => i.status === 'rejected')

  function setStatus(url: string, status: CandidateImage['status']) {
    onChange(images.map(i => i.url === url ? { ...i, status } : i))
  }

  function approveAll() {
    onChange(images.map(i => i.status === 'pending' && !brokenUrls.has(i.url) ? { ...i, status: 'approved' } : i))
  }

  function rejectAll() {
    onChange(images.map(i => i.status === 'pending' ? { ...i, status: 'rejected' } : i))
  }

  function handleBroken(url: string) {
    setBrokenUrls(prev => new Set(prev).add(url))
  }

  if (images.length === 0) return null

  return (
    <div className="space-y-4">
      {/* Approved */}
      {approved.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-2">
            Approved ({approved.length})
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {approved.map(img => (
              <div key={img.url} className="relative group rounded-lg overflow-hidden border border-emerald-500/30 bg-zinc-950">
                <div className="aspect-square">
                  <img
                    src={img.url}
                    alt={img.description ?? ''}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={() => handleBroken(img.url)}
                  />
                </div>
                <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-[8px]">✓</span>
                </div>
                {img.formFactorName && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
                    <span className="text-[8px] text-zinc-300 truncate block">{img.formFactorName}</span>
                  </div>
                )}
                <button
                  onClick={() => setStatus(img.url, 'pending')}
                  className="absolute top-0.5 left-0.5 w-4 h-4 bg-zinc-800/80 rounded-full text-zinc-400 text-[8px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  ↩
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
              Review ({pending.length})
            </span>
            <div className="flex gap-2">
              <button onClick={approveAll} className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors">
                Approve all
              </button>
              <button onClick={rejectAll} className="text-[10px] text-red-400 hover:text-red-300 transition-colors">
                Reject all
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {pending.map(img => {
              const isBroken = brokenUrls.has(img.url)
              return (
                <div key={img.url} className="relative group rounded-lg overflow-hidden border border-zinc-700 bg-zinc-950 hover:border-zinc-600 transition-colors">
                  <div className="aspect-square">
                    {isBroken ? (
                      <div className="w-full h-full flex items-center justify-center text-zinc-700 text-[10px]">
                        Unavailable
                      </div>
                    ) : (
                      <img
                        src={img.url}
                        alt={img.description ?? ''}
                        className="w-full h-full object-cover cursor-pointer"
                        referrerPolicy="no-referrer"
                        onClick={() => setPreviewUrl(img.url)}
                        onError={() => handleBroken(img.url)}
                      />
                    )}
                  </div>
                  {img.formFactorName && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
                      <span className="text-[8px] text-zinc-300 truncate block">{img.formFactorName}</span>
                    </div>
                  )}
                  {/* Action buttons */}
                  <div className="absolute top-0 left-0 right-0 flex justify-between p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isBroken && (
                      <button
                        onClick={() => setStatus(img.url, 'approved')}
                        className="w-5 h-5 bg-emerald-500/90 hover:bg-emerald-500 rounded-full text-white text-[10px] flex items-center justify-center transition-colors"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      onClick={() => setStatus(img.url, 'rejected')}
                      className="w-5 h-5 bg-red-500/70 hover:bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center ml-auto transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Rejected (collapsed) */}
      {rejected.length > 0 && (
        <details>
          <summary className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider cursor-pointer hover:text-zinc-400 transition-colors">
            Rejected ({rejected.length})
          </summary>
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-1 mt-2">
            {rejected.map(img => (
              <div key={img.url} className="relative group rounded overflow-hidden opacity-40 hover:opacity-60 transition-opacity">
                <div className="aspect-square bg-zinc-950">
                  {brokenUrls.has(img.url) ? (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700 text-[8px]">✕</div>
                  ) : (
                    <img
                      src={img.url} alt="" className="w-full h-full object-cover grayscale"
                      referrerPolicy="no-referrer" onError={() => handleBroken(img.url)}
                    />
                  )}
                </div>
                <button
                  onClick={() => setStatus(img.url, 'pending')}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-300 text-[9px]"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Preview modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8 cursor-pointer"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-4xl max-h-full" onClick={e => e.stopPropagation()}>
            <img
              src={previewUrl} alt="Preview"
              className="max-w-full max-h-[80vh] object-contain rounded-xl"
              referrerPolicy="no-referrer"
            />
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full text-white flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export type { CandidateImage }
