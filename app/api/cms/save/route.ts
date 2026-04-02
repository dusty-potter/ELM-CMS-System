import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/slugify'
import {
  CapabilityCategory,
  FormFactorStyle,
  BatteryType,
  ProductTier,
  ConfidenceLevel,
  ComparisonLevel,
} from '@prisma/client'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_FF_STYLES = new Set<string>(['RIC', 'BTE', 'ITE', 'CIC', 'IIC', 'miniRITE', 'other'])
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
// POST /api/cms/save
// Body: { manufacturer: string, modelName: string, product: IngestProduct }
//
// Upsert path:
//   Manufacturer → Platform → PlatformCapabilities
//   → Product → ProductCapabilityDeclarations
//   → FormFactors → FormFactorCapabilityDeclarations
//
// All records land in `draft` status — nothing is published automatically.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  let body: { manufacturer: string; modelName: string; product: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { manufacturer: manufacturerName, modelName, product } = body

  if (!manufacturerName || !modelName || !product) {
    return NextResponse.json(
      { error: 'manufacturer, modelName, and product are required' },
      { status: 400 },
    )
  }

  try {
    // ── 1. Manufacturer ──────────────────────────────────────────────────────
    const manufacturerSlug = slugify(manufacturerName)
    const manufacturer = await prisma.manufacturer.upsert({
      where: { slug: manufacturerSlug },
      update: { name: manufacturerName },
      create: {
        name: manufacturerName,
        slug: manufacturerSlug,
        aliases: [],
        approvedDomains: [],
        productPagePatterns: [],
        autoFilled: true,
        confidenceLevel: toConfidence(product.confidenceLevel as string),
        ingestSource: 'ai-research',
      },
    })

    // ── 2. Platform ──────────────────────────────────────────────────────────
    const platformName = (product.platform as string | null) ?? 'Unknown'
    const platformSlug = slugify(platformName)
    const connectivity = (product.connectivity as Record<string, boolean>) ?? {}

    const platform = await prisma.platform.upsert({
      where: { manufacturerId_slug: { manufacturerId: manufacturer.id, slug: platformSlug } },
      update: {
        connectivityIos: connectivity.ios ?? false,
        connectivityAndroid: connectivity.android ?? false,
        connectivityBluetooth: connectivity.bluetooth ?? false,
        connectivityAuracast: connectivity.auracast ?? false,
        connectivityHandsFree: connectivity.handsFree ?? false,
        connectivityRemoteControl: connectivity.remoteControl ?? false,
      },
      create: {
        manufacturerId: manufacturer.id,
        name: platformName,
        displayName: (product.displayName as string | null) ?? null,
        slug: platformSlug,
        status: 'draft',
        connectivityIos: connectivity.ios ?? false,
        connectivityAndroid: connectivity.android ?? false,
        connectivityBluetooth: connectivity.bluetooth ?? false,
        connectivityAuracast: connectivity.auracast ?? false,
        connectivityHandsFree: connectivity.handsFree ?? false,
        connectivityRemoteControl: connectivity.remoteControl ?? false,
        autoFilled: true,
        confidenceLevel: toConfidence(product.confidenceLevel as string),
        ingestSource: 'ai-research',
      },
    })

    // ── 3. Platform capability pool ──────────────────────────────────────────
    const capabilities = (product.capabilities as Array<{
      key: string
      label: string
      category: string
      description?: string | null
    }>) ?? []

    const capabilityIdByKey: Record<string, string> = {}
    for (const cap of capabilities) {
      const capability = await prisma.platformCapability.upsert({
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

    // ── 4. Product ───────────────────────────────────────────────────────────
    const productSlug = `${manufacturerSlug}-${slugify(modelName)}`
    const productRecord = await prisma.product.upsert({
      where: { slug: productSlug },
      update: {
        displayName: (product.displayName as string | null) ?? null,
        tier: toTier(product.tier as string),
        canonicalDescription: (product.canonicalDescription as string | null) ?? null,
        bestFor: (product.bestFor as string[]) ?? [],
        pros: (product.pros as string[]) ?? [],
        cons: (product.cons as string[]) ?? [],
        targetUser: (product.targetUser as string | null) ?? null,
        hearingLossRange: (product.hearingLossRange as string[]) ?? [],
        compSpeechInNoise: toComparison(product.compSpeechInNoise as string),
        compMusicQuality: toComparison(product.compMusicQuality as string),
        compTinnitusSupport: (product.compTinnitusSupport as boolean | null) ?? null,
        compAiProcessing: (product.compAiProcessing as boolean | null) ?? null,
        compRemoteCare: (product.compRemoteCare as boolean | null) ?? null,
        compHealthTracking: (product.compHealthTracking as boolean | null) ?? null,
        confidenceLevel: toConfidence(product.confidenceLevel as string),
      },
      create: {
        platformId: platform.id,
        manufacturerId: manufacturer.id,
        name: modelName,
        displayName: (product.displayName as string | null) ?? null,
        slug: productSlug,
        tier: toTier(product.tier as string),
        status: 'draft',
        canonicalDescription: (product.canonicalDescription as string | null) ?? null,
        allowCanonicalFallback: true,
        bestFor: (product.bestFor as string[]) ?? [],
        pros: (product.pros as string[]) ?? [],
        cons: (product.cons as string[]) ?? [],
        targetUser: (product.targetUser as string | null) ?? null,
        hearingLossRange: (product.hearingLossRange as string[]) ?? [],
        compSpeechInNoise: toComparison(product.compSpeechInNoise as string),
        compMusicQuality: toComparison(product.compMusicQuality as string),
        compTinnitusSupport: (product.compTinnitusSupport as boolean | null) ?? null,
        compAiProcessing: (product.compAiProcessing as boolean | null) ?? null,
        compRemoteCare: (product.compRemoteCare as boolean | null) ?? null,
        compHealthTracking: (product.compHealthTracking as boolean | null) ?? null,
        autoFilled: true,
        confidenceLevel: toConfidence(product.confidenceLevel as string),
        ingestSource: 'ai-research',
      },
    })

    // ── 5. Product capability declarations ───────────────────────────────────
    const declarationIdByCapabilityId: Record<string, string> = {}
    for (const [, capabilityId] of Object.entries(capabilityIdByKey)) {
      const declaration = await prisma.productCapabilityDeclaration.upsert({
        where: { productId_capabilityId: { productId: productRecord.id, capabilityId } },
        update: {},
        create: { productId: productRecord.id, capabilityId, confirmed: false },
      })
      declarationIdByCapabilityId[capabilityId] = declaration.id
    }

    // ── 6. Form factors + their capability declarations ──────────────────────
    const formFactors = (product.formFactors as Array<Record<string, unknown>>) ?? []
    for (const ff of formFactors) {
      const ffName = (ff.name as string) ?? 'Unknown'
      const ffSlug = slugify(ffName)

      const formFactor = await prisma.formFactor.upsert({
        where: { productId_slug: { productId: productRecord.id, slug: ffSlug } },
        update: {
          batteryType: toBatteryType(ff.batteryType as string),
          batterySize: (ff.batterySize as string | null) ?? null,
          batteryEstimatedHours: (ff.batteryEstimatedHours as number | null) ?? null,
          ipRating: (ff.ipRating as string | null) ?? null,
          waterResistant: (ff.waterResistant as boolean) ?? false,
          colors: (ff.colors as string[]) ?? [],
          connectivityIos: (ff.connectivityIos as boolean) ?? false,
          connectivityAndroid: (ff.connectivityAndroid as boolean) ?? false,
          connectivityBluetooth: (ff.connectivityBluetooth as boolean) ?? false,
          connectivityHandsFree: (ff.connectivityHandsFree as boolean) ?? false,
        },
        create: {
          productId: productRecord.id,
          platformId: platform.id,
          manufacturerId: manufacturer.id,
          style: toFFStyle(ff.style as string),
          name: ffName,
          slug: ffSlug,
          status: 'draft',
          batteryType: toBatteryType(ff.batteryType as string),
          batterySize: (ff.batterySize as string | null) ?? null,
          batteryEstimatedHours: (ff.batteryEstimatedHours as number | null) ?? null,
          ipRating: (ff.ipRating as string | null) ?? null,
          waterResistant: (ff.waterResistant as boolean) ?? false,
          colors: (ff.colors as string[]) ?? [],
          connectivityIos: (ff.connectivityIos as boolean) ?? false,
          connectivityAndroid: (ff.connectivityAndroid as boolean) ?? false,
          connectivityBluetooth: (ff.connectivityBluetooth as boolean) ?? false,
          connectivityHandsFree: (ff.connectivityHandsFree as boolean) ?? false,
          autoFilled: true,
          confidenceLevel: toConfidence(product.confidenceLevel as string),
          ingestSource: 'ai-research',
        },
      })

      // Declare all product-level capabilities on this form factor
      for (const declarationId of Object.values(declarationIdByCapabilityId)) {
        await prisma.formFactorCapabilityDeclaration.upsert({
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

    return NextResponse.json({
      productId: productRecord.id,
      platformId: platform.id,
      manufacturerId: manufacturer.id,
      slug: productSlug,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Database save failed'
    console.error('CMS save error:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
