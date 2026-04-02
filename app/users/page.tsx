'use client'

// Users page — placeholder until authentication is implemented.
// Displays a clear status and outlines what this section will manage.

export default function UsersPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Manage access and roles for the ELM CMS.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
          <h2 className="text-white font-semibold">Authentication not yet configured</h2>
        </div>
        <p className="text-zinc-400 text-sm leading-relaxed">
          User management requires an authentication layer. Once auth is set up, this section will support:
        </p>
        <ul className="space-y-2 text-sm text-zinc-500">
          {[
            'Viewing all users who have signed in',
            'Assigning roles — Admin, Editor, Viewer',
            'Revoking access',
            'Inviting new team members by email',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-zinc-700 mt-0.5">–</span>
              {item}
            </li>
          ))}
        </ul>
        <div className="pt-2 border-t border-zinc-800 text-xs text-zinc-600">
          Recommended: NextAuth.js with Google OAuth, or Clerk for a managed solution.
        </div>
      </div>
    </div>
  )
}
