import type { IntakeData, TeamMember } from '../page'

type Props = {
  data: IntakeData
  updateData: (partial: Partial<IntakeData>) => void
}

const MANUFACTURERS = [
  'Signia',
  'Widex',
  'Phonak',
  'Oticon',
  'ReSound',
  'Starkey',
  'Unitron',
  'Bernafon',
  'Audibel',
  'Miracle-Ear',
]

export default function Section2TeamProducts({ data, updateData }: Props) {
  function updateMember(index: number, field: keyof TeamMember, value: string) {
    const members = [...data.teamMembers]
    members[index] = { ...members[index], [field]: value }
    updateData({ teamMembers: members })
  }

  function addMember() {
    updateData({
      teamMembers: [...data.teamMembers, { name: '', title: '', credentials: '' }],
    })
  }

  function removeMember(index: number) {
    updateData({ teamMembers: data.teamMembers.filter((_, i) => i !== index) })
  }

  function toggleManufacturer(name: string, list: 'manufacturersCarried' | 'featuredManufacturers') {
    const current = data[list]
    if (current.includes(name)) {
      updateData({ [list]: current.filter((m) => m !== name) })
    } else {
      updateData({ [list]: [...current, name] })
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Team & Products</h2>
        <p className="text-sm text-zinc-500">
          Team members and hearing aid manufacturers the practice carries.
        </p>
      </div>

      {/* Team Members */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-500 uppercase">Team Members</label>
          <button
            onClick={addMember}
            className="text-xs text-brand-blue hover:text-blue-400 font-semibold transition-colors"
          >
            + Add Member
          </button>
        </div>

        {data.teamMembers.length === 0 && (
          <p className="text-sm text-zinc-600 italic">No team members added yet.</p>
        )}

        {data.teamMembers.map((member, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-bold">Member {i + 1}</span>
              <button
                onClick={() => removeMember(i)}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={member.name}
                onChange={(e) => updateMember(i, 'name', e.target.value)}
                placeholder="Name"
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-blue outline-none transition-colors"
              />
              <input
                type="text"
                value={member.title}
                onChange={(e) => updateMember(i, 'title', e.target.value)}
                placeholder="Title"
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-blue outline-none transition-colors"
              />
              <input
                type="text"
                value={member.credentials}
                onChange={(e) => updateMember(i, 'credentials', e.target.value)}
                placeholder="Credentials"
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-blue outline-none transition-colors"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Manufacturers Carried */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-zinc-500 uppercase">
          Manufacturers Carried
        </label>
        <div className="flex flex-wrap gap-2">
          {MANUFACTURERS.map((m) => {
            const selected = data.manufacturersCarried.includes(m)
            return (
              <button
                key={m}
                onClick={() => toggleManufacturer(m, 'manufacturersCarried')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selected
                    ? 'bg-brand-blue text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {m}
              </button>
            )
          })}
        </div>
      </div>

      {/* Featured Manufacturers (subset of carried) */}
      {data.manufacturersCarried.length > 0 && (
        <div className="space-y-3">
          <label className="block text-xs font-bold text-zinc-500 uppercase">
            Featured Manufacturers{' '}
            <span className="text-zinc-600 normal-case font-normal">
              (subset of carried — shown prominently on site)
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            {data.manufacturersCarried.map((m) => {
              const featured = data.featuredManufacturers.includes(m)
              return (
                <button
                  key={m}
                  onClick={() => toggleManufacturer(m, 'featuredManufacturers')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    featured
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {m}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
