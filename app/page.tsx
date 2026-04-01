import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-3">ELM CMS</h1>
        <p className="text-zinc-400">Ear Level Marketing — Content Management System</p>
        <p className="text-zinc-600 text-sm mt-1">Migration in progress</p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/ingest"
          className="bg-brand-blue hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-xl text-center transition-colors"
        >
          Research a Product
        </Link>
      </div>
    </div>
  )
}
