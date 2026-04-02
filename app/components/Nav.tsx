'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'

const links = [
  { href: '/products',  label: 'Products' },
  { href: '/sites',     label: 'Sites' },
  { href: '/users',     label: 'Users' },
  { href: '/scan',      label: 'Scan Lineup' },
  { href: '/ingest',    label: 'Research' },
]

export default function Nav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur border-b border-zinc-800">
      <div className="max-w-6xl mx-auto px-4 flex items-center gap-1 h-14">
        <Link href="/" className="text-white font-bold text-sm mr-4 shrink-0">
          ELM CMS
        </Link>

        <div className="flex-1 flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                pathname === link.href
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* User menu */}
        {session?.user && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 pl-2 hover:opacity-80 transition-opacity"
            >
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name ?? ''}
                  className="w-7 h-7 rounded-full border border-zinc-700"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-white font-bold">
                  {session.user.name?.[0] ?? '?'}
                </div>
              )}
              <span className="text-xs text-zinc-400 hidden sm:block">{session.user.name}</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-10 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl py-1 min-w-[160px]">
                <div className="px-4 py-2 border-b border-zinc-800">
                  <p className="text-xs text-white font-semibold truncate">{session.user.name}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{session.user.email}</p>
                  {(session.user as { role?: string }).role && (
                    <p className="text-[10px] text-brand-blue font-bold uppercase mt-0.5">
                      {(session.user as { role?: string }).role}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => { setMenuOpen(false); signOut({ callbackUrl: '/auth/signin' }) }}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
