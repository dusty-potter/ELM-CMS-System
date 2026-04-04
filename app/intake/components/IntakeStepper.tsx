const SECTION_LABELS = [
  'Site Scan',
  'Business Info',
  'Team & Products',
  'Operational Fit',
  'Current Site',
  'Brand & Style',
  'Risks & Overrides',
  'Review & Launch',
]

type Props = {
  current: number
  onNavigate: (index: number) => void
}

export default function IntakeStepper({ current, onNavigate }: Props) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {SECTION_LABELS.map((label, i) => {
        const isActive = i === current
        const isPast = i < current
        return (
          <button
            key={i}
            onClick={() => onNavigate(i)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-brand-blue text-white'
                : isPast
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isActive
                  ? 'bg-white/20 text-white'
                  : isPast
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-zinc-700 text-zinc-500'
              }`}
            >
              {isPast ? '\u2713' : i}
            </span>
            {label}
          </button>
        )
      })}
    </div>
  )
}
