import React from "react";
import { ExternalLink, Code, Database, Globe, Zap, ShieldCheck, Check } from "lucide-react";

const PublicAPI: React.FC = () => {
  const appUrl = window.location.origin;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold text-white mb-2">Public API Documentation</h1>
        <p className="text-zinc-400">Distribute structured hearing aid content across your network of websites.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
          <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center border border-brand-blue/20 mb-4">
            <Database className="w-5 h-5 text-brand-blue" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Structured Data</h3>
          <p className="text-sm text-zinc-500">Access canonical specs, features, and technology terms in a clean JSON format.</p>
        </div>
        <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
          <div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center border border-brand-orange/20 mb-4">
            <Zap className="w-5 h-5 text-brand-orange" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">AI-Powered Variants</h3>
          <p className="text-sm text-zinc-500">Request specific AI-rewritten descriptions to avoid duplicate content issues on different sites.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-zinc-500" />
              <span className="text-sm font-bold text-white uppercase tracking-wider">GET /api/public/sites/{"{siteId}"}/products</span>
            </div>
            <div className="flex gap-2">
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-widest">Public</span>
              <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded uppercase tracking-widest">v2.0</span>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-zinc-400">Fetch all products explicitly published to your site. This endpoint resolves the best available content variant automatically.</p>
            <div className="bg-zinc-900 rounded-xl p-4 font-mono text-xs text-zinc-300 overflow-x-auto">
              <pre>{`// Fetch published products for a specific site
fetch('${appUrl}/api/public/sites/my-site-id/products', {
  headers: { 'x-api-key': 'your-site-api-key' }
})
  .then(res => res.json())
  .then(products => {
    // Each product includes:
    // - Resolved activeContent (Site-specific > Global > Canonical)
    // - Normalized specs (features, techTerms)
    // - Product images (CDN URLs)
    // - Manufacturer & Platform metadata
    console.log(products[0].images);
  });`}</pre>
            </div>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-zinc-500" />
              <span className="text-sm font-bold text-white uppercase tracking-wider">React Hook (useCmsProducts)</span>
            </div>
            <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded uppercase tracking-widest">Recommended</span>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-zinc-400">Copy this hook into your target AI Studio projects to easily ingest and display your product content.</p>
            <div className="bg-zinc-900 rounded-xl p-4 font-mono text-xs text-zinc-300 overflow-x-auto max-h-[400px]">
              <pre>{`// src/hooks/useCmsProducts.ts
import { useState, useEffect, useCallback } from 'react';

export function useCmsProducts(config: { baseUrl: string, siteId: string, apiKey: string }) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const res = await fetch(\`\${config.baseUrl}/api/public/sites/\${config.siteId}/products\`, {
      headers: { 'x-api-key': config.apiKey }
    });
    const data = await res.json();
    setProducts(data);
    setLoading(false);
  }, [config.baseUrl, config.siteId, config.apiKey]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  return { products, loading, refetch: fetchProducts };
}`}</pre>
            </div>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-zinc-500" />
              <span className="text-sm font-bold text-white uppercase tracking-wider">Webhook Propagation</span>
            </div>
            <span className="text-[10px] font-bold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded uppercase tracking-widest">Push</span>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-zinc-400">The CMS can notify your site whenever a product is published or updated. Configure your webhook URL in the Sites dashboard.</p>
            <div className="bg-zinc-900 rounded-xl p-4 font-mono text-xs text-zinc-300 overflow-x-auto">
              <pre>{`// Example Webhook Payload (POST)
{
  "event": "product.published",
  "siteId": "my-site-id",
  "productId": "prod-123",
  "timestamp": "2026-03-25T13:48:09Z"
}`}</pre>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-3xl">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          Integration Best Practices
        </h2>
        <ul className="space-y-4">
          <li className="flex gap-4">
            <div className="w-6 h-6 bg-emerald-500/10 rounded-full flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
              <Check className="w-3 h-3 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Use Site IDs</p>
              <p className="text-xs text-zinc-500">Always pass a `siteId` to ensure you get the unique AI rewrite intended for your specific domain.</p>
            </div>
          </li>
          <li className="flex gap-4">
            <div className="w-6 h-6 bg-emerald-500/10 rounded-full flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
              <Check className="w-3 h-3 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Handle Fallbacks</p>
              <p className="text-xs text-zinc-500">The `activeContent` field will be `null` if no published variant exists and canonical fallback is disabled.</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default PublicAPI;
