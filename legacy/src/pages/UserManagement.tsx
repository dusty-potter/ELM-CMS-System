import React, { useEffect, useState } from "react";
import { db, OperationType, handleFirestoreError } from "../firebase";
import { collection, getDocs, updateDoc, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { UserProfile } from "../types";
import { 
  Users, 
  Shield, 
  User as UserIcon, 
  Mail, 
  Calendar,
  Check,
  X,
  ShieldAlert,
  ShieldCheck,
  UserPlus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setUsers(snap.docs.map(d => ({ ...d.data() } as UserProfile)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (uid: string, newRole: UserProfile['role']) => {
    setUpdatingId(uid);
    try {
      await updateDoc(doc(db, "users", uid), {
        role: newRole,
        updatedAt: serverTimestamp()
      });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <ShieldCheck className="w-4 h-4 text-brand-blue" />;
      case 'editor': return <Shield className="w-4 h-4 text-blue-500" />;
      default: return <UserIcon className="w-4 h-4 text-zinc-500" />;
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
          <p className="text-zinc-400">Manage access and roles for the HearingCMS platform.</p>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {users.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-12 text-center">
              <Users className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500">No users found. Users are automatically added when they first sign in.</p>
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.uid}
                className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex items-center justify-between"
              >
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <img 
                      src={user.photoURL || ""} 
                      alt={user.displayName} 
                      className="w-12 h-12 rounded-xl border border-zinc-800"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-zinc-900 rounded-full p-1 border border-zinc-800">
                      {getRoleIcon(user.role)}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-white">{user.displayName}</h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        user.role === 'admin' ? 'bg-brand-blue/20 text-brand-blue' :
                        user.role === 'editor' ? 'bg-emerald-500/20 text-emerald-500' :
                        'bg-zinc-800 text-zinc-500'
                      }`}>
                        {user.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Joined {new Date(user.createdAt?.toDate?.() || user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-1">
                    {(['viewer', 'editor', 'admin'] as const).map((role) => (
                      <button
                        key={role}
                        disabled={updatingId === user.uid}
                        onClick={() => handleRoleChange(user.uid, role)}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${
                          user.role === role 
                            ? "bg-zinc-800 text-white shadow-sm" 
                            : "text-zinc-600 hover:text-zinc-400"
                        } ${updatingId === user.uid ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default UserManagement;
