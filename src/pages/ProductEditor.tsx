import React, { useEffect, useState } from "react";
import { db, OperationType, handleFirestoreError } from "../firebase";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, query, where, setDoc } from "firebase/firestore";
import { Product, ContentVariant, VariantStatus, VariantScope, Site, SitePublication } from "../types";
import { CANONICAL_MANUFACTURERS } from "../constants";
import { normalizeManufacturer } from "../lib/utils";
import { ImageUpload } from "../components/ImageUpload";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Package, 
  X, 
  Check, 
  Save, 
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Globe,
  Layout,
  History,
  Send,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const ProductEditor: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [publications, setPublications] = useState<Record<string, SitePublication>>({});
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [pubLoading, setPubLoading] = useState<string | null>(null);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [prodSnap, siteSnap] = await Promise.all([
        getDocs(collection(db, "products")),
        getDocs(collection(db, "sites"))
      ]);
      setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      setSites(siteSnap.docs.map(d => ({ ...d.data() } as Site)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "data");
    } finally {
      setLoading(false);
    }
  };

  const fetchPublications = async (productId: string) => {
    try {
      const q = query(collection(db, "site_publications"), where("productId", "==", productId));
      const snap = await getDocs(q);
      const pubs: Record<string, SitePublication> = {};
      snap.docs.forEach(d => {
        const data = d.data() as SitePublication;
        pubs[data.siteId] = data;
      });
      setPublications(pubs);
    } catch (error) {
      console.error("Failed to fetch publications:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateNew = () => {
    setCurrentProduct({
      name: "",
      manufacturer: "",
      platform: "",
      status: "draft",
      allowCanonicalFallback: true,
      content: {
        canonical: "",
        variants: {}
      },
      specs: {
        features: [],
        techTerms: []
      },
      images: []
    });
    setPublications({});
    setIsEditing(true);
  };

  const handleEdit = (p: Product) => {
    setCurrentProduct(p);
    fetchPublications(p.id);
    setIsEditing(true);
  };

  const handlePublishToSite = async (siteId: string) => {
    if (!currentProduct?.id) return;
    setPubLoading(siteId);
    
    try {
      const pubId = `${siteId}_${currentProduct.id}`;
      const existing = publications[siteId];
      
      // Find best variant for this site
      const variants = Object.values(currentProduct.content?.variants || {}) as ContentVariant[];
      const siteSpecific = variants.find(v => v.siteId === siteId && v.status === 'published');
      const global = variants.find(v => v.scope === 'global' && v.status === 'published');
      
      const variantId = siteSpecific?.id || global?.id || "";

      const pubData: SitePublication = {
        id: pubId,
        productId: currentProduct.id,
        siteId,
        status: 'published',
        variantId,
        canonicalFallback: currentProduct.allowCanonicalFallback || false,
        lastSyncedAt: serverTimestamp(),
        error: null
      };

      await setDoc(doc(db, "site_publications", pubId), pubData);
      setPublications({ ...publications, [siteId]: pubData });

      // Simulate Webhook trigger
      const site = sites.find(s => s.id === siteId);
      if (site?.webhookUrl) {
        console.log(`Triggering webhook for ${site.name}: ${site.webhookUrl}`);
        // In a real app, you'd call a cloud function here
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "site_publications");
    } finally {
      setPubLoading(null);
    }
  };

  const handleUnpublishFromSite = async (siteId: string) => {
    if (!currentProduct?.id) return;
    setPubLoading(siteId);
    try {
      const pubId = `${siteId}_${currentProduct.id}`;
      await deleteDoc(doc(db, "site_publications", pubId));
      const newPubs = { ...publications };
      delete newPubs[siteId];
      setPublications(newPubs);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "site_publications");
    } finally {
      setPubLoading(null);
    }
  };

  const handleSave = async () => {
    if (!currentProduct?.name || !currentProduct?.manufacturer) {
      alert("Name and Manufacturer are required.");
      return;
    }

    // Normalization
    const normalizedManufacturer = normalizeManufacturer(currentProduct.manufacturer);
    const normalizedPlatform = currentProduct.platform?.trim() || "";

    try {
      const data = {
        ...currentProduct,
        manufacturer: normalizedManufacturer,
        platform: normalizedPlatform,
        metadata: {
          ...currentProduct.metadata,
          updatedAt: serverTimestamp(),
          createdAt: currentProduct.metadata?.createdAt || serverTimestamp()
        }
      };

      if (currentProduct.id) {
        const { id, ...updateData } = data;
        await updateDoc(doc(db, "products", id), updateData as any);
      } else {
        await addDoc(collection(db, "products"), data);
      }
      
      setIsEditing(false);
      setCurrentProduct(null);
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "products");
    }
  };

  const handleAiRewrite = async (scope: VariantScope = 'global', siteId?: string) => {
    if (!currentProduct?.content?.canonical) {
      alert("Please enter a canonical description first.");
      return;
    }
    
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: currentProduct.content.canonical,
          manufacturer: currentProduct.manufacturer,
          product: currentProduct.name
        })
      });
      const data = await res.json();
      
      if (data.rewritten) {
        const variantId = siteId ? `${siteId}-v${Date.now()}` : `global-v${Date.now()}`;
        const newVariant: ContentVariant = {
          id: variantId,
          text: data.rewritten,
          status: 'generated',
          scope,
          siteId,
          modelName: 'gemini-3-flash',
          promptVersion: 'v1.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        setCurrentProduct({
          ...currentProduct,
          content: {
            ...currentProduct.content!,
            variants: {
              ...currentProduct.content!.variants,
              [variantId]: newVariant
            }
          }
        });
        setActiveVariantId(variantId);
      }
    } catch (error) {
      console.error("AI Rewrite failed:", error);
    } finally {
      setAiLoading(false);
    }
  };

  const updateVariantStatus = (variantId: string, status: VariantStatus) => {
    if (!currentProduct?.content?.variants) return;

    const variants = { ...currentProduct.content.variants };
    const targetVariant = variants[variantId];

    if (status === 'published') {
      // Enforce "at most one published per scope/siteId"
      Object.keys(variants).forEach(id => {
        const v = variants[id];
        if (v.scope === targetVariant.scope && v.siteId === targetVariant.siteId && v.status === 'published') {
          variants[id] = { ...v, status: 'approved', updatedAt: new Date().toISOString() };
        }
      });
    }

    variants[variantId] = { ...targetVariant, status, updatedAt: new Date().toISOString() };

    setCurrentProduct({
      ...currentProduct,
      content: {
        ...currentProduct.content!,
        variants
      }
    });
  };

  const deleteVariant = (variantId: string) => {
    if (!currentProduct?.content?.variants) return;
    const variants = { ...currentProduct.content.variants };
    delete variants[variantId];
    setCurrentProduct({
      ...currentProduct,
      content: {
        ...currentProduct.content!,
        variants
      }
    });
    if (activeVariantId === variantId) setActiveVariantId(null);
  };

  if (isEditing && currentProduct) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto pb-24">
        <header className="flex justify-between items-center">
          <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="flex gap-3">
            <div className="flex items-center gap-2 bg-zinc-800 px-3 py-1 rounded-xl border border-zinc-700">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">Product Status</span>
              <select
                value={currentProduct.status}
                onChange={(e) => setCurrentProduct({ ...currentProduct, status: e.target.value as any })}
                className="bg-transparent text-white text-sm outline-none"
              >
                <option value="draft">Draft</option>
                <option value="approved">Approved</option>
                <option value="published">Published</option>
              </select>
            </div>
            <button
              onClick={handleSave}
              className="bg-brand-blue hover:bg-brand-blue/80 text-white font-bold py-2 px-6 rounded-xl flex items-center gap-2 shadow-lg transition-all"
            >
              <Save className="w-5 h-5" />
              Save Product
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Core Info */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-brand-blue" />
                Core Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Product Name</label>
                  <input
                    type="text"
                    value={currentProduct.name}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-brand-blue outline-none transition-all"
                    placeholder="e.g. Audéo I90"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Manufacturer</label>
                  <select
                    value={currentProduct.manufacturer}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, manufacturer: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-brand-blue outline-none transition-all"
                  >
                    <option value="">Select Manufacturer</option>
                    {CANONICAL_MANUFACTURERS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Platform</label>
                  <input
                    type="text"
                    value={currentProduct.platform}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, platform: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-brand-blue outline-none transition-all"
                    placeholder="e.g. Infinio"
                  />
                </div>
                <div className="flex items-center gap-3 pt-8">
                  <input
                    type="checkbox"
                    id="fallback"
                    checked={currentProduct.allowCanonicalFallback}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, allowCanonicalFallback: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 text-brand-blue focus:ring-brand-blue"
                  />
                  <label htmlFor="fallback" className="text-sm text-zinc-400">Allow Canonical Fallback</label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Canonical Description (Source of Truth)</label>
                <textarea
                  value={currentProduct.content?.canonical}
                  onChange={(e) => setCurrentProduct({ 
                    ...currentProduct, 
                    content: { ...currentProduct.content!, canonical: e.target.value } 
                  })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-brand-blue outline-none transition-all min-h-[150px]"
                  placeholder="Enter the master description..."
                />
              </div>
            </div>

            {/* Images */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
              <ImageUpload
                productId={currentProduct.id || "temp"}
                images={currentProduct.images || []}
                onChange={(images) => setCurrentProduct({ ...currentProduct, images })}
              />
            </div>

            {/* Variants */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-brand-orange" />
                  AI Variants
                </h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleAiRewrite('global')}
                    disabled={aiLoading}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all"
                  >
                    <Globe className="w-3 h-3" />
                    Generate Global
                  </button>
                  <button 
                    onClick={() => {
                      const siteId = prompt("Enter Site ID:");
                      if (siteId) handleAiRewrite('site-specific', siteId);
                    }}
                    disabled={aiLoading}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all"
                  >
                    <Layout className="w-3 h-3" />
                    Generate Site-Specific
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {Object.values(currentProduct.content?.variants || {}).length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-xl">
                    <p className="text-zinc-500 text-sm">No AI variants generated yet.</p>
                  </div>
                ) : (
                  (Object.values(currentProduct.content!.variants) as ContentVariant[]).map(v => (
                    <div 
                      key={v.id} 
                      className={`p-4 rounded-xl border transition-all ${
                        activeVariantId === v.id ? 'bg-brand-blue/5 border-brand-blue/30' : 'bg-zinc-950 border-zinc-800'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            v.scope === 'global' ? 'bg-blue-500/20 text-blue-500' : 'bg-purple-500/20 text-purple-500'
                          }`}>
                            {v.scope === 'global' ? 'Global' : `Site: ${v.siteId}`}
                          </span>
                          <select
                            value={v.status}
                            onChange={(e) => updateVariantStatus(v.id, e.target.value as any)}
                            className="bg-zinc-800 text-xs text-white px-2 py-1 rounded border border-zinc-700 outline-none"
                          >
                            <option value="generated">Generated</option>
                            <option value="approved">Approved</option>
                            <option value="published">Published</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                        <button onClick={() => deleteVariant(v.id)} className="text-zinc-600 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-zinc-300 mb-4">{v.text}</p>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                        <span>Model: {v.modelName} ({v.promptVersion})</span>
                        <span>Updated: {new Date(v.updatedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Specs */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-brand-blue" />
                Specifications
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Features</label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {currentProduct.specs?.features.map(f => (
                      <span key={f} className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded-lg text-xs flex items-center gap-1">
                        {f}
                        <button onClick={() => {
                          const features = currentProduct.specs!.features.filter(x => x !== f);
                          setCurrentProduct({ ...currentProduct, specs: { ...currentProduct.specs!, features } });
                        }}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Add feature and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = e.currentTarget.value.trim();
                        if (val && !currentProduct.specs!.features.includes(val)) {
                          const features = [...currentProduct.specs!.features, val];
                          setCurrentProduct({ ...currentProduct, specs: { ...currentProduct.specs!, features } });
                          e.currentTarget.value = "";
                        }
                      }
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:border-brand-blue outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Tech Terms</label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {currentProduct.specs?.techTerms.map(t => (
                      <span key={t} className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded-lg text-xs flex items-center gap-1">
                        {t}
                        <button onClick={() => {
                          const techTerms = currentProduct.specs!.techTerms.filter(x => x !== t);
                          setCurrentProduct({ ...currentProduct, specs: { ...currentProduct.specs!, techTerms } });
                        }}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Add term and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = e.currentTarget.value.trim();
                        if (val && !currentProduct.specs!.techTerms.includes(val)) {
                          const techTerms = [...currentProduct.specs!.techTerms, val];
                          setCurrentProduct({ ...currentProduct, specs: { ...currentProduct.specs!, techTerms } });
                          e.currentTarget.value = "";
                        }
                      }
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:border-brand-blue outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Metadata Info */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4" />
                History
              </h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Created</span>
                  <span className="text-zinc-300">{currentProduct.metadata?.createdAt ? new Date(currentProduct.metadata.createdAt).toLocaleDateString() : 'New'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Last Updated</span>
                  <span className="text-zinc-300">{currentProduct.metadata?.updatedAt ? new Date(currentProduct.metadata.updatedAt).toLocaleDateString() : 'New'}</span>
                </div>
              </div>
            </div>

            {/* Site Publications */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-brand-blue" />
                Site Publications
              </h2>
              
              <div className="space-y-3">
                {sites.map(site => {
                  const isPublished = !!publications[site.id];
                  const supportsManufacturer = site.supportedManufacturers.includes(currentProduct.manufacturer || "");
                  const isLoading = pubLoading === site.id;

                  return (
                    <div 
                      key={site.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isPublished ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-zinc-950 border-zinc-800'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-white">{site.name}</span>
                            {supportsManufacturer && !isPublished && (
                              <span className="text-[10px] bg-brand-orange/20 text-brand-orange px-1.5 py-0.5 rounded font-bold uppercase">Suggested</span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500 font-mono">{site.domain}</p>
                        </div>

                        <button
                          disabled={isLoading || !currentProduct.id}
                          onClick={() => isPublished ? handleUnpublishFromSite(site.id) : handlePublishToSite(site.id)}
                          className={`p-2 rounded-lg transition-all ${
                            isPublished 
                              ? "bg-emerald-500 text-white hover:bg-emerald-600" 
                              : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                          } disabled:opacity-50`}
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : isPublished ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      
                      {isPublished && (
                        <div className="mt-3 pt-3 border-t border-emerald-500/10 flex justify-between items-center text-[10px]">
                          <span className="text-emerald-500/70 font-medium">
                            Variant: {publications[site.id].variantId || 'Canonical'}
                          </span>
                          <span className="text-zinc-500">
                            Synced: {new Date(publications[site.id].lastSyncedAt?.toDate?.() || publications[site.id].lastSyncedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Products</h1>
          <p className="text-zinc-400">Manage your structured content.</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="bg-brand-blue hover:bg-brand-blue/80 text-white font-semibold py-2 px-4 rounded-xl flex items-center gap-2 transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Product
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {products.map((p) => (
            <div
              key={p.id}
              className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex items-center justify-between"
            >
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-zinc-950 rounded-xl flex items-center justify-center border border-zinc-800">
                  <Package className="w-6 h-6 text-brand-blue" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-white">{p.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      p.status === 'published' ? 'bg-emerald-500/20 text-emerald-500' :
                      p.status === 'approved' ? 'bg-blue-500/20 text-blue-500' :
                      'bg-zinc-800 text-zinc-500'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">{p.manufacturer} • {p.platform}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => handleEdit(p)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all">
                  <Edit2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={async () => {
                    if (confirm("Delete?")) {
                      await deleteDoc(doc(db, "products", p.id));
                      fetchData();
                    }
                  }}
                  className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductEditor;
