import type { IntakeData, Location } from '../page'

type Props = {
  data: IntakeData
  updateData: (partial: Partial<IntakeData>) => void
}

const PRACTICE_TYPES = [
  'Audiologist',
  'Hearing Instrument Specialist',
  'ENT',
  'Multi-location Group',
]

const EMPTY_LOCATION: Location = { name: '', address: '', city: '', state: '', zip: '', phone: '' }

export default function Section1BusinessInfo({ data, updateData }: Props) {
  function updateLocation(index: number, field: keyof Location, value: string) {
    const locs = [...data.locations]
    locs[index] = { ...locs[index], [field]: value }
    updateData({ locations: locs })
  }

  function addLocation() {
    updateData({ locations: [...data.locations, { ...EMPTY_LOCATION }] })
  }

  function removeLocation(index: number) {
    updateData({ locations: data.locations.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Business Info</h2>
        <p className="text-sm text-zinc-500">Core business details for the client.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
            Business Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={data.businessName}
            onChange={(e) => updateData({ businessName: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
            Domain <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={data.domain}
            onChange={(e) => updateData({ domain: e.target.value })}
            placeholder="example-hearing.com"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
            Practice Type <span className="text-red-400">*</span>
          </label>
          <select
            value={data.practiceType}
            onChange={(e) => updateData({ practiceType: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors"
          >
            <option value="">Select...</option>
            {PRACTICE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
            Main Phone Number
          </label>
          <input
            type="tel"
            value={data.primaryPhone}
            onChange={(e) => updateData({ primaryPhone: e.target.value })}
            placeholder="(555) 123-4567"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
          Service Area
        </label>
        <input
          type="text"
          value={data.serviceArea}
          onChange={(e) => updateData({ serviceArea: e.target.value })}
          placeholder="e.g. Greater Phoenix Metro, Maricopa County"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors"
        />
      </div>

      {/* Locations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-zinc-500 uppercase">Locations</label>
          <button
            onClick={addLocation}
            className="text-xs text-brand-blue hover:text-blue-400 font-semibold transition-colors"
          >
            + Add Location
          </button>
        </div>

        {data.locations.length === 0 && (
          <p className="text-sm text-zinc-600 italic">
            No locations added. The main phone and service area will be used as the primary location.
          </p>
        )}

        {data.locations.map((loc, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-bold">Location {i + 1}</span>
              <button
                onClick={() => removeLocation(i)}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={loc.name}
                onChange={(e) => updateLocation(i, 'name', e.target.value)}
                placeholder="Location name"
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-blue outline-none transition-colors"
              />
              <input
                type="tel"
                value={loc.phone}
                onChange={(e) => updateLocation(i, 'phone', e.target.value)}
                placeholder="Phone"
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-blue outline-none transition-colors"
              />
            </div>
            <input
              type="text"
              value={loc.address}
              onChange={(e) => updateLocation(i, 'address', e.target.value)}
              placeholder="Street address"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-blue outline-none transition-colors"
            />
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                value={loc.city}
                onChange={(e) => updateLocation(i, 'city', e.target.value)}
                placeholder="City"
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-blue outline-none transition-colors"
              />
              <input
                type="text"
                value={loc.state}
                onChange={(e) => updateLocation(i, 'state', e.target.value)}
                placeholder="State"
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-blue outline-none transition-colors"
              />
              <input
                type="text"
                value={loc.zip}
                onChange={(e) => updateLocation(i, 'zip', e.target.value)}
                placeholder="ZIP"
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-blue outline-none transition-colors"
              />
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
          Primary Services
        </label>
        <textarea
          value={data.primaryServices}
          onChange={(e) => updateData({ primaryServices: e.target.value })}
          placeholder="Hearing evaluations, hearing aid fittings, tinnitus management, cerumen removal..."
          rows={3}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors resize-y"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
          Credentials & Certifications
        </label>
        <textarea
          value={data.credentials}
          onChange={(e) => updateData({ credentials: e.target.value })}
          placeholder="Au.D., CCC-A, Board Certified in Audiology..."
          rows={2}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-blue outline-none transition-colors resize-y"
        />
      </div>
    </div>
  )
}
