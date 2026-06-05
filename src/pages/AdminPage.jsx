import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'
import { useAuth } from '../lib/AuthContext'

function AccessDenied() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'rgba(239,68,68,0.10)' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <h1 className="text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>Access denied</h1>
      <p className="max-w-xs text-[13px]" style={{ color: 'var(--text-muted)' }}>
        You don't have admin permissions. Contact your CASI admin if you think this is a mistake.
      </p>
    </div>
  )
}

export default function AdminPage() {
  const { user, isAdmin } = useAuth()

  if (!isAdmin) return <AccessDenied />

  return <AdminPanel />
}

function AdminPanel() {
  const [users, setUsers]       = useState([])
  const [config, setConfig]     = useState([])
  const [newEmail, setNewEmail] = useState('')
  const [adding, setAdding]     = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  const load = async () => {
    try {
      const [uRes, cRes] = await Promise.all([
        apiFetch('/api/admin/users'),
        apiFetch('/api/admin/config'),
      ])
      if (uRes.ok) setUsers(await uRes.json())
      if (cRes.ok) setConfig(await cRes.json())
    } catch {}
  }

  useEffect(() => { load() }, [])

  const flash = (msg, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(''), 4000) }
    else         { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }
  }

  const handleAdd = async () => {
    if (!newEmail.trim()) return
    setAdding(true)
    try {
      const res  = await apiFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { flash(data.error || 'Failed to add user', true); return }
      setNewEmail('')
      flash(`✓ ${data.added} can now sign in`)
      load()
    } catch (e) { flash(e.message, true) }
    finally { setAdding(false) }
  }

  const handleRemove = async (email) => {
    try {
      const res = await apiFetch(`/api/admin/users/${encodeURIComponent(email)}`, { method: 'DELETE' })
      if (!res.ok) { flash('Failed to remove user', true); return }
      flash(`Removed ${email}`)
      load()
    } catch (e) { flash(e.message, true) }
  }

  const handleConfigSave = async (key, value) => {
    try {
      const res = await apiFetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      if (res.ok) flash(`✓ ${key} updated to ${value}`)
      else flash('Failed to save config', true)
    } catch (e) { flash(e.message, true) }
  }

  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text-strong)' }}>Admin Panel</h1>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--text-dim)' }}>
            Manage who can access CASI and configure app settings.
          </p>
        </div>

        {/* Flash messages */}
        {success && (
          <div className="rounded-lg px-4 py-3 text-[13px]"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}>
            {success}
          </div>
        )}
        {error && (
          <div className="rounded-lg px-4 py-3 text-[13px]"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
            {error}
          </div>
        )}

        {/* Add user */}
        <div className="panel rounded-2xl p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-dim)' }}>
            Add User
          </h2>
          <p className="text-[12px] mb-3" style={{ color: 'var(--text-muted)' }}>
            Enter the user's Gmail address. They can sign in with Google immediately after being added.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="user@gmail.com"
              className="flex-1 rounded-lg border bg-transparent px-3 py-2 text-[13px] outline-none"
              style={{ borderColor: 'var(--line2)', color: 'var(--text)' }}
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newEmail.trim()}
              className="rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold disabled:opacity-40 transition"
              style={{ color: 'var(--accent-fg)' }}
            >
              {adding ? 'Adding…' : 'Add User'}
            </button>
          </div>
        </div>

        {/* User list */}
        <div className="panel rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'var(--line)' }}>
            <h2 className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
              Allowed Users
            </h2>
            <span className="font-mono text-[10px] rounded-md px-1.5 py-0.5"
              style={{ background: 'var(--card2)', color: 'var(--text-dim)' }}>
              {users.length}
            </span>
          </div>

          {users.length === 0 ? (
            <div className="px-5 py-10 text-center text-[13px]" style={{ color: 'var(--text-dim)' }}>
              No users added yet. Add a Gmail address above to grant access.
            </div>
          ) : (
            <div>
              {users.map((u) => (
                <div key={u.id}
                  className="flex items-center justify-between px-5 py-3 border-b last:border-b-0"
                  style={{ borderColor: 'var(--line)' }}
                >
                  <div>
                    <div className="text-[13px] font-medium" style={{ color: 'var(--text-strong)' }}>{u.email}</div>
                    <div className="mt-0.5 text-[11px]" style={{ color: 'var(--text-dim)' }}>
                      Added {u.added_at ? new Date(u.added_at).toLocaleDateString() : '—'}
                      {u.last_login && ` · Last login ${new Date(u.last_login).toLocaleDateString()}`}
                      {u.added_by && ` · by ${u.added_by}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(u.email)}
                    className="rounded-md border px-2.5 py-1 text-[11px] font-medium transition hover:border-red-400 hover:text-red-400"
                    style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Config */}
        <div className="panel rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--line)' }}>
            <h2 className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
              App Configuration
            </h2>
          </div>
          {config.map((c) => (
            <ConfigRow key={c.key} config={c} onSave={handleConfigSave} />
          ))}
        </div>

      </div>
    </div>
  )
}

function ConfigRow({ config, onSave }) {
  const [val, setVal] = useState(config.value)
  const dirty = val !== config.value

  const labels = {
    max_uploads_per_user: { label: 'Max uploads per user', hint: 'Maximum Excel files a user can upload per project (0 = unlimited)' }
  }
  const meta = labels[config.key] || { label: config.key, hint: '' }

  return (
    <div className="flex items-center justify-between px-5 py-4 border-b last:border-b-0" style={{ borderColor: 'var(--line)' }}>
      <div className="flex-1">
        <div className="text-[13px] font-medium" style={{ color: 'var(--text-strong)' }}>{meta.label}</div>
        {meta.hint && <div className="mt-0.5 text-[11px]" style={{ color: 'var(--text-dim)' }}>{meta.hint}</div>}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number" min="1" max="100"
          value={val}
          onChange={e => setVal(e.target.value)}
          className="w-16 rounded-md border bg-transparent px-2 py-1 text-right font-mono text-[13px] outline-none"
          style={{ borderColor: 'var(--line2)', color: 'var(--text)' }}
        />
        {dirty && (
          <button
            onClick={() => onSave(config.key, val)}
            className="rounded-md bg-accent px-3 py-1 text-[11px] font-semibold"
            style={{ color: 'var(--accent-fg)' }}
          >
            Save
          </button>
        )}
      </div>
    </div>
  )
}
