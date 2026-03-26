import React, { useEffect, useState } from "react";
import { db, OperationType, handleFirestoreError } from "../firebase";
import { collection, getDocs, setDoc, doc, serverTimestamp, query, orderBy, deleteDoc } from "firebase/firestore";
import { Site } from "../types";
import { 
  Globe, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Settings, 
  CheckCircle2, 
  XCircle,
  Webhook,
  Key,
  Building2,
  RefreshCw,
  ExternalLink as LinkIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const SiteManagement: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [syncingSiteId, setSyncingSiteId] = useState<string | null>(null);
  const [newSite, setNewSite] = useState<Partial<Site>>({
    active: true,
    supportedManufacturers: []
  });

  const manufacturers = ["Oticon", "Phonak", "ReSound", "Starkey", "Widex", "Signia"];

  const fetchSites = async () => {
    try {
      const q = query(collection(db, "sites"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setSites(snap.docs.map(d => ({ ...d.data() } as Site)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "sites");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const handleAddSite = async () => {
    if (!newSite.id || !newSite.name || !newSite.domain) return;
    
    try {
      const siteData: Site = {
        ...newSite as Site,
        apiKey: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, "sites", siteData.id), siteData);
      setSites([siteData, ...sites]);
      setIsAdding(false);
      setNewSite({ active: true, supportedManufacturers: [] });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `sites/${newSite.id}`);
    }
  };

  const handleDeleteSite = async (id: string) => {
    if (!confirm("Are you sure you want to delete this site? All publication records will be orphaned.")) return;
    try {
      await deleteDoc(doc(db, "sites", id));
      setSites(sites.filter(s => s.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sites/${id}`);
    }
  };

  const toggleManufacturer = (m: string) => {
    const current = newSite.supportedManufacturers || [];
    if (current.includes(m)) {
      setNewSite({ ...newSite, supportedManufacturers: current.filter(x => x !== m) });
    } else {
      setNewSite({ ...newSite, supportedManufacturers: [...current, m] });
    }
  };

  const handleTriggerSync = async (site: Site) => {
    if (!site.webhookUrl) {
      alert("Please configure a Webhook URL first.");
      return;
    }
    
    setSyncingSiteId(site.id);
    try {
      // Simulate webhook call
      console.log(`Triggering manual sync for ${site.name} at ${site.webhookUrl}`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert(`Sync event sent to ${site.name}`);
    } catch (error) {
      console.error("Sync failed:", error);
      alert("Failed to trigger sync.");
    } finally {
      setSyncingSiteId(null);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Connected Sites</h1>
          <p className="text-zinc-400">Manage external websites that consume your hearing aid content.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-brand-blue hover:bg-brand-blue/80 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-semibold transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Site
        </button>
      </header>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 overflow-hidden"
          >
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Globe className="w-5 h-5 text-brand-blue" />
              Register New Site
            </h2>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Site ID (slug)</label>
                  <input
                    type="text"
                    placeholder="e.g. hearing-center-seattle"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-blue"
                    value={newSite.id || ""}
                    onChange={e => setNewSite({ ...newSite, id: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Site Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Hearing Center Seattle"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-blue"
                    value={newSite.name || ""}
                    onChange={e => setNewSite({ ...newSite, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Domain</label>
                  <input
                    type="text"
                    placeholder="e.g. hearingseattle.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-blue"
                    value={newSite.domain || ""}
                    onChange={e => setNewSite({ ...newSite, domain: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Google Project ID</label>
                  <input
                    type="text"
                    placeholder="e.g. ai-studio-project-123"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-blue"
                    value={newSite.googleProjectId || ""}
                    onChange={e => setNewSite({ ...newSite, googleProjectId: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Webhook URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="https://site.com/api/revalidate"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-blue"
                    value={newSite.webhookUrl || ""}
                    onChange={e => setNewSite({ ...newSite, webhookUrl: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Supported Manufacturers</label>
                  <div className="flex flex-wrap gap-2">
                    {manufacturers.map(m => (
                      <button
                        key={m}
                        onClick={() => toggleManufacturer(m)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          newSite.supportedManufacturers?.includes(m)
                            ? "bg-brand-blue/10 border-brand-blue/50 text-brand-blue"
                            : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsAdding(false)}
                className="px-6 py-2 text-zinc-400 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSite}
                className="bg-white text-black px-8 py-2 rounded-xl font-bold hover:bg-zinc-200 transition-all"
              >
                Save Site
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sites.map(site => (
            <div
              key={site.id}
              className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center">
                    <Globe className="w-6 h-6 text-zinc-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      {site.name}
                      {site.active ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-zinc-500" />
                      )}
                    </h3>
                    <p className="text-sm text-zinc-500 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      {site.domain}
                    </p>
                    {site.googleProjectId && (
                      <p className="text-[10px] text-zinc-600 font-mono mt-1 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        Project: {site.googleProjectId}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {site.googleProjectId && (
                    <a 
                      href={`https://console.cloud.google.com/home/dashboard?project=${site.googleProjectId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-zinc-600 hover:text-blue-400 transition-all"
                      title="Open Cloud Console"
                    >
                      <LinkIcon className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => handleDeleteSite(site.id)}
                    className="p-2 text-zinc-600 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Building2 className="w-4 h-4 text-zinc-500" />
                    {site.supportedManufacturers.map(m => (
                      <span key={m} className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase rounded">
                        {m}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => handleTriggerSync(site)}
                    disabled={syncingSiteId === site.id}
                    className="flex items-center gap-2 text-[10px] font-bold uppercase text-brand-orange hover:text-brand-orange/80 transition-colors disabled:opacity-50"
                  >
                    {syncingSiteId === site.id ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    Trigger Sync
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase mb-1 flex items-center gap-1">
                      <Key className="w-3 h-3" /> API Key
                    </p>
                    <p className="text-xs text-zinc-400 font-mono truncate">{site.apiKey}</p>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase mb-1 flex items-center gap-1">
                      <Webhook className="w-3 h-3" /> Webhook
                    </p>
                    <p className="text-xs text-zinc-400 truncate">{site.webhookUrl || "Not configured"}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SiteManagement;
