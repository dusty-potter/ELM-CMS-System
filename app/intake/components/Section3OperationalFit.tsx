import { useMemo } from 'react'
import type { IntakeData } from '../page'

type Props = {
  data: IntakeData
  updateData: (partial: Partial<IntakeData>) => void
}

const PHONE_OPTIONS = ['Weak', 'Inconsistent', 'Strong'] as const
const SCHEDULING_OPTIONS = [
  'Embedded booking widget',
  'External booking URL',
  'Contact form only',
] as const

type CtaRecommendation = { type: string; rationale: string; warning?: string }

function deriveCtaRecommendation(data: IntakeData): CtaRecommendation | null {
  if (!data.phoneReliability && !data.schedulingMethod) return null

  if (data.phoneReliability === 'Strong') {
    return { type: 'Call', rationale: 'Phone is a reliable primary channel for this practice.' }
  }

  if (data.schedulingMethod === 'Embedded booking widget') {
    return {
      type: 'Book',
      rationale: 'Embedded booking widget available — direct online scheduling is the strongest conversion path.',
    }
  }

  if (data.schedulingMethod === 'External booking URL') {
    return {
      type: 'Book',
      rationale: 'External booking system available. Consider embedding the widget for higher conversion.',
    }
  }

  if (data.phoneReliability === 'Weak' && data.schedulingMethod === 'Contact form only') {
    return {
      type: 'Form',
      rationale: 'No reliable phone or booking system available. Form is the only viable CTA.',
      warning:
        'Form-primary requires confirmed automated callback/SMS trigger. Confirm before launch.',
    }
  }

  if (data.phoneReliability === 'Inconsistent') {
    return {
      type: 'Book',
      rationale:
        'Phone reliability is inconsistent. If a booking system is available, it should be primary. Otherwise consider form with callback.',
    }
  }

  return {
    type: 'Form',
    rationale: 'Insufficient operational data to recommend Call or Book. Defaulting to Form.',
    warning:
      'Form-primary requires confirmed automated callback/SMS trigger. Confirm before launch.',
  }
}

export default function Section3OperationalFit({ data, updateData }: Props) {
  const ctaRec = useMemo(() => deriveCtaRecommendation(data), [
    data.phoneReliability,
    data.schedulingMethod,
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Operational Fit</h2>
        <p className="text-sm text-zinc-500">
          How the practice handles calls, scheduling, and lead follow-up. This drives the CTA
          recommendation.
        </p>
      </div>

      {/* Phone Reliability */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-zinc-500 uppercase">
          Phone Reliability
        </label>
        <div className="flex gap-2">
          {PHONE_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => updateData({ phoneReliability: opt })}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                data.phoneReliability === opt
                  ? 'bg-brand-blue text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* After-hours Coverage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-xs font-bold text-zinc-500 uppercase">
            After-hours Coverage
          </label>
          <div className="flex gap-2">
            {[true, false].map((val) => (
              <button
                key={String(val)}
                onClick={() => updateData({ afterHoursCoverage: val })}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  data.afterHoursCoverage === val
                    ? 'bg-brand-blue text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {val ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
            After-hours Notes
          </label>
          <input
            type="text"
            value={data.afterHoursNotes}
            onChange={(e) => updateData({ afterHoursNotes: e.target.value })}
            placeholder="e.g. Answering service, voicemail, etc."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors"
          />
        </div>
      </div>

      {/* Scheduling Method */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-zinc-500 uppercase">
          Scheduling Method
        </label>
        <div className="flex flex-wrap gap-2">
          {SCHEDULING_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => updateData({ schedulingMethod: opt })}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                data.schedulingMethod === opt
                  ? 'bg-brand-blue text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Booking System Name */}
      <div>
        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
          Booking System Name
        </label>
        <input
          type="text"
          value={data.bookingSystemName}
          onChange={(e) => updateData({ bookingSystemName: e.target.value })}
          placeholder="e.g. Sycle, CounselEAR, Blueprint OMS"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors"
        />
      </div>

      {/* Booking Iframe Code — only if embedded widget */}
      {data.schedulingMethod === 'Embedded booking widget' && (
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
            Booking Iframe / Embed Code
          </label>
          <textarea
            value={data.bookingIframeCode}
            onChange={(e) => updateData({ bookingIframeCode: e.target.value })}
            placeholder="Paste the booking widget embed code here..."
            rows={4}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm font-mono focus:border-brand-blue outline-none transition-colors resize-y"
          />
        </div>
      )}

      {/* Lead Notification & Follow-up */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
            Lead Notification Method
          </label>
          <input
            type="text"
            value={data.leadNotificationMethod}
            onChange={(e) => updateData({ leadNotificationMethod: e.target.value })}
            placeholder="e.g. Email, SMS, CRM notification"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
            Follow-up Speed Estimate
          </label>
          <input
            type="text"
            value={data.followUpSpeedEstimate}
            onChange={(e) => updateData({ followUpSpeedEstimate: e.target.value })}
            placeholder="e.g. Same day, Within 2 hours, Next business day"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors"
          />
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
              Recommended Primary CTA
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
    </div>
  )
}
