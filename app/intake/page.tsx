'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import IntakeStepper from './components/IntakeStepper'
import Section0SiteScan from './components/Section0SiteScan'
import Section1BusinessInfo from './components/Section1BusinessInfo'
import Section2TeamProducts from './components/Section2TeamProducts'
import Section3OperationalFit from './components/Section3OperationalFit'
import Section4CurrentSite from './components/Section4CurrentSite'
import Section5BrandStyle from './components/Section5BrandStyle'
import Section6RisksOverrides from './components/Section6RisksOverrides'
import Section7Review from './components/Section7Review'

// Types are canonical in lib/pipeline/types.ts — shared with server-side pipeline code.
// Re-export here so section components can import from '../page'.
export type { IntakeData, TeamMember, Location } from '@/lib/pipeline/types'
import type { IntakeData } from '@/lib/pipeline/types'

const INITIAL_DATA: IntakeData = {
  scannedUrl: '',
  businessName: '',
  domain: '',
  practiceType: '',
  primaryPhone: '',
  numberOfLocations: null,
  locations: [],
  serviceArea: '',
  primaryServices: '',
  credentials: '',
  teamMembers: [],
  manufacturersCarried: [],
  featuredManufacturers: [],
  phoneReliability: '',
  afterHoursCoverage: null,
  afterHoursNotes: '',
  schedulingMethod: '',
  bookingSystemName: '',
  bookingIframeCode: '',
  leadNotificationMethod: '',
  followUpSpeedEstimate: '',
  existingUrl: '',
  keyPages: '',
  currentCtaPattern: '',
  contentToKeep: '',
  contentToRemove: '',
  missingContent: '',
  primaryBrandColor: '',
  logoStatus: '',
  photographyAvailable: null,
  brandTone: [],
  styleNotes: '',
  clientOverrides: [],
  sensitivities: '',
  requiredElements: '',
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function IntakePage() {
  return (
    <Suspense>
      <IntakePageContent />
    </Suspense>
  )
}

function IntakePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const resumeSlug = searchParams.get('resume')
  const [section, setSection] = useState(resumeSlug ? 1 : 0)
  const [data, setData] = useState<IntakeData>(INITIAL_DATA)
  const [launching, setLaunching] = useState(false)
  const [resumeLoading, setResumeLoading] = useState(!!resumeSlug)
  const [launchResult, setLaunchResult] = useState<{ success: boolean; message: string } | null>(
    null
  )

  // Resume flow: pre-populate from saved intake
  useEffect(() => {
    if (!resumeSlug) return
    fetch(`/api/sites/${resumeSlug}`)
      .then((r) => r.json())
      .then((intake) => {
        if (intake.payload) {
          const p = intake.payload as Partial<IntakeData>
          setData((prev) => ({ ...prev, ...p }))
        }
      })
      .catch(() => {}) // silently fail — user can fill manually
      .finally(() => setResumeLoading(false))
  }, [resumeSlug])

  function updateData(partial: Partial<IntakeData>) {
    setData((prev) => ({ ...prev, ...partial }))
  }

  function goNext() {
    setSection((s) => Math.min(s + 1, 7))
  }

  function goPrev() {
    setSection((s) => Math.max(s - 1, 0))
  }

  async function handleLaunch() {
    setLaunching(true)
    setLaunchResult(null)

    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, _resumeSlug: resumeSlug || undefined }),
      })
      const json = await res.json()

      if (!res.ok) {
        setLaunchResult({ success: false, message: json.error ?? 'Failed to launch pipeline' })
        return
      }

      setLaunchResult({
        success: true,
        message: `Intake created: ${json.slug}. Pipeline queued.`,
      })
    } catch {
      setLaunchResult({ success: false, message: 'Network error — could not reach server' })
    } finally {
      setLaunching(false)
    }
  }

  // Show loading state for resume
  if (resumeLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-zinc-700 border-t-brand-blue rounded-full animate-spin" />
      </div>
    )
  }

  // Show success state after launch
  if (launchResult?.success) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl text-emerald-400">{'\u2713'}</span>
          </div>
          <h2 className="text-xl font-bold text-white">Pipeline Launched</h2>
          <p className="text-sm text-emerald-300/80">{launchResult.message}</p>
          <div className="flex gap-3 justify-center pt-4">
            <button
              onClick={() => {
                setData(INITIAL_DATA)
                setSection(0)
                setLaunchResult(null)
              }}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-2 px-6 rounded-xl transition-colors text-sm"
            >
              New Intake
            </button>
            <button
              onClick={() => router.push('/sites')}
              className="bg-brand-blue hover:bg-blue-500 text-white font-semibold py-2 px-6 rounded-xl transition-colors text-sm"
            >
              Go to Sites
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Client Intake</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Complete the onboarding form during the client call. All fields are editable before
          launch.
        </p>
      </div>

      <IntakeStepper current={section} onNavigate={setSection} />

      {/* Launch error */}
      {launchResult && !launchResult.success && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
          {launchResult.message}
        </div>
      )}

      {/* Section content */}
      <div className="min-h-[400px]">
        {section === 0 && (
          <Section0SiteScan data={data} updateData={updateData} onNext={goNext} />
        )}
        {section === 1 && <Section1BusinessInfo data={data} updateData={updateData} />}
        {section === 2 && <Section2TeamProducts data={data} updateData={updateData} />}
        {section === 3 && <Section3OperationalFit data={data} updateData={updateData} />}
        {section === 4 && <Section4CurrentSite data={data} updateData={updateData} />}
        {section === 5 && <Section5BrandStyle data={data} updateData={updateData} />}
        {section === 6 && <Section6RisksOverrides data={data} updateData={updateData} />}
        {section === 7 && (
          <Section7Review data={data} launching={launching} onLaunch={handleLaunch} />
        )}
      </div>

      {/* Navigation */}
      {section !== 0 && (
        <div className="flex justify-between pt-4 border-t border-zinc-800">
          <button
            onClick={goPrev}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-2 px-6 rounded-xl transition-colors text-sm"
          >
            Back
          </button>
          {section < 7 && (
            <button
              onClick={goNext}
              className="bg-brand-blue hover:bg-blue-500 text-white font-semibold py-2 px-6 rounded-xl transition-colors text-sm"
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  )
}
