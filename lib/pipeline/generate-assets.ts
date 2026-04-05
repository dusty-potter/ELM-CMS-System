// Generate src/config/assets.ts for a client site repo.
// Maps imported ClientImage records (with slot assignments) to the
// template's asset registry. Unfilled slots use placeholder SVG paths.

type ClientImageRow = {
  slot: string | null
  localUrl: string | null
  classification: string
}

// Default placeholder paths (match the template's public/assets/ structure)
const DEFAULTS: Record<string, string> = {
  'brand.logo': '/assets/logo.svg',
  'brand.logoDark': '/assets/logo-dark.svg',
  'brand.favicon': '/assets/favicon.svg',
  'brand.appleTouchIcon': '/assets/apple-touch-icon.svg',
  'brand.ogImage': '/assets/og-image.svg',
  'hero.heroBg': '/assets/hero-bg.svg',
  'hero.heroBgMobile': '/assets/hero-bg-mobile.svg',
  'hero.hearingAidsHero': '/assets/hearing-aids-hero.svg',
  'hero.hearingTestsHero': '/assets/hearing-tests-hero.svg',
  'team.group': '/assets/team/group.svg',
  'lifestyle.coupleConversation': '/assets/lifestyle/couple-conversation.svg',
  'lifestyle.familyGathering': '/assets/lifestyle/family-gathering.svg',
  'lifestyle.activeSenior': '/assets/lifestyle/active-senior.svg',
  'lifestyle.patientHappy': '/assets/lifestyle/patient-happy.svg',
  'services.consultation': '/assets/services/consultation.svg',
  'services.hearingTest': '/assets/services/hearing-test.svg',
  'services.hearingAidFitting': '/assets/services/hearing-aid-fitting.svg',
  'services.tinnitus': '/assets/services/tinnitus.svg',
  'services.repairs': '/assets/services/repairs.svg',
  'blog.defaultImage': '/assets/blog/default.svg',
}

function getDefault(slot: string): string {
  // Direct match
  if (DEFAULTS[slot]) return DEFAULTS[slot]
  // team.providers.N → placeholder
  if (slot.startsWith('team.providers.')) {
    const idx = parseInt(slot.split('.')[2]) + 1
    return `/assets/team/provider-${idx}.svg`
  }
  if (slot.startsWith('team.coordinators.')) {
    const idx = parseInt(slot.split('.')[2]) + 1
    return `/assets/team/coordinator-${idx}.svg`
  }
  // facility.{slug}.{type}
  if (slot.startsWith('facility.')) {
    const parts = slot.split('.')
    const locSlug = parts[1]
    const type = parts[2]
    const typeMap: Record<string, string> = {
      exterior: 'exterior',
      reception: 'reception',
      examRoom: 'exam-room',
    }
    return `/assets/locations/${locSlug}/${typeMap[type] || type}.svg`
  }
  return '/assets/placeholder.svg'
}

/**
 * Generate the contents of src/config/assets.ts for a client site.
 */
export function generateAssetsConfig(images: ClientImageRow[]): string {
  // Build a map of slot → URL
  const slotMap: Record<string, string> = {}

  for (const img of images) {
    if (img.slot && img.localUrl) {
      slotMap[img.slot] = img.localUrl
    }
  }

  // Resolve each slot: use imported URL if available, else placeholder
  const resolve = (slot: string) => slotMap[slot] || getDefault(slot)

  // Collect provider slots
  const providerSlots = Object.keys(slotMap).filter(s => s.startsWith('team.providers.')).sort()
  const maxProviderIdx = providerSlots.length > 0
    ? Math.max(...providerSlots.map(s => parseInt(s.split('.')[2])))
    : 2 // default 3 placeholders

  const providers = Array.from({ length: maxProviderIdx + 1 }, (_, i) =>
    resolve(`team.providers.${i}`)
  )

  // Collect coordinator slots
  const coordSlots = Object.keys(slotMap).filter(s => s.startsWith('team.coordinators.')).sort()
  const coordinators = coordSlots.length > 0
    ? coordSlots.map(s => resolve(s))
    : ['/assets/team/coordinator-1.svg']

  // Collect facility slots grouped by location
  const facilitySlots = Object.keys(slotMap).filter(s => s.startsWith('facility.'))
  const locationSlugs = Array.from(new Set(facilitySlots.map(s => s.split('.')[1])))
  if (locationSlugs.length === 0) locationSlugs.push('primary')

  const facilityObj: Record<string, Record<string, string>> = {}
  for (const locSlug of locationSlugs) {
    facilityObj[locSlug] = {
      exterior: resolve(`facility.${locSlug}.exterior`),
      reception: resolve(`facility.${locSlug}.reception`),
      examRoom: resolve(`facility.${locSlug}.examRoom`),
    }
  }

  const config = {
    brand: {
      logo: resolve('brand.logo'),
      logoDark: resolve('brand.logoDark'),
      favicon: resolve('brand.favicon'),
      appleTouchIcon: resolve('brand.appleTouchIcon'),
      ogImage: resolve('brand.ogImage'),
    },
    heroBg: resolve('hero.heroBg'),
    heroBgMobile: resolve('hero.heroBgMobile'),
    hearingAidsHero: resolve('hero.hearingAidsHero'),
    hearingTestsHero: resolve('hero.hearingTestsHero'),
    team: {
      group: resolve('team.group'),
      providers,
      coordinators,
    },
    facility: facilityObj,
    lifestyle: {
      coupleConversation: resolve('lifestyle.coupleConversation'),
      familyGathering: resolve('lifestyle.familyGathering'),
      activeSenior: resolve('lifestyle.activeSenior'),
      patientHappy: resolve('lifestyle.patientHappy'),
    },
    services: {
      consultation: resolve('services.consultation'),
      hearingTest: resolve('services.hearingTest'),
      hearingAidFitting: resolve('services.hearingAidFitting'),
      tinnitus: resolve('services.tinnitus'),
      repairs: resolve('services.repairs'),
    },
    blog: {
      defaultImage: resolve('blog.defaultImage'),
    },
  }

  return `// Auto-generated by ELM Pipeline — Client Asset Registry
// Generated: ${new Date().toISOString()}

const ASSETS = ${JSON.stringify(config, null, 2)} as const

export default ASSETS
`
}
