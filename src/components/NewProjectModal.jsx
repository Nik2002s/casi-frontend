import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../lib/api'

export default function NewProjectModal({ onClose, onCreated }) {
  const [name, setName]         = useState('')
  const [desc, setDesc]         = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const inputRef = useRef(null)

  // Focus name field on open; close on Escape
  useEffect(() => {
    inputRef.current?.focus()
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleCreate = async () => {
    if (!name.trim()) { setError('Project name is required'); return }
    setSaving(true)
    setError('')
    try {
      const res = await apiFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: desc.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create project')
      onCreated(data) // { id, name, description, api_key, ... }
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="panel w-[480px] rounded-2xl p-6" style={{ background: 'var(--card)' }}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-strong)' }}>New Project</h2>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-md text-[16px] transition hover:bg-[var(--card2)]"
            style={{ color: 'var(--text-dim)' }}
          >✕</button>
        </div>

        <div className="mt-5 space-y-4">
          {/* Name */}
          <div>
            <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
              Project Name <span className="text-red-400">*</span>
            </label>
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
              placeholder="e.g. Payment Gateway Q2 2025"
              className="mt-1.5 w-full rounded-lg border px-3 py-2 text-[13px] outline-none transition"
              style={{
                borderColor: error && !name.trim() ? '#ef4444' : 'var(--line2)',
                background: 'var(--card2)',
                color: 'var(--text)',
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
              Description
            </label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={2}
              placeholder="Optional — team, product, service…"
              className="mt-1.5 w-full resize-none rounded-lg border px-3 py-2 text-[13px] outline-none"
              style={{ borderColor: 'var(--line2)', background: 'var(--card2)', color: 'var(--text)' }}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg px-3 py-2 text-[12px] text-red-400" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end gap-2 border-t pt-4" style={{ borderColor: 'var(--line)' }}>
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-[13px] transition hover:bg-[var(--card2)]"
            style={{ borderColor: 'var(--line)', color: 'var(--text)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold disabled:opacity-40 transition"
            style={{ color: 'var(--accent-fg)' }}
          >
            {saving ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  )
}
