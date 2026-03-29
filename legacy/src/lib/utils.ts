import { CANONICAL_MANUFACTURERS, MANUFACTURER_ALIASES } from "../constants";
import { Product, ResolvedContent, PublicProduct } from "../types";

export function normalizeManufacturer(input: string): string {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  
  // Check aliases first
  if (MANUFACTURER_ALIASES[lower]) {
    return MANUFACTURER_ALIASES[lower];
  }
  
  // Check canonical list (case-insensitive)
  const canonical = CANONICAL_MANUFACTURERS.find(
    m => m.toLowerCase() === lower
  );
  
  if (canonical) {
    return canonical;
  }
  
  return trimmed; // Return trimmed if not found, UI should handle validation
}

export function resolveProductContent(product: Product, siteId?: string): ResolvedContent | null {
  const variants = Object.values(product.content.variants || {});
  
  // 1. Site-specific published
  if (siteId) {
    const siteVariant = variants.find(
      v => v.status === 'published' && v.scope === 'site-specific' && v.siteId === siteId
    );
    if (siteVariant) {
      return {
        text: siteVariant.text,
        variantId: siteVariant.id,
        source: 'site-specific',
        updatedAt: siteVariant.updatedAt
      };
    }
  }
  
  // 2. Global published
  const globalVariant = variants.find(
    v => v.status === 'published' && v.scope === 'global'
  );
  if (globalVariant) {
    return {
      text: globalVariant.text,
      variantId: globalVariant.id,
      source: 'global',
      updatedAt: globalVariant.updatedAt
    };
  }
  
  // 3. Canonical fallback
  if (product.status === 'published' && product.allowCanonicalFallback && product.content.canonical) {
    return {
      text: product.content.canonical,
      source: 'canonical',
      updatedAt: product.metadata.updatedAt
    };
  }
  
  return null;
}

export function toPublicProduct(product: Product, siteId?: string): PublicProduct {
  return {
    id: product.id,
    name: product.name,
    manufacturer: product.manufacturer,
    platform: product.platform,
    activeContent: resolveProductContent(product, siteId),
    specs: {
      features: product.specs.features || [],
      techTerms: product.specs.techTerms || []
    },
    images: product.images || []
  };
}

export function cn(...classes: (string | undefined | null | boolean)[]) {
  return classes.filter(Boolean).join(' ');
}
