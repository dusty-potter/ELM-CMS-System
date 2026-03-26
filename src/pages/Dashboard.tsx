import React, { useEffect, useState } from "react";
import { db, OperationType, handleFirestoreError } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Package, ShieldCheck, Zap, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    products: 0,
    published: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [prSnap, pubSnap] = await Promise.all([
          getDocs(collection(db, "products")),
          getDocs(query(collection(db, "products"), where("status", "==", "published")))
        ]);

        setStats({
          products: prSnap.size,
          published: pubSnap.size
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "dashboard_stats");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const cards = [
    { label: "Total Products", value: stats.products, icon: Package, color: "text-brand-blue", bg: "bg-brand-blue/10", border: "border-brand-blue/20", path: "/products" },
    { label: "Published Content", value: stats.published, icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", path: "/products" },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-white mb-2">CMS Dashboard</h1>
        <p className="text-zinc-400">Manage your hearing aid content.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card) => (
          <Link 
            key={card.label} 
            to={card.path}
            className={`p-6 rounded-2xl border ${card.border} ${card.bg} hover:scale-[1.02] transition-transform group`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl bg-zinc-950/50 ${card.color}`}>
                <card.icon className="w-6 h-6" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors" />
            </div>
            <p className="text-zinc-400 font-medium mb-1">{card.label}</p>
            <p className="text-3xl font-bold text-white">{loading ? "..." : card.value}</p>
          </Link>
        ))}
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Zap className="w-5 h-5 text-brand-orange" />
          Quick Start
        </h2>
        <div className="space-y-4">
          <p className="text-zinc-400 text-sm">1. Add a product in the Products tab.</p>
          <p className="text-zinc-400 text-sm">2. Use AI to rewrite descriptions.</p>
          <p className="text-zinc-400 text-sm">3. Approve and Publish to make it live via API.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
