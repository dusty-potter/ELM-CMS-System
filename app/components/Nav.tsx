'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'

type NavLink = { href: string; label: string }

const ROLE_LINKS: Record<string, NavLink[]> = {
  admin: [
    { href: '/products', label: 'Products' },
    { href: '/platforms', label: 'Platforms' },
    { href: '/manufacturers', label: 'Brands' },
    { href: '/sites', label: 'Sites' },
    { href: '/cms/sites', label: 'CMS Sites' },
    { href: '/users', label: 'Users' },
    { href: '/scan', label: 'Scan Lineup' },
    { href: '/ingest', label: 'Research' },
    { href: '/intake', label: 'Intake' },
  ],
  editor: [
    { href: '/products', label: 'Products' },
    { href: '/platforms', label: 'Platforms' },
    { href: '/manufacturers', label: 'Brands' },
    { href: '/sites', label: 'Sites' },
    { href: '/scan', label: 'Scan Lineup' },
    { href: '/ingest', label: 'Research' },
  ],
  viewer: [
    { href: '/products', label: 'Products' },
    { href: '/sites', label: 'Sites' },
  ],
  operator: [
    { href: '/intake', label: 'Intake' },
    { href: '/sites', label: 'Sites' },
  ],
}

export default function Nav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role ?? ''
  const links = ROLE_LINKS[role] ?? []

  // Hide nav on sign-in page
  if (pathname?.startsWith('/auth')) return null

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
                pathname === link.href || pathname.startsWith(link.href + '/')
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {session?.user && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">{session.user.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
