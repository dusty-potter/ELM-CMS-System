'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/products',  label: 'Products' },
  { href: '/sites',     label: 'Sites' },
  { href: '/users',     label: 'Users' },
  { href: '/scan',      label: 'Scan Lineup' },
  { href: '/ingest',    label: 'Research' },
]

export default function Nav() {
  const pathname = usePathname()

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
      </div>
    </nav>
  )
}
