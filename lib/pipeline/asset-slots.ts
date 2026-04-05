// Canonical asset slot registry — mirrors src/config/assets.ts in the template repo.
// Every image on a client site maps to one of these slots.

import type { TeamMember, Location } from './types'

export type SlotOption = {
  slot: string
  label: string
  category: string
  spec: string // e.g. "600x600 square"
}

// ---------------------------------------------------------------------------
// Slot generators
// ---------------------------------------------------------------------------

export function getAllSlots(teamMembers: TeamMember[], locations: Location[]): SlotOption[] {
  const slots: SlotOption[] = [
    // Brand
    { slot: 'brand.logo', label: 'Logo', category: 'Brand', spec: 'SVG preferred' },
    { slot: 'brand.logoDark', label: 'Logo (dark variant)', category: 'Brand', spec: 'SVG preferred' },
    { slot: 'brand.favicon', label: 'Favicon', category: 'Brand', spec: 'SVG or 32x32' },
    { slot: 'brand.ogImage', label: 'Social Share Image', category: 'Brand', spec: '1200x630' },

    // Hero
    { slot: 'hero.heroBg', label: 'Hero Background (Desktop)', category: 'Hero', spec: '1440x900' },
    { slot: 'hero.heroBgMobile', label: 'Hero Background (Mobile)', category: 'Hero', spec: '768x900' },
    { slot: 'hero.hearingAidsHero', label: 'Hearing Aids Page Hero', category: 'Hero', spec: '1440x900' },
    { slot: 'hero.hearingTestsHero', label: 'Hearing Tests Page Hero', category: 'Hero', spec: '1440x900' },

    // Team — group
    { slot: 'team.group', label: 'Team Group Photo', category: 'Team', spec: '1200x675' },
  ]

  // Team — individual providers
  teamMembers.forEach((member, i) => {
    slots.push({
      slot: `team.providers.${i}`,
      label: `Provider: ${member.name || `Provider ${i + 1}`}`,
      category: 'Team',
      spec: '600x600 square',
    })
  })

  // Facility — per location
  const locs = locations.length > 0
    ? locations
    : [{ name: 'Primary', address: '', city: '', state: '', zip: '', phone: '' }]

  locs.forEach((loc, i) => {
    const slug = i === 0 ? 'primary' : `location-${i + 1}`
    const name = loc.name || `Location ${i + 1}`
    slots.push(
      { slot: `facility.${slug}.exterior`, label: `${name} — Exterior`, category: 'Facility', spec: '1200x675 (16:9)' },
      { slot: `facility.${slug}.reception`, label: `${name} — Reception`, category: 'Facility', spec: '1200x675 (16:9)' },
      { slot: `facility.${slug}.examRoom`, label: `${name} — Exam Room`, category: 'Facility', spec: '1200x675 (16:9)' },
    )
  })

  // Lifestyle
  slots.push(
    { slot: 'lifestyle.coupleConversation', label: 'Couple Conversation', category: 'Lifestyle', spec: '1200x675' },
    { slot: 'lifestyle.familyGathering', label: 'Family Gathering', category: 'Lifestyle', spec: '1200x675' },
    { slot: 'lifestyle.activeSenior', label: 'Active Senior', category: 'Lifestyle', spec: '1200x675' },
    { slot: 'lifestyle.patientHappy', label: 'Happy Patient', category: 'Lifestyle', spec: '1200x675' },
  )

  // Services
  slots.push(
    { slot: 'services.consultation', label: 'Consultation', category: 'Services', spec: '1200x675' },
    { slot: 'services.hearingTest', label: 'Hearing Test', category: 'Services', spec: '1200x675' },
    { slot: 'services.hearingAidFitting', label: 'Hearing Aid Fitting', category: 'Services', spec: '1200x675' },
    { slot: 'services.tinnitus', label: 'Tinnitus Treatment', category: 'Services', spec: '1200x675' },
    { slot: 'services.repairs', label: 'Repairs & Maintenance', category: 'Services', spec: '1200x675' },
  )

  return slots
}

export function getSlotLabel(slot: string): string {
  // Quick lookup — parse the slot path into a human-readable label
  const parts = slot.split('.')
  if (parts[0] === 'team' && parts[1] === 'providers') return `Provider Headshot ${parseInt(parts[2]) + 1}`
  if (parts[0] === 'facility') return `${parts[1]} — ${parts[2]}`
  if (parts[0] === 'lifestyle') return parts[1].replace(/([A-Z])/g, ' $1').trim()
  return parts.join(' > ')
}

// Map image classification to likely asset slot categories for auto-suggestion
export function classificationToSlotPrefixes(classification: string): string[] {
  const map: Record<string, string[]> = {
    provider_headshot: ['team.providers'],
    staff_headshot: ['team.providers', 'team.group'],
    team_group: ['team.group'],
    location_exterior: ['facility.'],
    location_interior: ['facility.'],
    lifestyle: ['lifestyle.'],
    logo: ['brand.logo'],
    hero: ['hero.'],
    service: ['services.'],
    other: [],
  }
  return map[classification] ?? []
}
