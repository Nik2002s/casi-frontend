/**
 * AccountSettingsModal
 *
 * Normal user  — % bars for daily tokens, weekly tokens + request counter
 * Admin        — user dropdown; per-user % view OR all-users cumulative counts;
 *                inline limit editor
 */
import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../lib/api'
import { useAuth } from '../lib/AuthContext'

// ── small helpers ─────────────────────────────────────────────────────────────

function fmt(n) { return (n ?? 0).toLocaleString() }

function PctBar({ pct }) {
  const color = pct >= 85 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#10b981'
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }}/>
    </div>
  )
}

// ── per-user quota view (% style) ─────────────────────────────────────────────

function UserQuotaView({ usage, quota }) {
  if (!usage || !quota) {
    return <div className="py-6 text-center text-[12px]" style={{ color: 'var(--text-dim)' }}>Loading…</div>
  }

  const todayTokens = (usage.today_input ?? 0) + (usage.today_output ?? 0)
  const weekTokens  = (usage.week_input  ?? 0) + (usage.week_output  ?? 0)
  const dailyLim    = quota.daily_tokens_limit  ?? 0
  const weeklyLim   = quota.weekly_tokens_limit ?? 0
  const reqLim      = quota.daily_requests_limit ?? 10
  const reqUsed     = usage.today_requests ?? 0

  const dailyPct  = dailyLim  > 0 ? (todayTokens / dailyLim)  * 100 : 0
  const weeklyPct = weeklyLim > 0 ? (weekTokens  / weeklyLim) * 100 : 0

  const dailyColor  = dailyPct  >= 85 ? '#ef4444' : dailyPct  >= 60 ? '#f59e0b' : '#10b981'
  const weeklyColor = weeklyPct >= 85 ? '#ef4444' : weeklyPct >= 60 ? '#f59e0b' : '#10b981'

  const reqRemaining = Math.max(0, reqLim - reqUsed)

  return (
    <div className="space-y-4">
      {/* Daily tokens */}
      <div>
        <div className="flex justify-between text-[12px] mb-1.5">
          <span style={{ color: 'var(--text)' }}>Daily tokens</span>
          <span style={{ color: 'var(--text-muted)' }}>
            {fmt(Math.max(0, dailyLim - todayTokens))} remaining
          </span>
        </div>
        <PctBar pct={dailyPct} />
        <div className="mt-1 text-right font-mono text-[11px]" style={{ color: dailyColor }}>
          {Math.round(dailyPct)}% used
        </div>
      </div>

      {/* Weekly tokens */}
      <div>
        <div className="flex justify-between text-[12px] mb-1.5">
          <span style={{ color: 'var(--text)' }}>Weekly tokens</span>
          <span style={{ color: 'var(--text-muted)' }}>
            {fmt(Math.max(0, weeklyLim - weekTokens))} remaining
          </span>
        </div>
        <PctBar pct={weeklyPct} />
        <div className="mt-1 text-right font-mono text-[11px]" style={{ color: weeklyColor }}>
          {Math.round(weeklyPct)}% used
        </div>
      </div>

      {/* Daily requests — pip row */}
      <div>
        <div className="flex justify-between text-[12px] mb-1.5">
          <span style={{ color: 'var(--text)' }}>Daily requests</span>
          <span style={{ color: 'var(--text-muted)' }}>{reqRemaining} remaining</span>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: reqLim }).map((_, i) => (
            <div
              key={i}
              className="h-3 flex-1 rounded-sm transition-colors"
              style={{ background: i < reqUsed ? 'var(--accent)' : 'var(--line)' }}
            />
          ))}
        </div>
        <div className="mt-1 text-right font-mono text-[11px]" style={{ color: 'var(--text-dim)' }}>
          {reqUsed} / {reqLim} used today
        </div>
      </div>
    </div>
  )
}

// ── all-users cumulative view (raw counts) ────────────────────────────────────

function AllUsersView({ allUsage }) {
  if (!allUsage) {
    return <div className="py-6 text-center text-[12px]" style={{ color: 'var(--text-dim)' }}>Loading…</div>
  }

  const sum = (field) => allUsage.reduce((s, r) => s + (r[field] ?? 0), 0)

  const periods = [
    {
      label: 'Last 24 hrs',
      tokens: sum('today_input') + sum('today_output'),
      input:  sum('today_input'),
      output: sum('today_output'),
      reqs:   sum('today_requests'),
    },
    {
      label: 'Last 7 days',
      tokens: sum('week_input') + sum('week_output'),
      input:  sum('week_input'),
      output: sum('week_output'),
      reqs:   sum('week_requests'),
    },
  ]

  return (
    <div className="space-y-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
        Cumulative — all {allUsage.length} user{allUsage.length !== 1 ? 's' : ''}
      </div>
      {periods.map(p => (
        <div key={p.label} className="rounded-xl p-3" style={{ background: 'var(--card2)', border: '1px solid var(--line)' }}>
          <div className="text-[10px] uppercase tracking-wider mb-2.5 font-medium" style={{ color: 'var(--text-dim)' }}>{p.label}</div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { v: p.tokens, label: 'total tokens' },
              { v: p.input,  label: 'input' },
              { v: p.output, label: 'output' },
              { v: p.reqs,   label: 'requests' },
            ].map(({ v, label }) => (
              <div key={label}>
                <div className="font-mono text-[14px] font-semibold" style={{ color: 'var(--text-strong)' }}>{fmt(v)}</div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── main modal ────────────────────────────────────────────────────────────────

export default function AccountSettingsModal({ onClose }) {
  const { user, isAdmin } = useAuth()

  const [myUsage,      setMyUsage]      = useState(null)
  const [myQuota,      setMyQuota]      = useState(null)
  const [allUsage,     setAllUsage]     = useState(null)
  const [limits,       setLimits]       = useState(null)
  const [selectedUser, setSelectedUser] = useState('__me__')
  const [savingLimits, setSavingLimits] = useState(false)
  const [saveMsg,      setSaveMsg]      = useState('')

  const overlayRef = useRef(null)

  // Close on Escape
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  // Fetch data
  useEffect(() => {
    const calls = [
      apiFetch('/api/me/token-usage').then(r => r.json()),
      apiFetch('/api/me/quota').then(r => r.json()),
    ]
    if (isAdmin) {
      calls.push(apiFetch('/api/admin/ai-usage').then(r => r.json()))
      calls.push(apiFetch('/api/admin/ai-limits').then(r => r.json()))
    }
    Promise.all(calls)
      .then(([usage, quota, allU, lim]) => {
        setMyUsage(usage)
        setMyQuota(quota)
        if (allU)  setAllUsage(allU)
        if (lim)   setLimits(lim)
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Derive usage for selected user (admin)
  const selectedUsage = (() => {
    if (!isAdmin) return myUsage
    if (selectedUser === '__me__') return myUsage
    if (selectedUser === '__all__') return null  // handled separately
    return (allUsage || []).find(r => r.email === selectedUser) || myUsage
  })()

  const isAllUsers = isAdmin && selectedUser === '__all__'

  const handleSaveLimits = async () => {
    setSavingLimits(true); setSaveMsg('')
    try {
      const res = await apiFetch('/api/admin/ai-limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(limits),
      })
      if (res.ok) {
        setLimits(await res.json())
        setSaveMsg('✓ Saved')
        // Refresh own quota to reflect new limits
        apiFetch('/api/me/quota').then(r => r.json()).then(setMyQuota).catch(() => {})
        setTimeout(() => setSaveMsg(''), 3000)
      } else {
        setSaveMsg('Failed')
      }
    } catch { setSaveMsg('Error') }
    finally { setSavingLimits(false) }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-end"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      {/* Slide-in panel from right */}
      <div
        className="relative flex h-full w-full max-w-sm flex-col border-l shadow-2xl overflow-y-auto"
        style={{ background: 'var(--card)', borderColor: 'var(--line)' }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--line)' }}>
          <div>
            <div className="text-[14px] font-semibold" style={{ color: 'var(--text-strong)' }}>Account</div>
            <div className="text-[11px] truncate mt-0.5 max-w-[220px]" style={{ color: 'var(--text-dim)' }}>{user?.email}</div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--card2)] transition"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 px-5 py-5 space-y-5">
          {/* ── AI token usage header ── */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-dim)' }}>AI Token Usage</div>
            <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
              Across all projects · resets at UTC midnight (daily) / Monday (weekly)
            </div>
          </div>

          {/* ── Admin: user picker ── */}
          {isAdmin && allUsage && (
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-dim)' }}>View</label>
              <select
                value={selectedUser}
                onChange={e => setSelectedUser(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-[12px] outline-none"
                style={{ background: 'var(--card2)', borderColor: 'var(--line)', color: 'var(--text)' }}
              >
                <option value="__me__">Me ({user?.email})</option>
                <option value="__all__">All Users (cumulative)</option>
                {allUsage
                  .filter(r => r.email !== user?.email)
                  .map(r => (
                    <option key={r.email} value={r.email}>{r.email}</option>
                  ))
                }
              </select>
            </div>
          )}

          {/* ── Usage view ── */}
          {isAllUsers
            ? <AllUsersView allUsage={allUsage} />
            : <UserQuotaView usage={selectedUsage} quota={myQuota} />
          }

          {/* ── Admin: limit editor ── */}
          {isAdmin && limits && (
            <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'rgba(13,148,136,0.3)', background: 'rgba(13,148,136,0.04)' }}>
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold" style={{ color: '#0d9488' }}>⚡ Quota Limits</div>
                {saveMsg && (
                  <span className="text-[11px]" style={{ color: saveMsg.startsWith('✓') ? '#10b981' : '#ef4444' }}>
                    {saveMsg}
                  </span>
                )}
              </div>
              <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
                Applies to all non-admin users. Admins are exempt.
              </div>
              <div className="space-y-2">
                {[
                  { key: 'daily_requests', label: 'Daily requests',   unit: 'req / day' },
                  { key: 'daily_tokens',   label: 'Daily tokens',     unit: 'tokens / day' },
                  { key: 'weekly_tokens',  label: 'Weekly tokens',    unit: 'tokens / week' },
                ].map(({ key, label, unit }) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className="flex-1 text-[12px]" style={{ color: 'var(--text)' }}>{label}</div>
                    <input
                      type="number" min="1"
                      value={limits[key] ?? ''}
                      onChange={e => setLimits(p => ({ ...p, [key]: parseInt(e.target.value) || 1 }))}
                      className="w-24 rounded border bg-transparent px-2 py-1 font-mono text-[12px] text-right outline-none"
                      style={{ borderColor: 'var(--line2)', color: 'var(--text)' }}
                    />
                    <div className="w-20 text-[10px] shrink-0" style={{ color: 'var(--text-dim)' }}>{unit}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleSaveLimits}
                  disabled={savingLimits}
                  className="rounded-lg px-4 py-1.5 text-[11px] font-semibold disabled:opacity-50 transition"
                  style={{ background: '#0d9488', color: '#fff' }}
                >
                  {savingLimits ? 'Saving…' : 'Save limits'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
