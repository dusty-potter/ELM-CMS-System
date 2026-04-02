import Link from 'next/link'
import { prisma } from '@/lib/prisma'

async function getStats() {
  try {
    const [total, published, sites] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { status: 'published' } }),
      prisma.site.count(),
    ])
    return { total, published, sites }
  } catch {
    return { total: null, published: null, sites: null }
  }
}

export default async function Home() {
  const stats = await getStats()

  const cards = [
    { label: 'Products', value: stats.total, href: '/products', color: 'text-brand-blue', border: 'border-brand-blue/20', bg: 'bg-brand-blue/5' },
    { label: 'Published', value: stats.published, href: '/products', color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
    { label: 'Connected Sites', value: stats.sites, href: '/sites', color: 'text-brand-orange', border: 'border-brand-orange/20', bg: 'bg-brand-orange/5' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-white">ELM CMS</h1>
        <p className="text-zinc-500 mt-1">Ear Level Marketing — Content Management System</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`${card.bg} border ${card.border} rounded-2xl p-6 hover:scale-[1.02] transition-transform`}
          >
            <p className="text-zinc-500 text-sm font-medium mb-2">{card.label}</p>
            <p className={`text-4xl font-bold ${card.color}`}>
              {card.value ?? '—'}
            </p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href="/scan" className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl px-5 py-4 transition-colors">
            <p className="font-semibold text-white text-sm">Scan Manufacturer Lineup</p>
            <p className="text-zinc-500 text-xs mt-1">Enumerate and bulk-research an entire brand's products</p>
          </Link>
          <Link href="/ingest" className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl px-5 py-4 transition-colors">
            <p className="font-semibold text-white text-sm">Research a Single Product</p>
            <p className="text-zinc-500 text-xs mt-1">Deep-research one product and save it to the CMS</p>
          </Link>
          <Link href="/products" className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl px-5 py-4 transition-colors">
            <p className="font-semibold text-white text-sm">View All Products</p>
            <p className="text-zinc-500 text-xs mt-1">Browse, filter, and manage the product catalog</p>
          </Link>
          <Link href="/sites" className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl px-5 py-4 transition-colors">
            <p className="font-semibold text-white text-sm">Manage Connected Sites</p>
            <p className="text-zinc-500 text-xs mt-1">Add client sites and manage their API keys</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
