import type { IntakeData } from '../page'

type Props = {
  data: IntakeData
  updateData: (partial: Partial<IntakeData>) => void
}

const LOGO_OPTIONS = ['Have logo file', 'Need logo designed', 'Using text only']
const TONE_OPTIONS = ['Professional', 'Warm', 'Clinical', 'Friendly', 'Authoritative', 'Modern']

function isValidHex(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color)
}

export default function Section5BrandStyle({ data, updateData }: Props) {
  function toggleTone(tone: string) {
    if (data.brandTone.includes(tone)) {
      updateData({ brandTone: data.brandTone.filter((t) => t !== tone) })
    } else {
      updateData({ brandTone: [...data.brandTone, tone] })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Brand & Style</h2>
        <p className="text-sm text-zinc-500">
          Visual identity and tone direction for the new site.
        </p>
      </div>

      {/* Primary Brand Color */}
      <div>
        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
          Primary Brand Color
        </label>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={data.primaryBrandColor}
            onChange={(e) => updateData({ primaryBrandColor: e.target.value })}
            placeholder="#3B82F6"
            maxLength={7}
            className="w-40 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm font-mono focus:border-brand-blue outline-none transition-colors"
          />
          <div
            className="w-10 h-10 rounded-lg border border-zinc-700"
            style={{
              backgroundColor: isValidHex(data.primaryBrandColor)
                ? data.primaryBrandColor
                : '#27272a',
            }}
          />
          {data.primaryBrandColor && !isValidHex(data.primaryBrandColor) && (
            <span className="text-xs text-amber-400">Enter a valid hex (e.g. #3B82F6)</span>
          )}
        </div>
      </div>

      {/* Logo Status */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-zinc-500 uppercase">Logo Status</label>
        <div className="flex flex-wrap gap-2">
          {LOGO_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => updateData({ logoStatus: opt })}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                data.logoStatus === opt
                  ? 'bg-brand-blue text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Photography Available */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-zinc-500 uppercase">
          Photography Available
        </label>
        <div className="flex gap-2">
          {[true, false].map((val) => (
            <button
              key={String(val)}
              onClick={() => updateData({ photographyAvailable: val })}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                data.photographyAvailable === val
                  ? 'bg-brand-blue text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {val ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </div>

      {/* Brand Tone */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-zinc-500 uppercase">
          Brand Tone <span className="text-zinc-600 normal-case font-normal">(select all that apply)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {TONE_OPTIONS.map((tone) => {
            const selected = data.brandTone.includes(tone)
            return (
              <button
                key={tone}
                onClick={() => toggleTone(tone)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  selected
                    ? 'bg-brand-blue text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {tone}
              </button>
            )
          })}
        </div>
      </div>

      {/* Style Notes */}
      <div>
        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
          Style Notes
        </label>
        <textarea
          value={data.styleNotes}
          onChange={(e) => updateData({ styleNotes: e.target.value })}
          placeholder="Any visual preferences, reference sites, design direction notes..."
          rows={4}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors resize-y"
        />
      </div>
    </div>
  )
}
