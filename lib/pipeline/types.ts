// Canonical types shared between the intake form (client) and pipeline executor (server).

export type TeamMember = {
  name: string
  title: string
  credentials: string
}

export type Location = {
  name: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
}

export type IntakeData = {
  // Section 0
  scannedUrl: string
  // Section 1
  businessName: string
  domain: string
  practiceType: string
  primaryPhone: string
  numberOfLocations: number | null
  locations: Location[]
  serviceArea: string
  primaryServices: string
  credentials: string
  // Section 2
  teamMembers: TeamMember[]
  manufacturersCarried: string[]
  featuredManufacturers: string[]
  // Section 3
  phoneReliability: string
  afterHoursCoverage: boolean | null
  afterHoursNotes: string
  schedulingMethod: string
  bookingSystemName: string
  bookingIframeCode: string
  leadNotificationMethod: string
  followUpSpeedEstimate: string
  // Section 4
  existingUrl: string
  keyPages: string
  currentCtaPattern: string
  contentToKeep: string
  contentToRemove: string
  missingContent: string
  // Section 5
  primaryBrandColor: string
  logoStatus: string
  photographyAvailable: boolean | null
  brandTone: string[]
  styleNotes: string
  // Section 6
  clientOverrides: string[]
  sensitivities: string
  requiredElements: string
}

export type StageLogEntry = {
  stage: number
  name: string
  status: 'running' | 'done' | 'failed'
  startedAt: string
  completedAt?: string
  error?: string
  details?: Record<string, unknown>
}

export type Stage2Result = {
  success: boolean
  repoUrl?: string
  error?: string
  stagingUrl?: string
}
