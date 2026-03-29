export type VariantStatus = 'generated' | 'approved' | 'published' | 'rejected';
export type VariantScope = 'global' | 'site-specific';
export type ProductStatus = 'draft' | 'approved' | 'published';

export interface ContentVariant {
  id: string;
  text: string;
  status: VariantStatus;
  scope: VariantScope;
  siteId?: string;
  modelName: string;
  promptVersion: string;
  createdAt: any;
  updatedAt: any;
}

export interface Product {
  id: string;
  name: string;
  manufacturer: string;
  platform: string;
  status: ProductStatus;
  allowCanonicalFallback: boolean;
  content: {
    canonical: string;
    variants: Record<string, ContentVariant>;
  };
  specs: {
    features: string[];
    techTerms: string[];
  };
  images: string[];
  metadata: {
    createdAt: any;
    updatedAt: any;
  };
}

export interface ResolvedContent {
  text: string;
  variantId?: string;
  source: 'site-specific' | 'global' | 'canonical';
  updatedAt: any;
}

export interface PublicProduct {
  id: string;
  name: string;
  manufacturer: string;
  platform: string;
  activeContent: ResolvedContent | null;
  specs: {
    features: string[];
    techTerms: string[];
  };
  images: string[];
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt: any;
  updatedAt: any;
}

export interface Site {
  id: string;
  name: string;
  domain: string;
  googleProjectId?: string;
  active: boolean;
  supportedManufacturers: string[];
  webhookUrl: string;
  apiKey: string;
  createdAt: any;
  updatedAt: any;
}

export interface SitePublication {
  id: string; // siteId_productId
  productId: string;
  siteId: string;
  status: 'pending' | 'published' | 'failed';
  variantId: string;
  canonicalFallback: boolean;
  lastSyncedAt: any;
  error: string | null;
}
