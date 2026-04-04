import type { IntakeData } from '../page'

type Props = {
  data: IntakeData
  updateData: (partial: Partial<IntakeData>) => void
}

export default function Section4CurrentSite({ data, updateData }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Current Site</h2>
        <p className="text-sm text-zinc-500">
          Details about the client&apos;s existing website — what to keep, what to cut, and
          what&apos;s missing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
            Existing URL
          </label>
          <input
            type="url"
            value={data.existingUrl}
            onChange={(e) => updateData({ existingUrl: e.target.value })}
            placeholder="https://..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
            Current CTA Pattern
          </label>
          <input
            type="text"
            value={data.currentCtaPattern}
            onChange={(e) => updateData({ currentCtaPattern: e.target.value })}
            placeholder='e.g. "Call Now" button in header, contact form on every page'
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
          Key Pages
        </label>
        <textarea
          value={data.keyPages}
          onChange={(e) => updateData({ keyPages: e.target.value })}
          placeholder="List existing pages: Home, About, Services, Hearing Aids, Contact, Blog..."
          rows={3}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors resize-y"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
          Content to Keep
        </label>
        <textarea
          value={data.contentToKeep}
          onChange={(e) => updateData({ contentToKeep: e.target.value })}
          placeholder="Good copy, testimonials, specific page content worth preserving..."
          rows={3}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors resize-y"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
          Content to Remove
        </label>
        <textarea
          value={data.contentToRemove}
          onChange={(e) => updateData({ contentToRemove: e.target.value })}
          placeholder="Outdated info, broken pages, bad stock photos, irrelevant content..."
          rows={3}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors resize-y"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
          Missing Content
        </label>
        <textarea
          value={data.missingContent}
          onChange={(e) => updateData({ missingContent: e.target.value })}
          placeholder="No hearing aid brand pages, no team bios, no service area pages, missing reviews..."
          rows={3}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors resize-y"
        />
      </div>
    </div>
  )
}
