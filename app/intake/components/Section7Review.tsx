import { useMemo } from 'react'
import type { IntakeData } from '../page'

type Props = {
  data: IntakeData
  launching: boolean
  onLaunch: () => void
}

type CtaRecommendation = { type: string; rationale: string; warning?: string }

function deriveCtaRecommendation(data: IntakeData): CtaRecommendation | null {
  if (!data.phoneReliability && !data.schedulingMethod) return null
  if (data.phoneReliability === 'Strong') {
    return { type: 'Call', rationale: 'Phone is a reliable primary channel for this practice.' }
  }
  if (data.schedulingMethod === 'Embedded booking widget') {
    return { type: 'Book', rationale: 'Embedded booking widget available — direct online scheduling.' }
  }
  if (data.schedulingMethod === 'External booking URL') {
    return { type: 'Book', rationale: 'External booking system available.' }
  }
  if (data.phoneReliability === 'Weak' && data.schedulingMethod === 'Contact form only') {
    return {
      type: 'Form',
      rationale: 'No reliable phone or booking system.',
      warning: 'Form-primary requires confirmed automated callback/SMS trigger. Confirm before launch.',
    }
  }
  return { type: 'Form', rationale: 'Defaulting to form based on available data.' }
}

function SummaryField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <span className="text-xs font-bold text-zinc-500 uppercase">{label}</span>
      <p className="text-sm text-zinc-300 mt-0.5 whitespace-pre-wrap">{value}</p>
    </div>
  )
}

function SummaryList({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div>
      <span className="text-xs font-bold text-zinc-500 uppercase">{label}</span>
      <div className="flex flex-wrap gap-1 mt-1">
        {items.map((item) => (
          <span key={item} className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-300">
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function Section7Review({ data, launching, onLaunch }: Props) {
  const ctaRec = useMemo(() => deriveCtaRecommendation(data), [
    data.phoneReliability,
    data.schedulingMethod,
  ])

  const requiredMissing: string[] = []
  if (!data.businessName.trim()) requiredMissing.push('Business Name')
  if (!data.domain.trim()) requiredMissing.push('Domain')
  if (!data.practiceType) requiredMissing.push('Practice Type')

  const hasRisks = data.clientOverrides.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Review & Launch</h2>
        <p className="text-sm text-zinc-500">
          Review all intake data before launching the pipeline.
        </p>
      </div>

      {/* Required field warnings */}
      {requiredMissing.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <p className="text-sm text-red-400 font-semibold">Missing required fields:</p>
          <ul className="list-disc list-inside text-sm text-red-400/80 mt-1">
            {requiredMissing.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Section 1 — Business Info */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">Business Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SummaryField label="Business Name" value={data.businessName} />
          <SummaryField label="Domain" value={data.domain} />
          <SummaryField label="Practice Type" value={data.practiceType} />
          <SummaryField label="Main Phone" value={data.primaryPhone} />
          <SummaryField label="Service Area" value={data.serviceArea} />
          <SummaryField label="Credentials" value={data.credentials} />
        </div>
        <SummaryField label="Primary Services" value={data.primaryServices} />
        {data.locations.length > 0 && (
          <div>
            <span className="text-xs font-bold text-zinc-500 uppercase">Locations</span>
            <div className="mt-1 space-y-1">
              {data.locations.map((loc, i) => (
                <p key={i} className="text-sm text-zinc-300">
                  {loc.name}{loc.phone ? ` — ${loc.phone}` : ''}{loc.city ? `, ${loc.city}` : ''}{loc.state ? ` ${loc.state}` : ''}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 2 — Team & Products */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">Team & Products</h3>
        {data.teamMembers.length > 0 && (
          <div>
            <span className="text-xs font-bold text-zinc-500 uppercase">Team Members</span>
            <div className="mt-1 space-y-1">
              {data.teamMembers.map((m, i) => (
                <p key={i} className="text-sm text-zinc-300">
                  {m.name}{m.title ? ` — ${m.title}` : ''}{m.credentials ? ` (${m.credentials})` : ''}
                </p>
              ))}
            </div>
          </div>
        )}
        <SummaryList label="Manufacturers Carried" items={data.manufacturersCarried} />
        <SummaryList label="Featured Manufacturers" items={data.featuredManufacturers} />
      </div>

      {/* Section 3 — Operational Fit */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">Operational Fit</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SummaryField label="Phone Reliability" value={data.phoneReliability} />
          <SummaryField
            label="After-hours Coverage"
            value={data.afterHoursCoverage === null ? null : data.afterHoursCoverage ? 'Yes' : 'No'}
          />
          <SummaryField label="Scheduling Method" value={data.schedulingMethod} />
          <SummaryField label="Booking System" value={data.bookingSystemName} />
          <SummaryField label="Lead Notification" value={data.leadNotificationMethod} />
          <SummaryField label="Follow-up Speed" value={data.followUpSpeedEstimate} />
        </div>
      </div>

      {/* CTA Recommendation */}
      {ctaRec && (
        <div
          className={`rounded-xl border p-4 space-y-2 ${
            ctaRec.warning
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-emerald-500/10 border-emerald-500/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold uppercase ${
                ctaRec.warning ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              CTA Recommendation
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold ${
                ctaRec.warning
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {ctaRec.type}
            </span>
          </div>
          <p className={`text-sm ${ctaRec.warning ? 'text-amber-300/80' : 'text-emerald-300/80'}`}>
            {ctaRec.rationale}
          </p>
          {ctaRec.warning && (
            <p className="text-sm font-semibold text-amber-400">{ctaRec.warning}</p>
          )}
        </div>
      )}

      {/* Section 4 — Current Site */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">Current Site</h3>
        <SummaryField label="Existing URL" value={data.existingUrl} />
        <SummaryField label="Key Pages" value={data.keyPages} />
        <SummaryField label="Current CTA Pattern" value={data.currentCtaPattern} />
        <SummaryField label="Content to Keep" value={data.contentToKeep} />
        <SummaryField label="Content to Remove" value={data.contentToRemove} />
        <SummaryField label="Missing Content" value={data.missingContent} />
      </div>

      {/* Section 5 — Brand & Style */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">Brand & Style</h3>
        <div className="flex items-center gap-3">
          <SummaryField label="Primary Color" value={data.primaryBrandColor} />
          {/^#[0-9A-Fa-f]{6}$/.test(data.primaryBrandColor) && (
            <div
              className="w-6 h-6 rounded border border-zinc-700 mt-3"
              style={{ backgroundColor: data.primaryBrandColor }}
            />
          )}
        </div>
        <SummaryField label="Logo Status" value={data.logoStatus} />
        <SummaryField
          label="Photography"
          value={data.photographyAvailable === null ? null : data.photographyAvailable ? 'Available' : 'Not available'}
        />
        <SummaryList label="Brand Tone" items={data.brandTone} />
        <SummaryField label="Style Notes" value={data.styleNotes} />
      </div>

      {/* Section 6 — Risks */}
      {(hasRisks || data.sensitivities || data.requiredElements) && (
        <div
          className={`rounded-xl border p-4 space-y-3 ${
            hasRisks
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-zinc-900 border-zinc-800'
          }`}
        >
          <h3 className={`text-sm font-bold ${hasRisks ? 'text-amber-400' : 'text-white'}`}>
            Risks & Overrides
          </h3>
          <SummaryList label="Client Overrides" items={data.clientOverrides} />
          <SummaryField label="Sensitivities" value={data.sensitivities} />
          <SummaryField label="Required Elements" value={data.requiredElements} />
        </div>
      )}

      {/* Launch Button */}
      <div className="pt-4 border-t border-zinc-800">
        <button
          onClick={onLaunch}
          disabled={launching || requiredMissing.length > 0}
          className="w-full bg-brand-blue hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-colors text-base"
        >
          {launching ? (
            <span className="flex items-center justify-center gap-3">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Launching Pipeline...
            </span>
          ) : (
            'Launch Pipeline'
          )}
        </button>
        {requiredMissing.length > 0 && (
          <p className="text-xs text-zinc-500 text-center mt-2">
            Complete required fields in Sections 1-3 to enable launch.
          </p>
        )}
      </div>
    </div>
  )
}
