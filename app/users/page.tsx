'use client'

import { useEffect, useState } from 'react'

type User = {
  id: string
  email: string
  name: string | null
  image: string | null
  role: 'admin' | 'editor' | 'viewer'
  active: boolean
  lastSignIn: string | null
  createdAt: string
}

const ROLE_STYLES: Record<string, string> = {
  admin:  'bg-brand-blue/20 text-brand-blue border-brand-blue/30',
  editor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  viewer: 'bg-zinc-800 text-zinc-500 border-zinc-700',
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'viewer' as User['role'] })
  const [saving, setSaving] = useState(false)

  function fetchUsers() {
    fetch('/api/cms/users')
      .then((r) => r.json())
      .then((data) => { if (data.error) throw new Error(data.error); setUsers(data) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [])

  async function handleAdd() {
    if (!newUser.email) return
    setSaving(true)
    try {
      const res = await fetch('/api/cms/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUsers((prev) => [...prev, data])
      setIsAdding(false)
      setNewUser({ email: '', name: '', role: 'viewer' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add user')
    } finally {
      setSaving(false)
    }
  }

  async function handleRoleChange(id: string, role: User['role']) {
    const res = await fetch('/api/cms/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role }),
    })
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role } : u))
    }
  }

  async function handleToggleActive(id: string, active: boolean) {
    const res = await fetch('/api/cms/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active }),
    })
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, active } : u))
    }
  }

  async function handleDelete(id: string, email: string) {
    if (!confirm(`Remove ${email}? They will no longer be able to sign in.`)) return
    const res = await fetch('/api/cms/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== id))
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Manage who can access ELM CMS.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-brand-blue hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          + Invite User
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {/* Add form */}
      {isAdding && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Add User</h2>
          <p className="text-zinc-500 text-xs">The user must sign in with the Google account matching this email.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Email</label>
              <input
                type="email"
                placeholder="user@example.com"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Role</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as User['role'] })}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Name <span className="text-zinc-700 normal-case font-normal">(optional — will update on first sign-in)</span></label>
              <input
                type="text"
                placeholder="Full name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setIsAdding(false)} className="text-zinc-500 hover:text-zinc-300 text-sm px-4 py-2 transition-colors">Cancel</button>
            <button
              onClick={handleAdd}
              disabled={saving || !newUser.email}
              className="bg-white text-black font-bold text-sm px-6 py-2 rounded-xl hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Adding…' : 'Add User'}
            </button>
          </div>
        </div>
      )}

      {/* User list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-zinc-700 border-t-brand-blue rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {users.length === 0 ? (
            <div className="text-center py-20 text-zinc-600">No users yet.</div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className={`bg-zinc-900 border rounded-2xl px-5 py-4 flex items-center gap-4 transition-colors ${user.active ? 'border-zinc-800' : 'border-zinc-800/50 opacity-60'}`}
              >
                {/* Avatar */}
                {user.image ? (
                  <img src={user.image} alt={user.name ?? ''} className="w-10 h-10 rounded-xl border border-zinc-700 shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-400 shrink-0">
                    {user.name?.[0] ?? user.email[0].toUpperCase()}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white text-sm">{user.name ?? '—'}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${ROLE_STYLES[user.role]}`}>
                      {user.role}
                    </span>
                    {!user.active && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-600 border border-zinc-700">Inactive</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{user.email}</p>
                  {user.lastSignIn && (
                    <p className="text-[10px] text-zinc-600 mt-0.5">Last sign in: {new Date(user.lastSignIn).toLocaleDateString()}</p>
                  )}
                </div>

                {/* Role selector */}
                <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-1 shrink-0">
                  {(['viewer', 'editor', 'admin'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => handleRoleChange(user.id, r)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-colors ${
                        user.role === r ? 'bg-zinc-700 text-white' : 'text-zinc-600 hover:text-zinc-400'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {/* Active toggle + delete */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleActive(user.id, !user.active)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      user.active
                        ? 'border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
                        : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                    }`}
                  >
                    {user.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDelete(user.id, user.email)}
                    className="text-zinc-700 hover:text-red-400 transition-colors text-lg leading-none"
                    title="Remove user"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
