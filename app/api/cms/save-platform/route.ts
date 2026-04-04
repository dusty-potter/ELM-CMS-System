import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/slugify'

export const dynamic = 'force-dynamic'

import {
  CapabilityCategory,
  FormFactorStyle,
  BatteryType,
  ProductTier,
  ConfidenceLevel,
  ComparisonLevel,
} from '@prisma/client'

// ---------------------------------------------------------------------------
// Validators (reused from /api/cms/save)
// ---------------------------------------------------------------------------

const VALID_FF_STYLES = new Set<string>(['RIC', 'BTE', 'ITE', 'CIC', 'IIC', 'miniRITE', 'slimRIC', 'other'])
const VALID_BATTERY_TYPES = new Set<string>(['disposable', 'rechargeable'])
const VALID_CATEGORIES = new Set<string>(['processing', 'connectivity', 'health', 'physical'])
const VALID_TIERS = new Set<string>(['premium', 'advanced', 'standard', 'essential'])
const VALID_CONFIDENCE = new Set<string>(['high', 'medium', 'low'])
const VALID_COMPARISON = new Set<string>(['low', 'medium', 'high'])

function toFFStyle(s: string | null | undefined): FormFactorStyle {
  if (s && VALID_FF_STYLES.has(s)) return s as FormFactorStyle
  return 'other'
}
function toBatteryType(s: string | null | undefined): BatteryType | null {
  if (s && VALID_BATTERY_TYPES.has(s)) return s as BatteryType
  return null
}
function toCategory(s: string): CapabilityCategory {
  if (VALID_CATEGORIES.has(s)) return s as CapabilityCategory
  return 'processing'
}
function toTier(s: string | null | undefined): ProductTier | null {
  if (s && VALID_TIERS.has(s)) return s as ProductTier
  return null
}
function toConfidence(s: string | null | undefined): ConfidenceLevel | null {
  if (s && VALID_CONFIDENCE.has(s)) return s as ConfidenceLevel
  return null
}
function toComparison(s: string | null | undefined): ComparisonLevel | null {
  if (s && VALID_COMPARISON.has(s)) return s as ComparisonLevel
  return null
}

// ---------------------------------------------------------------------------
// POST /api/cms/save-platform
//
// Creates the full hierarchy in one transaction:
//   Manufacturer → Platform → PlatformCapabilities → FittingOptions
//   → Products (one per tier) → ProductCapabilityDeclarations
//   → FormFactors (per product, based on availableTiers)
//   → FormFactorCapabilityDeclarations
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  let body: {
    manufacturer: string
    platform: {
      name: string
      displayName?: string
      generationYear?: number
      isLegacy?: boolean
      tiers?: Array<{ id: string; label: string; tier: string }>
      formFactors?: Array<{ name: string; style: string; availableTiers?: string[] }>
      fittingOptions?: Array<{ name: string; description?: string; styles?: string[] }>
    }
    research: Record<string, unknown>
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { manufacturer: manufacturerName, platform: platformData, research } = body

  if (!manufacturerName || !platformData?.name || !research) {
    return NextResponse.json(
      { error: 'manufacturer, platform, and research are required' },
      { status: 400 },
    )
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // ── 1. Manufacturer ────────────────────────────────────────────────
      const manufacturerSlug = slugify(manufacturerName)
      const manufacturer = await tx.manufacturer.upsert({
        where: { slug: manufacturerSlug },
        update: { name: manufacturerName },
        create: {
          name: manufacturerName,
          slug: manufacturerSlug,
          aliases: [],
          approvedDomains: [],
          productPagePatterns: [],
          autoFilled: true,
          confidenceLevel: toConfidence(research.confidenceLevel as string),
          ingestSource: 'ai-research',
        },
      })

      // ── 2. Platform ────────────────────────────────────────────────────
      const platformSlug = slugify(platformData.name)
      const connectivity = (research.connectivity as Record<string, boolean>) ?? {}

      const platform = await tx.platform.upsert({
        where: { manufacturerId_slug: { manufacturerId: manufacturer.id, slug: platformSlug } },
        update: {
          displayName: platformData.displayName ?? null,
          generationYear: platformData.generationYear ?? null,
          isLegacy: platformData.isLegacy ?? false,
          summary: (research.summary as string) ?? null,
          keyDifferentiators: (research.keyDifferentiators as string[]) ?? [],
          techTerms: (research.techTerms as string[]) ?? [],
          connectivityIos: connectivity.ios ?? false,
          connectivityAndroid: connectivity.android ?? false,
          connectivityBluetooth: connectivity.bluetooth ?? false,
          connectivityAuracast: connectivity.auracast ?? false,
          connectivityHandsFree: connectivity.handsFree ?? false,
          connectivityRemoteControl: connectivity.remoteControl ?? false,
        },
        create: {
          manufacturerId: manufacturer.id,
          name: platformData.name,
          displayName: platformData.displayName ?? null,
          slug: platformSlug,
          generationYear: platformData.generationYear ?? null,
          isLegacy: platformData.isLegacy ?? false,
          status: 'draft',
          summary: (research.summary as string) ?? null,
          keyDifferentiators: (research.keyDifferentiators as string[]) ?? [],
          techTerms: (research.techTerms as string[]) ?? [],
          connectivityIos: connectivity.ios ?? false,
          connectivityAndroid: connectivity.android ?? false,
          connectivityBluetooth: connectivity.bluetooth ?? false,
          connectivityAuracast: connectivity.auracast ?? false,
          connectivityHandsFree: connectivity.handsFree ?? false,
          connectivityRemoteControl: connectivity.remoteControl ?? false,
          autoFilled: true,
          confidenceLevel: toConfidence(research.confidenceLevel as string),
          ingestSource: 'ai-research',
        },
      })

      // ── 3. Platform Capability Pool ────────────────────────────────────
      const capabilities = (research.capabilities as Array<{
        key: string; label: string; category: string; description?: string | null
      }>) ?? []

      const capabilityIdByKey: Record<string, string> = {}
      for (const cap of capabilities) {
        const capability = await tx.platformCapability.upsert({
          where: { platformId_key: { platformId: platform.id, key: cap.key } },
          update: { label: cap.label, description: cap.description ?? null },
          create: {
            platformId: platform.id,
            key: cap.key,
            label: cap.label,
            category: toCategory(cap.category),
            description: cap.description ?? null,
            techTerm: false,
          },
        })
        capabilityIdByKey[cap.key] = capability.id
      }

      // ── 4. Fitting Options ─────────────────────────────────────────────
      const fittingOptions = (research.fittingOptions as Array<{
        name: string; description?: string; styles?: string[]
      }>) ?? (platformData.fittingOptions ?? [])

      const fittingOptionIds: string[] = []
      for (const fo of fittingOptions) {
        const styles = (fo.styles ?? [])
          .map(s => toFFStyle(s))
        const option = await tx.fittingOption.upsert({
          where: { platformId_name: { platformId: platform.id, name: fo.name } },
          update: {
            description: fo.description ?? null,
            styles,
          },
          create: {
            platformId: platform.id,
            name: fo.name,
            description: fo.description ?? null,
            styles,
            autoFilled: true,
            confidenceLevel: toConfidence(research.confidenceLevel as string),
          },
        })
        fittingOptionIds.push(option.id)
      }

      // ── 5. Products (one per tier) ─────────────────────────────────────
      const researchTiers = (research.tiers as Array<Record<string, unknown>>) ?? []
      const enumTiers = platformData.tiers ?? []

      // Build a lookup from tier ID to research data
      const tierResearchById: Record<string, Record<string, unknown>> = {}
      for (const rt of researchTiers) {
        tierResearchById[rt.id as string] = rt
      }

      const productIds: string[] = []
      const productIdByTierId: Record<string, string> = {}

      for (const tier of enumTiers) {
        const tierResearch = tierResearchById[tier.id] ?? {}
        const productSlug = `${manufacturerSlug}-${platformSlug}-${slugify(tier.id)}`

        const productRecord = await tx.product.upsert({
          where: { slug: productSlug },
          update: {
            displayName: `${manufacturerName} ${tier.label}`,
            tier: toTier(tier.tier),
            canonicalDescription: (tierResearch.canonicalDescription as string) ?? null,
            bestFor: (tierResearch.bestFor as string[]) ?? [],
            pros: (tierResearch.pros as string[]) ?? [],
            cons: (tierResearch.cons as string[]) ?? [],
            targetUser: (tierResearch.targetUser as string) ?? null,
            hearingLossRange: (tierResearch.hearingLossRange as string[]) ?? [],
            valueSummary: (tierResearch.valueSummary as string) ?? null,
            upgradeReasons: (tierResearch.upgradeReasons as string[]) ?? [],
            compSpeechInNoise: toComparison(tierResearch.compSpeechInNoise as string),
            compMusicQuality: toComparison(tierResearch.compMusicQuality as string),
            compTinnitusSupport: (tierResearch.compTinnitusSupport as boolean) ?? null,
            compAiProcessing: (tierResearch.compAiProcessing as boolean) ?? null,
            compRemoteCare: (tierResearch.compRemoteCare as boolean) ?? null,
            compHealthTracking: (tierResearch.compHealthTracking as boolean) ?? null,
            confidenceLevel: toConfidence(research.confidenceLevel as string),
          },
          create: {
            platformId: platform.id,
            manufacturerId: manufacturer.id,
            name: tier.label,
            displayName: `${manufacturerName} ${tier.label}`,
            slug: productSlug,
            tier: toTier(tier.tier),
            status: 'draft',
            canonicalDescription: (tierResearch.canonicalDescription as string) ?? null,
            allowCanonicalFallback: true,
            bestFor: (tierResearch.bestFor as string[]) ?? [],
            pros: (tierResearch.pros as string[]) ?? [],
            cons: (tierResearch.cons as string[]) ?? [],
            targetUser: (tierResearch.targetUser as string) ?? null,
            hearingLossRange: (tierResearch.hearingLossRange as string[]) ?? [],
            valueSummary: (tierResearch.valueSummary as string) ?? null,
            upgradeReasons: (tierResearch.upgradeReasons as string[]) ?? [],
            compSpeechInNoise: toComparison(tierResearch.compSpeechInNoise as string),
            compMusicQuality: toComparison(tierResearch.compMusicQuality as string),
            compTinnitusSupport: (tierResearch.compTinnitusSupport as boolean) ?? null,
            compAiProcessing: (tierResearch.compAiProcessing as boolean) ?? null,
            compRemoteCare: (tierResearch.compRemoteCare as boolean) ?? null,
            compHealthTracking: (tierResearch.compHealthTracking as boolean) ?? null,
            autoFilled: true,
            confidenceLevel: toConfidence(research.confidenceLevel as string),
            ingestSource: 'ai-research',
          },
        })

        productIds.push(productRecord.id)
        productIdByTierId[tier.id] = productRecord.id
      }

      // ── 6. Product Capability Declarations ─────────────────────────────
      // Each product declares all platform capabilities
      const declarationIdByProductAndCap: Record<string, Record<string, string>> = {}

      for (const productId of productIds) {
        declarationIdByProductAndCap[productId] = {}
        for (const [capKey, capabilityId] of Object.entries(capabilityIdByKey)) {
          const declaration = await tx.productCapabilityDeclaration.upsert({
            where: { productId_capabilityId: { productId, capabilityId } },
            update: {},
            create: { productId, capabilityId, confirmed: false },
          })
          declarationIdByProductAndCap[productId][capKey] = declaration.id
        }
      }

      // ── 7. Form Factors ────────────────────────────────────────────────
      const researchFormFactors = (research.formFactors as Array<Record<string, unknown>>) ?? []
      const enumFormFactors = platformData.formFactors ?? []

      // Merge enumerate and research data by form factor name
      const ffResearchByName: Record<string, Record<string, unknown>> = {}
      for (const rff of researchFormFactors) {
        ffResearchByName[(rff.name as string)] = rff
      }

      const allFormFactorIds: string[] = []

      for (const enumFF of enumFormFactors) {
        const rff = ffResearchByName[enumFF.name] ?? {}
        const ffSlug = slugify(enumFF.name)
        const availableTiers = enumFF.availableTiers ?? enumTiers.map(t => t.id)

        // Create form factor under each applicable product/tier
        for (const tierId of availableTiers) {
          const productId = productIdByTierId[tierId]
          if (!productId) continue

          const formFactor = await tx.formFactor.upsert({
            where: { productId_slug: { productId, slug: ffSlug } },
            update: {
              batteryType: toBatteryType(rff.batteryType as string),
              batterySize: (rff.batterySize as string) ?? null,
              batteryEstimatedHours: (rff.batteryEstimatedHours as number) ?? null,
              ipRating: (rff.ipRating as string) ?? null,
              waterResistant: (rff.waterResistant as boolean) ?? false,
              colors: (rff.colors as string[]) ?? [],
              receiverOptions: (rff.receiverOptions as string[]) ?? [],
              connectivityIos: (rff.connectivityIos as boolean) ?? false,
              connectivityAndroid: (rff.connectivityAndroid as boolean) ?? false,
              connectivityBluetooth: (rff.connectivityBluetooth as boolean) ?? false,
              connectivityHandsFree: (rff.connectivityHandsFree as boolean) ?? false,
            },
            create: {
              productId,
              platformId: platform.id,
              manufacturerId: manufacturer.id,
              style: toFFStyle(enumFF.style),
              name: enumFF.name,
              slug: ffSlug,
              status: 'draft',
              batteryType: toBatteryType(rff.batteryType as string),
              batterySize: (rff.batterySize as string) ?? null,
              batteryEstimatedHours: (rff.batteryEstimatedHours as number) ?? null,
              ipRating: (rff.ipRating as string) ?? null,
              waterResistant: (rff.waterResistant as boolean) ?? false,
              colors: (rff.colors as string[]) ?? [],
              receiverOptions: (rff.receiverOptions as string[]) ?? [],
              connectivityIos: (rff.connectivityIos as boolean) ?? false,
              connectivityAndroid: (rff.connectivityAndroid as boolean) ?? false,
              connectivityBluetooth: (rff.connectivityBluetooth as boolean) ?? false,
              connectivityHandsFree: (rff.connectivityHandsFree as boolean) ?? false,
              autoFilled: true,
              confidenceLevel: toConfidence(research.confidenceLevel as string),
              ingestSource: 'ai-research',
            },
          })

          allFormFactorIds.push(formFactor.id)

          // ── 8. FormFactor Capability Declarations ──────────────────────
          const productDeclarations = declarationIdByProductAndCap[productId] ?? {}
          for (const declarationId of Object.values(productDeclarations)) {
            await tx.formFactorCapabilityDeclaration.upsert({
              where: {
                formFactorId_productCapabilityDeclarationId: {
                  formFactorId: formFactor.id,
                  productCapabilityDeclarationId: declarationId,
                },
              },
              update: {},
              create: {
                formFactorId: formFactor.id,
                productCapabilityDeclarationId: declarationId,
                confirmed: false,
              },
            })
          }
        }
      }

      return {
        platformId: platform.id,
        manufacturerId: manufacturer.id,
        productIds,
        formFactorIds: allFormFactorIds,
        fittingOptionIds,
      }
    })

    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Database save failed'
    console.error('CMS save-platform error:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
