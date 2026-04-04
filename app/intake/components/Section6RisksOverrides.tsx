import type { IntakeData } from '../page'

type Props = {
  data: IntakeData
  updateData: (partial: Partial<IntakeData>) => void
}

const OVERRIDE_OPTIONS = [
  'Wants multiple phone numbers in header',
  'Insists on badge clutter',
  'Requests paragraph blocks in hero',
  'Wants equal-weight CTAs',
  'Other',
]

export default function Section6RisksOverrides({ data, updateData }: Props) {
  function toggleOverride(override: string) {
    if (data.clientOverrides.includes(override)) {
      updateData({ clientOverrides: data.clientOverrides.filter((o) => o !== override) })
    } else {
      updateData({ clientOverrides: [...data.clientOverrides, override] })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Risks & Overrides</h2>
        <p className="text-sm text-zinc-500">
          Client-requested deviations from best practices and known sensitivities. Flag anything
          that could hurt site performance or conversion.
        </p>
      </div>

      {/* Override Patterns */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-zinc-500 uppercase">
          Client Override Patterns
        </label>
        <div className="space-y-2">
          {OVERRIDE_OPTIONS.map((opt) => {
            const checked = data.clientOverrides.includes(opt)
            return (
              <label
                key={opt}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors ${
                  checked
                    ? 'bg-amber-500/10 border border-amber-500/30'
                    : 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleOverride(opt)}
                  className="w-4 h-4 rounded border-zinc-600 text-brand-blue focus:ring-brand-blue bg-zinc-800"
                />
                <span className={`text-sm ${checked ? 'text-amber-300' : 'text-zinc-400'}`}>
                  {opt}
                </span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Sensitivities */}
      <div>
        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
          Sensitivities
        </label>
        <textarea
          value={data.sensitivities}
          onChange={(e) => updateData({ sensitivities: e.target.value })}
          placeholder="Topics to avoid, competitor mentions, past negative experiences, legal concerns..."
          rows={4}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors resize-y"
        />
      </div>

      {/* Required Elements */}
      <div>
        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
          Required Elements
        </label>
        <textarea
          value={data.requiredElements}
          onChange={(e) => updateData({ requiredElements: e.target.value })}
          placeholder="Must-have elements: specific badges, awards, accreditation logos, compliance text..."
          rows={4}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors resize-y"
        />
      </div>
    </div>
  )
}
