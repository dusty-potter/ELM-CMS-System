import { useState, useEffect, useCallback } from 'react';

/**
 * Types for the CMS Content (Match the CMS PublicProduct interface)
 */
export interface CmsProduct {
  id: string;
  name: string;
  manufacturer: string;
  platform: string;
  images: string[];
  activeContent: {
    text: string;
    variantId?: string;
    source: 'site-specific' | 'global' | 'canonical';
    updatedAt: any;
  } | null;
  specs: {
    features: string[];
    techTerms: string[];
  };
}

/**
 * Configuration for the CMS Client
 */
export interface CmsConfig {
  baseUrl: string; // The URL of your HearingCMS instance
  siteId: string;  // Your unique Site ID registered in the CMS
  apiKey: string;  // Your Site API Key from the CMS dashboard
}

/**
 * A reusable hook to fetch and manage products from the HearingCMS
 */
export function useCmsProducts(config: CmsConfig) {
  const [products, setProducts] = useState<CmsProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${config.baseUrl}/api/public/sites/${config.siteId}/products`, {
        headers: {
          'x-api-key': config.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`CMS Fetch Failed: ${response.statusText}`);
      }

      const data = await response.json();
      setProducts(data);
    } catch (err) {
      console.error('CMS Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error fetching CMS content');
    } finally {
      setLoading(false);
    }
  }, [config.baseUrl, config.siteId, config.apiKey]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    refetch: fetchProducts
  };
}
