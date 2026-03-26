import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { auth, login, logout } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { 
  LayoutDashboard, 
  Building2, 
  Layers, 
  Package, 
  Users,
  Globe,
  LogOut, 
  LogIn, 
  ExternalLink, 
  ChevronRight,
  ShieldCheck,
  Zap,
  History as HistoryIcon,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Pages
import Dashboard from "./pages/Dashboard";
import ProductEditor from "./pages/ProductEditor";
import PublicAPI from "./pages/PublicAPI";
import UserManagement from "./pages/UserManagement";
import SiteManagement from "./pages/SiteManagement";
import { UserProfile } from "./types";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, OperationType, handleFirestoreError } from "./firebase";
import { Logo } from "./components/Logo";

const Layout: React.FC<{ children: React.ReactNode; user: User | null; userProfile: UserProfile | null }> = ({ children, user, userProfile }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/products", icon: Package, label: "Products" },
    { path: "/sites", icon: Globe, label: "Sites" },
    { path: "/api-docs", icon: ExternalLink, label: "Public API" },
  ];

  if (userProfile?.role === 'admin') {
    navItems.push({ path: "/users", icon: Users, label: "Users" });
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl"
        >
          <div className="flex justify-center mb-6">
            <Logo className="w-24 h-24" />
          </div>
          <h1 className="text-2xl font-bold text-white text-center mb-2">Ear Level CMS</h1>
          <p className="text-zinc-400 text-center mb-8">Multi-site content management for hearing technology.</p>
          <button
            onClick={login}
            className="w-full bg-brand-blue hover:bg-brand-blue/80 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 flex flex-col fixed h-full bg-zinc-950 z-50">
        <div className="p-6">
          <Logo className="w-10 h-10" showText />
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? "bg-brand-blue/10 text-brand-blue border border-brand-blue/20" 
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 px-4 py-3 mb-4">
            <img 
              src={user.photoURL || ""} 
              alt={user.displayName || ""} 
              className="w-8 h-8 rounded-full border border-zinc-700"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.displayName}</p>
              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Sync user profile to Firestore
        const userRef = doc(db, "users", u.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          const newProfile: UserProfile = {
            uid: u.uid,
            email: u.email || "",
            displayName: u.displayName || "",
            photoURL: u.photoURL || "",
            role: u.email === "dusty@earlevelmarketing.com" ? "admin" : "viewer",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          await setDoc(userRef, newProfile);
          setUserProfile(newProfile);
        } else {
          setUserProfile(userSnap.data() as UserProfile);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <Layout user={user} userProfile={userProfile}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<ProductEditor />} />
          <Route path="/products/:id" element={<ProductEditor />} />
          <Route path="/api-docs" element={<PublicAPI />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/sites" element={<SiteManagement />} />
        </Routes>
      </Layout>
    </Router>
  );
}
