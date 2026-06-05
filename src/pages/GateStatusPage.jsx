import { useState, useEffect, useRef, useCallback } from 'react'
import { Panel, Chip } from '../components/primitives'
import { apiFetch } from '../lib/api'
import { useAuth } from '../lib/AuthContext'

// ── Constants ─────────────────────────────────────────────────────────────────
const ROLE_KEYS   = ['eng_lead', 'tech_lead', 'product_lead']
const ROLE_LABELS = { eng_lead: 'Eng Lead', tech_lead: 'Tech Lead', product_lead: 'Product Lead' }

// ── GateBanner ────────────────────────────────────────────────────────────────
function GateBanner({ gate, casi, asi, projectName }) {
  const [copied, setCopied] = useState(false)
  const palette =
    gate === 'Green'  ? { bg: 'linear-gradient(135deg, #10b981, #22c55e)', glow: 'rgba(16,185,129,0.35)', fg: '#ffffff' }
    : gate === 'Yellow' ? { bg: 'linear-gradient(135deg, #f59e0b, #f97316)', glow: 'rgba(245,158,11,0.35)', fg: '#1a0f00' }
    : { bg: 'linear-gradient(135deg, #ef4444, #dc2626)', glow: 'rgba(239,68,68,0.35)', fg: '#ffffff' }

  const verdict =
    gate === 'Green' ? 'Ready to release'
    : gate === 'Yellow' ? 'Release with caution'
    : 'Do not release'

  return (
    <div className="relative overflow-hidden rounded-2xl p-8" style={{ background: palette.bg, boxShadow: `0 20px 60px -20px ${palette.glow}` }}>
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 120%, rgba(255,255,255,0.4), transparent 40%), radial-gradient(circle at 100% 0%, rgba(255,255,255,0.3), transparent 40%)' }}/>
      <div className="relative flex items-center gap-8">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
          <div className="flex flex-col gap-1.5">
            {['Red','Yellow','Green'].map(g => (
              <div key={g} className="h-4 w-4 rounded-full" style={{ background: gate === g ? '#fff' : 'rgba(255,255,255,0.22)' }}/>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: palette.fg, opacity: 0.85 }}>
            Gate · {projectName || 'Project'}
          </div>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight" style={{ color: palette.fg }}>{verdict}</h1>
          <div className="mt-2 flex items-center gap-4" style={{ color: palette.fg }}>
            <span className="inline-flex items-baseline gap-2">
              <span className="text-[11px] uppercase tracking-wider opacity-75">CASI</span>
              <span className="font-mono text-2xl font-semibold">{Math.round(casi)}</span>
            </span>
            <span className="opacity-40">·</span>
            <span className="inline-flex items-baseline gap-2">
              <span className="text-[11px] uppercase tracking-wider opacity-75">ASI</span>
              <span className="font-mono text-lg">{Math.round(asi)}</span>
            </span>
            <span className="opacity-40">·</span>
            <span className="text-sm font-semibold uppercase tracking-wider opacity-90">{gate}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => navigator.clipboard?.writeText(window.location.href).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })}
            className="rounded-lg px-4 py-2 text-[12px] font-semibold transition"
            style={{ background: 'rgba(255,255,255,0.2)', color: palette.fg }}>
            {copied ? '✓ Copied!' : 'Share link'}
          </button>
          <button onClick={() => window.print()} className="rounded-lg px-4 py-2 text-[12px] font-semibold" style={{ background: 'rgba(0,0,0,0.2)', color: palette.fg }}>
            Print / PDF
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CheckCard ─────────────────────────────────────────────────────────────────
// neutral=true → grey dash icon (used when data is absent, e.g. coverage not uploaded)
function CheckCard({ label, actual, pass, note, neutral }) {
  const col = neutral
    ? { fg: '#94a3b8', bg: 'rgba(148,163,184,0.12)', ring: 'rgba(148,163,184,0.3)' }
    : pass
    ? { fg: '#10b981', bg: 'rgba(16,185,129,0.12)', ring: 'rgba(16,185,129,0.3)' }
    : { fg: '#ef4444', bg: 'rgba(239,68,68,0.12)',  ring: 'rgba(239,68,68,0.3)' }
  return (
    <div className="panel rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: col.bg, border: `1px solid ${col.ring}` }}>
            {neutral
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={col.fg} strokeWidth="3" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              : pass
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={col.fg} strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={col.fg} strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
          </div>
          <span className="text-[13px] font-medium" style={{ color: 'var(--text-strong)' }}>{label}</span>
        </div>
        <span className="font-mono text-sm font-semibold" style={{ color: col.fg }}>{actual}</span>
      </div>
      <div className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>{note}</div>
    </div>
  )
}

// ── User search combobox ──────────────────────────────────────────────────────
function UserSearchInput({ value, onChange, onSelect, placeholder }) {
  const [results, setResults] = useState([])
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const debounce              = useRef(null)

  const search = useCallback((q) => {
    if (debounce.current) clearTimeout(debounce.current)
    if (!q || q.length < 2) { setResults([]); setOpen(false); return }
    debounce.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await apiFetch(`/api/users/search?q=${encodeURIComponent(q)}`)
        if (res.ok) { setResults(await res.json()); setOpen(true) }
      } finally { setLoading(false) }
    }, 280)
  }, [])

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        placeholder={placeholder || 'Search by name or email…'}
        className="w-full rounded-xl border px-3.5 py-2.5 text-[13px] outline-none transition-colors"
        style={{ background: 'var(--card2)', borderColor: 'var(--line2)', color: 'var(--text)' }}
        onChange={e => { onChange(e.target.value); search(e.target.value) }}
        onFocus={() => results.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        </div>
      )}
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border py-1 shadow-2xl"
          style={{ background: 'var(--card)', borderColor: 'var(--line2)' }}>
          {results.map(u => (
            <button key={u.email}
              className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-[13px] transition-colors hover:bg-[var(--card2)]"
              onMouseDown={() => { onSelect(u); setOpen(false) }}>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
                {(u.display_name || u.email)[0].toUpperCase()}
              </div>
              <div>
                <div className="font-medium" style={{ color: 'var(--text-strong)' }}>{u.display_name}</div>
                <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>{u.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Assign modal ──────────────────────────────────────────────────────────────
function AssignModal({ role, projectId, runId, current, onClose, onSaved }) {
  const [query,  setQuery]  = useState(current?.assigned_email || '')
  const [email,  setEmail]  = useState(current?.assigned_email || '')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const handleSelect = (u) => {
    setQuery(u.display_name || u.email)
    setEmail(u.email)
  }

  const handleQueryChange = (v) => {
    setQuery(v)
    // if the typed value looks like an email, use it directly
    setEmail(v.includes('@') ? v.trim().toLowerCase() : '')
  }

  const save = async () => {
    const target = email.trim().toLowerCase()
    if (!target || !target.includes('@')) {
      return setError('Select a user from the dropdown or enter a valid email address.')
    }
    setSaving(true); setError('')
    try {
      const res = await apiFetch(`/api/projects/${projectId}/runs/${runId}/signoffs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, email: target }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Assignment failed')
      onSaved(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--card)', border: '1px solid var(--line2)' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-strong)' }}>
              Assign {ROLE_LABELS[role]}
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
              Search users or type an email directly
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--text-dim)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="space-y-3">
          <UserSearchInput
            value={query}
            onChange={handleQueryChange}
            onSelect={handleSelect}
            placeholder="Name or email…"
          />
          {/* Show resolved email when selected via dropdown */}
          {email && email !== query && (
            <div className="text-[11px] px-1" style={{ color: 'var(--text-dim)' }}>
              Will assign: <span style={{ color: 'var(--text)' }}>{email}</span>
            </div>
          )}
          {error && (
            <div className="rounded-xl px-3 py-2.5 text-[12px]"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
              {error}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 rounded-xl py-2.5 text-[13px] font-medium transition-colors"
              style={{ background: 'var(--card2)', color: 'var(--text-muted)' }}>
              Cancel
            </button>
            <button onClick={save} disabled={saving}
              className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold transition-all disabled:opacity-50"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
              {saving ? 'Assigning…' : 'Assign →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Verdict modal ─────────────────────────────────────────────────────────────
function VerdictModal({ role, projectId, runId, onClose, onSaved }) {
  const [verdict, setVerdict] = useState('')
  const [notes,   setNotes]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const submit = async () => {
    if (!verdict) return setError('Select Approve or Reject.')
    setSaving(true); setError('')
    try {
      const res = await apiFetch(
        `/api/projects/${projectId}/runs/${runId}/signoffs/${role}/verdict`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ verdict, verdict_notes: notes }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save verdict')
      onSaved(data)    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--card)', border: '1px solid var(--line2)' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-strong)' }}>
              Sign off as {ROLE_LABELS[role]}
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
              Your decision will be recorded permanently
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--text-dim)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Approve / Reject toggle */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: 'approved', label: 'Approve',  fg: '#10b981', bg: 'rgba(16,185,129,0.1)', ring: 'rgba(16,185,129,0.35)' },
              { v: 'rejected', label: 'Reject',   fg: '#ef4444', bg: 'rgba(239,68,68,0.1)',  ring: 'rgba(239,68,68,0.35)'  },
            ].map(opt => (
              <button key={opt.v}
                onClick={() => setVerdict(opt.v)}
                className="flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-semibold transition-all"
                style={{
                  background:  verdict === opt.v ? opt.bg : 'var(--card2)',
                  color:       verdict === opt.v ? opt.fg : 'var(--text-muted)',
                  border:      verdict === opt.v ? `1px solid ${opt.ring}` : '1px solid var(--line)',
                }}>
                {opt.v === 'approved'
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>}
                {opt.label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-dim)' }}>
              Notes <span style={{ color: 'var(--text-faint)' }}>(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Conditions, concerns, rollback plan…"
              rows={3}
              className="w-full rounded-xl border px-3.5 py-2.5 text-[13px] outline-none resize-none transition-colors"
              style={{ background: 'var(--card2)', borderColor: 'var(--line2)', color: 'var(--text)' }}
            />
          </div>

          {error && (
            <div className="rounded-xl px-3 py-2.5 text-[12px]"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 rounded-xl py-2.5 text-[13px] font-medium"
              style={{ background: 'var(--card2)', color: 'var(--text-muted)' }}>
              Cancel
            </button>
            <button onClick={submit} disabled={saving || !verdict}
              className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold transition-all disabled:opacity-50"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
              {saving ? 'Saving…' : 'Submit →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Signoff row ───────────────────────────────────────────────────────────────
function SignoffRow({ signoff, role, projectId, runId, currentUserEmail, canAssign, onRefresh }) {
  const [modal, setModal] = useState(null) // 'assign' | 'verdict' | null

  const isAssignedToMe = signoff && signoff.assigned_email &&
    signoff.assigned_email.toLowerCase() === (currentUserEmail || '').toLowerCase()

  const verdict = signoff?.verdict
  const vc =
    verdict === 'approved' ? { bg: 'rgba(16,185,129,0.1)', fg: '#10b981', label: 'Approved' }
    : verdict === 'rejected' ? { bg: 'rgba(239,68,68,0.1)',  fg: '#ef4444', label: 'Rejected' }
    : { bg: 'var(--card2)', fg: 'var(--text-dim)', label: 'Pending' }

  const fmtDate = (ts) => ts ? new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null

  return (
    <>
      <div className="panel-inner rounded-xl p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center font-bold text-sm"
            style={{ background: signoff ? 'var(--accent-bg)' : 'var(--card2)', color: signoff ? 'var(--accent)' : 'var(--text-faint)', border: '1px solid var(--line)' }}>
            {signoff ? (signoff.assigned_name || signoff.assigned_email)[0].toUpperCase() : '?'}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-dim)' }}>
              {ROLE_LABELS[role]}
            </div>
            {signoff ? (
              <>
                <div className="text-[13px] font-medium" style={{ color: 'var(--text-strong)' }}>
                  {signoff.assigned_name || signoff.assigned_email}
                </div>
                <div className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
                  {signoff.assigned_email}
                  {signoff.assigned_by && <span className="ml-2 opacity-70">— assigned by {signoff.assigned_by.split('@')[0]}</span>}
                </div>
                {verdict && signoff.verdict_notes && (
                  <div className="mt-1 text-[11px] italic" style={{ color: 'var(--text-dim)' }}>
                    "{signoff.verdict_notes}"
                  </div>
                )}
              </>
            ) : (
              <div className="text-[13px]" style={{ color: 'var(--text-faint)' }}>Unassigned</div>
            )}
          </div>

          {/* Right: badge + actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{ background: vc.bg, color: vc.fg }}>
              {vc.label}
            </span>
            {verdict && fmtDate(signoff.verdict_at) && (
              <span className="font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>
                {fmtDate(signoff.verdict_at)}
              </span>
            )}
            {/* Actions */}
            <div className="flex gap-1.5 mt-0.5">
              {canAssign && !verdict && (
                <button
                  onClick={() => setModal('assign')}
                  className="rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors"
                  style={{ background: 'var(--card2)', border: '1px solid var(--line)', color: 'var(--text-muted)' }}>
                  {signoff ? 'Reassign' : 'Assign'}
                </button>
              )}
              {isAssignedToMe && !verdict && (
                <button
                  onClick={() => setModal('verdict')}
                  className="rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors"
                  style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
                  Sign off
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {modal === 'assign' && (
        <AssignModal
          role={role} projectId={projectId} runId={runId} current={signoff}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); onRefresh() }}
        />
      )}
      {modal === 'verdict' && (
        <VerdictModal
          role={role} projectId={projectId} runId={runId}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); onRefresh() }}
        />
      )}
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GateStatusPage({ result, project, onBack }) {
  const { user } = useAuth()
  const scores  = result?.scores || result || {}
  const casi    = Math.round(scores.casi_score ?? result?.casi_score ?? 0)
  const asi     = Math.round(scores.asi_score  ?? result?.asi_score  ?? 0)
  const gate    = scores.casi_gate ?? result?.casi_gate ?? 'Red'
  const fails   = result?.open_failures || result?.failures || []
  const runId   = result?.run_id
  const projectId = project?.id || result?.project_id

  // ── Signoffs state ──────────────────────────────────────────────────────────
  const [signoffs,  setSignoffs]  = useState([null, null, null]) // indexed by ROLE_KEYS
  const [sfLoading, setSfLoading] = useState(false)
  const [sfError,   setSfError]   = useState('')

  const fetchSignoffs = useCallback(async () => {
    if (!projectId || !runId) return
    setSfLoading(true); setSfError('')
    try {
      const res = await apiFetch(`/api/projects/${projectId}/runs/${runId}/signoffs`)
      if (!res.ok) throw new Error('Failed to load sign-offs')
      const data = await res.json() // array of 3 items (null = unassigned)
      setSignoffs(Array.isArray(data) ? data : [null, null, null])
    } catch (err) {
      setSfError(err.message)
    } finally {
      setSfLoading(false)
    }
  }, [projectId, runId])

  useEffect(() => { fetchSignoffs() }, [fetchSignoffs])

  // Current user is the project owner or a member with write access → can assign
  // We infer write access by checking project.created_by OR project.is_member_write.
  // Simplest heuristic: everyone with access can assign (server enforces write check).
  const currentUserEmail = user?.email || ''
  const canAssign = !!user

  // ── Readiness checks ────────────────────────────────────────────────────────
  const criticalCount = fails.filter(f => f.priority === 'Critical' || f.priority === 'High').length
  const gapToGreen = Math.max(0, 700 - casi)
  const checks = [
    {
      label: 'CASI ≥ 700', actual: String(casi), pass: casi >= 700,
      note: casi >= 700
        ? `Score is ${casi - 700} pts above the Green floor — you have a ${casi - 700 < 50 ? 'thin' : 'healthy'} buffer.`
        : `${gapToGreen} pts to go. Fix the lowest-health component to close the gap fastest.`,
    },
    {
      label: 'No Critical Failures', actual: criticalCount === 0 ? 'None' : `${criticalCount} open`, pass: criticalCount === 0,
      note: criticalCount > 0
        ? `${criticalCount} critical/high failure${criticalCount > 1 ? 's' : ''} are open — these block Green and carry the most score penalty.`
        : 'No critical or high failures detected. Your test suite is clean at the highest priority level.',
    },
    {
      label: 'Coverage ≥ 85%', actual: 'N/A', pass: false, neutral: true,
      note: 'Coverage data not included in this run. Add a coverage column to your test file to enable this check.',
    },
    {
      label: 'Gate status', actual: gate, pass: gate === 'Green',
      note: gate === 'Green'
        ? 'CASI threshold and critical failure checks both pass. Proceed to collect sign-offs below.'
        : gate === 'Yellow'
        ? 'Conditional — can release with explicit stakeholder approval and a rollback plan.'
        : 'Blocked — resolve critical failures and raise CASI above 700 before releasing.',
    },
  ]
  const passingCount = checks.filter(c => c.pass).length
  const applicableCount = checks.filter(c => !c.neutral).length
  const signoffsDone = signoffs.filter(s => s?.verdict === 'approved').length
  const signoffsTotal = 3

  return (
    <main className="scrollbar-thin flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <GateBanner gate={gate} casi={casi} asi={asi} projectName={project?.name}/>

        {/* Context callout */}
        <div className="rounded-xl border px-4 py-3 text-[12px] leading-relaxed" style={{ borderColor:'var(--line)', background:'var(--card2)', color:'var(--text-muted)' }}>
          <span className="font-semibold" style={{ color:'var(--text-strong)' }}>What this screen shows · </span>
          The Gate is CASI's release decision. It runs four automated checks against your latest run:
          score threshold, open critical failures, coverage, and overall gate status.
          {gate !== 'Green' && <span> <span style={{ color:'#f59e0b' }}>To reach Green</span>: close all critical/high failures and push CASI above 700.</span>}
          {gate === 'Green' && <span> <span style={{ color:'#10b981' }}>All automated checks pass.</span> Collect the three human sign-offs below to complete the release workflow.</span>}
        </div>

        {/* Readiness checklist */}
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-strong)' }}>Readiness checklist</h2>
            <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>{passingCount} of {applicableCount} passing</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {checks.map(c => <CheckCard key={c.label} {...c} neutral={!!c.neutral}/>)}
          </div>
        </div>

        {/* Release sign-off panel */}
        <div className="panel rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--line)' }}>
            <div>
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-strong)' }}>Release sign-off</h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
                All three approvals required · {signoffsDone}/{signoffsTotal} approved
              </p>
            </div>
            {sfLoading && (
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2.5">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            )}
          </div>

          <div className="p-4 space-y-2">
            {sfError && (
              <div className="rounded-xl px-4 py-3 text-[12px]"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
                {sfError}
              </div>
            )}

            {ROLE_KEYS.map((role, i) => (
              <SignoffRow
                key={role}
                role={role}
                signoff={signoffs[i] || null}
                projectId={projectId}
                runId={runId}
                currentUserEmail={currentUserEmail}
                canAssign={canAssign}
                onRefresh={fetchSignoffs}
              />
            ))}

            {/* Tip: users need to enable sharing */}
            <div className="pt-2 text-[11px] leading-relaxed" style={{ color: 'var(--text-faint)' }}>
              <svg className="inline-block mr-1" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              Users appear in search only if they have enabled <strong style={{ color: 'var(--text-dim)' }}>name/email sharing</strong> in their account settings.
              You can also type any registered email address directly.
            </div>
          </div>
        </div>

        {/* AI hint */}
        {gate !== 'Green' && (
          <div className="rounded-xl border p-4" style={{ borderColor: 'var(--accent-ring)', background: 'var(--accent-bg)' }}>
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold" style={{ color: 'var(--accent-fg)' }}>AI</div>
              <span className="text-[11px] font-semibold" style={{ color: 'var(--text-strong)' }}>What would unblock Green?</span>
            </div>
            <p className="mt-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {criticalCount > 0
                ? `Close the ${criticalCount} open critical/high failure${criticalCount > 1 ? 's' : ''} to improve the gate status.`
                : `CASI is ${casi}. Fix the top failing modules to cross the 700 Green threshold.`}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

