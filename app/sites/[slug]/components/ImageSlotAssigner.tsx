'use client'

import { useState } from 'react'
import { getAllSlots, classificationToSlotPrefixes } from '@/lib/pipeline/asset-slots'
import type { TeamMember, Location } from '@/lib/pipeline/types'

type ClientImage = {
  id: string
  sourceUrl: string
  localUrl: string | null
  variantThumbnail: string | null
  classification: string
  altText: string | null
  imported: boolean
  slot: string | null
}

export default function ImageSlotAssigner({
  slug,
  images,
  teamMembers,
  locations,
  onRefresh,
}: {
  slug: string
  images: ClientImage[]
  teamMembers: TeamMember[]
  locations: Location[]
  onRefresh: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    images.forEach((img) => {
      if (img.slot) initial[img.id] = img.slot
    })
    return initial
  })

  const allSlots = getAllSlots(teamMembers, locations)
  const importedImages = images.filter((i) => i.imported)

  function getFilteredSlots(classification: string) {
    const prefixes = classificationToSlotPrefixes(classification)
    if (prefixes.length === 0) return allSlots
    return allSlots.filter((s) => prefixes.some((p) => s.slot.startsWith(p)))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const assignmentList = Object.entries(assignments).map(([imageId, slot]) => ({
        imageId,
        slot,
      }))

      await fetch(`/api/sites/${slug}/images`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments: assignmentList }),
      })

      onRefresh()
    } catch {
      // Handle silently
    } finally {
      setSaving(false)
    }
  }

  if (importedImages.length === 0) return null

  const hasChanges = importedImages.some((img) => {
    const current = assignments[img.id] || ''
    const saved = img.slot || ''
    return current !== saved
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Assign Images to Slots</h3>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg hover:bg-emerald-500/30 transition-colors font-semibold"
          >
            {saving ? 'Saving...' : 'Save Assignments'}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {importedImages.map((img) => {
          const filteredSlots = getFilteredSlots(img.classification)
          const currentSlot = assignments[img.id] || ''

          return (
            <div
              key={img.id}
              className="flex items-center gap-3 bg-zinc-800 rounded-xl px-3 py-2"
            >
              {/* Thumbnail */}
              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-zinc-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.variantThumbnail || img.localUrl || img.sourceUrl}
                  alt={img.altText || ''}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-300 truncate">
                  {img.altText || img.classification}
                </p>
              </div>

              {/* Slot dropdown */}
              <select
                value={currentSlot}
                onChange={(e) =>
                  setAssignments((prev) => ({ ...prev, [img.id]: e.target.value }))
                }
                className="text-xs bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-zinc-300 focus:border-brand-blue outline-none max-w-[200px]"
              >
                <option value="">Unassigned</option>
                {filteredSlots.length < allSlots.length && (
                  <optgroup label="Suggested">
                    {filteredSlots.map((s) => (
                      <option key={s.slot} value={s.slot}>
                        {s.label}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label={filteredSlots.length < allSlots.length ? 'All Slots' : 'Available Slots'}>
                  {allSlots
                    .filter((s) => !filteredSlots.includes(s) || filteredSlots.length === allSlots.length)
                    .map((s) => (
                      <option key={s.slot} value={s.slot}>
                        {s.category}: {s.label}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
          )
        })}
      </div>
    </div>
  )
}
