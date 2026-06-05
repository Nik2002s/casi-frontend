/**
 * AccountPage  —  /account
 *
 * Full-page account settings, accessible from anywhere via the account icon.
 * Tabs: Profile · Token Usage · API Keys
 *
 * Token Usage
 *   Normal user  — % bars (daily tokens, weekly tokens, daily requests pip-row)
 *   Admin        — user dropdown; per-user % view OR all-users cumulative counts;
 *                  + inline limit editor
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { ThemeToggleBtn } from '../components/primitives'

const ACCENT_COLORS = [
  { cls: '',               hex: '#3B82F6', label: 'Blue' },
  { cls: 'accent-teal',   hex: '#14B8A6', label: 'Teal' },
  { cls: 'accent-violet', hex: '#8B5CF6', label: 'Violet' },
  { cls: 'accent-rose',   hex: '#F43F5E', label: 'Rose' },
  { cls: 'accent-amber',  hex: '#F59E0B', label: 'Amber' },
]

function fmt(n) { return (n ?? 0).toLocaleString() }

// ── small % bar ───────────────────────────────────────────────────────────────
function PctBar({ pct }) {
  const color = pct >= 85 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#10b981'
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(pct, 100)}%`, background: color }}
      />
    </div>
  )
}

// ── per-user quota view (% only, no raw counts) ───────────────────────────────
function UserQuotaView({ usage, quota }) {
  if (!usage || !quota) {
    return <div className="py-8 text-center text-[13px]" style={{ color: 'var(--text-dim)' }}>Loading…</div>
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
  const reqPct      = reqLim > 0 ? (reqUsed / reqLim) * 100 : 0
  const reqColor    = reqPct >= 85 ? '#ef4444' : reqPct >= 60 ? '#f59e0b' : '#10b981'

  return (
    <div className="space-y-6">
      {/* Daily tokens */}
      <div className="panel-inner rounded-xl p-5">
        <div className="flex justify-between text-[13px] mb-3">
          <span style={{ color: 'var(--text-strong)', fontWeight: 500 }}>Daily tokens</span>
          <span className="font-mono font-semibold text-[15px]" style={{ color: dailyColor }}>{Math.round(dailyPct)}%</span>
        </div>
        <PctBar pct={dailyPct} />
        <div className="mt-2 text-[11px]" style={{ color: 'var(--text-dim)' }}>
          {Math.max(0, Math.round(100 - dailyPct))}% remaining of daily limit
        </div>
      </div>

      {/* Weekly tokens */}
      <div className="panel-inner rounded-xl p-5">
        <div className="flex justify-between text-[13px] mb-3">
          <span style={{ color: 'var(--text-strong)', fontWeight: 500 }}>Weekly tokens</span>
          <span className="font-mono font-semibold text-[15px]" style={{ color: weeklyColor }}>{Math.round(weeklyPct)}%</span>
        </div>
        <PctBar pct={weeklyPct} />
        <div className="mt-2 text-[11px]" style={{ color: 'var(--text-dim)' }}>
          {Math.max(0, Math.round(100 - weeklyPct))}% remaining of weekly limit
        </div>
      </div>

      {/* Daily requests pip row */}
      <div className="panel-inner rounded-xl p-5">
        <div className="flex justify-between text-[13px] mb-3">
          <span style={{ color: 'var(--text-strong)', fontWeight: 500 }}>Daily requests</span>
          <span className="font-mono font-semibold text-[15px]" style={{ color: reqColor }}>{reqUsed} / {reqLim}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: reqLim }).map((_, i) => (
            <div
              key={i}
              className="h-4 flex-1 rounded transition-colors"
              style={{ background: i < reqUsed ? reqColor : 'var(--line)' }}
            />
          ))}
        </div>
        <div className="mt-2 text-[11px]" style={{ color: 'var(--text-dim)' }}>
          {Math.max(0, reqLim - reqUsed)} remaining today
        </div>
      </div>
    </div>
  )
}

// Claude Haiku pricing (per 1M tokens)
const PRICE_INPUT  = 0.80   // $0.80 / 1M input tokens
const PRICE_OUTPUT = 4.00   // $4.00 / 1M output tokens
function calcCost(inp, out) {
  return ((inp * PRICE_INPUT) + (out * PRICE_OUTPUT)) / 1_000_000
}
function fmtCost(n) {
  if (n === 0) return '$0.00'
  if (n < 0.01) return '<$0.01'
  return `$${n.toFixed(4)}`
}

// ── all-users cumulative view (raw counts + cost) ─────────────────────────────
function AllUsersView({ allUsage }) {
  if (!allUsage) {
    return <div className="py-8 text-center text-[13px]" style={{ color: 'var(--text-dim)' }}>Loading…</div>
  }

  const sum = (field) => allUsage.reduce((s, r) => s + (r[field] ?? 0), 0)

  const periods = [
    {
      label:  'Last 24 hrs',
      input:  sum('today_input'),
      output: sum('today_output'),
      reqs:   sum('today_requests'),
    },
    {
      label:  'Last 7 days',
      input:  sum('week_input'),
      output: sum('week_output'),
      reqs:   sum('week_requests'),
    },
    {
      label:  'All time',
      input:  sum('total_input'),
      output: sum('total_output'),
      reqs:   sum('total_requests'),
    },
  ]

  return (
    <div className="space-y-4">
      <p className="text-[12px]" style={{ color: 'var(--text-dim)' }}>
        Cumulative across all {allUsage.length} user{allUsage.length !== 1 ? 's' : ''}.
      </p>
      {periods.map(p => {
        const total = p.input + p.output
        const cost  = calcCost(p.input, p.output)
        return (
          <div key={p.label} className="panel-inner rounded-xl p-5">
            <div className="text-[11px] uppercase tracking-wider font-semibold mb-4" style={{ color: 'var(--text-dim)' }}>{p.label}</div>
            <div className="grid grid-cols-5 gap-3 text-center">
              {[
                { v: fmt(total),       label: 'Total tokens', mono: true },
                { v: fmt(p.input),     label: 'Input tokens', mono: true },
                { v: fmt(p.output),    label: 'Output tokens', mono: true },
                { v: fmt(p.reqs),      label: 'Requests', mono: true },
                { v: fmtCost(cost),    label: 'Est. cost', mono: true, accent: true },
              ].map(({ v, label, accent }) => (
                <div key={label} className="rounded-lg py-3 px-2" style={{ background: 'var(--card2)' }}>
                  <div
                    className="font-mono text-[15px] font-semibold"
                    style={{ color: accent ? '#0d9488' : 'var(--text-strong)' }}
                  >{v}</div>
                  <div className="text-[10px] mt-1" style={{ color: 'var(--text-dim)' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Token Usage tab ───────────────────────────────────────────────────────────
function TokenUsageTab({ user }) {
  const [myUsage,       setMyUsage]       = useState(null)
  const [myQuota,       setMyQuota]       = useState(null)
  const [allUsage,      setAllUsage]      = useState(null)   // usage rows (users with history)
  const [allUsers,      setAllUsers]      = useState(null)   // all approved users
  const [limits,        setLimits]        = useState(null)
  const [selectedUser,  setSelectedUser]  = useState('__me__')
  const [savingLimits,  setSavingLimits]  = useState(false)
  const [saveMsg,       setSaveMsg]       = useState('')
  const [error,         setError]         = useState(null)

  useEffect(() => {
    // Always fetch own usage + quota
    Promise.all([
      apiFetch('/api/me/token-usage').then(r => r.json()),
      apiFetch('/api/me/quota').then(r => r.json()),
    ])
      .then(([usage, quota]) => {
        setMyUsage(usage)
        setMyQuota(quota)

        // Only fetch admin data if the backend explicitly says this user is admin
        if (quota?.is_admin) {
          Promise.all([
            apiFetch('/api/admin/ai-usage').then(r => r.json()),
            apiFetch('/api/admin/ai-limits').then(r => r.json()),
            apiFetch('/api/admin/users').then(r => r.json()),
          ])
            .then(([allU, lim, users]) => {
              if (Array.isArray(allU))    setAllUsage(allU)
              if (lim && !lim.error)      setLimits(lim)
              if (Array.isArray(users))   setAllUsers(users)
            })
            .catch(() => {})
        }
      })
      .catch(e => setError(e.message))
  }, [])

  // Derive admin status purely from backend — never from frontend env var
  const isAdmin = !!myQuota?.is_admin

  const selectedUsage = (() => {
    if (!isAdmin) return myUsage
    if (selectedUser === '__me__')  return myUsage
    if (selectedUser === '__all__') return null
    // Find usage for selected user; fallback to zeroed object if they have no history
    const found = (Array.isArray(allUsage) ? allUsage : []).find(
      r => r.email?.toLowerCase() === selectedUser.toLowerCase()
    )
    return found || { today_input: 0, today_output: 0, today_requests: 0, week_input: 0, week_output: 0 }
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
        apiFetch('/api/me/quota').then(r => r.json()).then(setMyQuota).catch(() => {})
        setTimeout(() => setSaveMsg(''), 3000)
      } else { setSaveMsg('Failed to save') }
    } catch { setSaveMsg('Error saving') }
    finally { setSavingLimits(false) }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text-strong)' }}>AI Token Usage</h2>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>
          Tokens consumed by Chat and &ldquo;Explain with AI&rdquo; across all projects.
          Resets at UTC midnight (daily) and Monday (weekly).
        </p>
      </div>

      {error && (
        <div className="rounded-lg border px-4 py-3 text-[12px]" style={{ borderColor: '#ef4444', color: '#ef4444', background: 'rgba(239,68,68,0.05)' }}>
          Could not load usage: {error}
        </div>
      )}

      {/* Admin: user selector — lists all approved users, not just those with usage */}
      {isAdmin && Array.isArray(allUsers) && (
        <div>
          <label className="text-[12px] font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Viewing usage for</label>
          <select
            value={selectedUser}
            onChange={e => setSelectedUser(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-[13px] outline-none"
            style={{ background: 'var(--card2)', borderColor: 'var(--line)', color: 'var(--text)' }}
          >
            <option value="__me__">Me ({user?.email})</option>
            <option value="__all__">All Users (cumulative)</option>
            {allUsers
              .filter(r => r.email?.toLowerCase() !== user?.email?.toLowerCase())
              .map(r => <option key={r.email} value={r.email}>{r.email}</option>)
            }
          </select>
        </div>
      )}

      {/* Usage view */}
      {isAllUsers
        ? <AllUsersView allUsage={allUsage} />
        : <UserQuotaView usage={selectedUsage} quota={myQuota} />
      }

      {/* Admin: limit editor */}
      {isAdmin && limits && (
        <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: 'rgba(13,148,136,0.3)', background: 'rgba(13,148,136,0.04)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-semibold" style={{ color: '#0d9488' }}>⚡ Quota Limits</div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-dim)' }}>Applies to all non-admin users. Admins are exempt.</div>
            </div>
            {saveMsg && (
              <span className="text-[12px] font-medium" style={{ color: saveMsg.startsWith('✓') ? '#10b981' : '#ef4444' }}>
                {saveMsg}
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: 'daily_requests', label: 'Daily requests', unit: 'req / day' },
              { key: 'daily_tokens',   label: 'Daily tokens',   unit: 'tokens / day' },
              { key: 'weekly_tokens',  label: 'Weekly tokens',  unit: 'tokens / week' },
            ].map(({ key, label, unit }) => (
              <div key={key} className="rounded-lg p-3" style={{ background: 'var(--card2)', border: '1px solid var(--line)' }}>
                <div className="text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
                <input
                  type="number" min="1"
                  value={limits[key] ?? ''}
                  onChange={e => setLimits(p => ({ ...p, [key]: parseInt(e.target.value) || 1 }))}
                  className="w-full rounded border bg-transparent px-2 py-1 font-mono text-[13px] outline-none"
                  style={{ borderColor: 'var(--line2)', color: 'var(--text)' }}
                />
                <div className="text-[10px] mt-1" style={{ color: 'var(--text-dim)' }}>{unit}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSaveLimits}
              disabled={savingLimits}
              className="rounded-lg px-5 py-2 text-[12px] font-semibold disabled:opacity-50 transition"
              style={{ background: '#0d9488', color: '#fff' }}
            >
              {savingLimits ? 'Saving…' : 'Save limits'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Profile tab ───────────────────────────────────────────────────────────────
function ProfileTab({ user, allowSharing, onAllowSharingChange }) {
  const [toggling, setToggling]   = useState(false)
  const [confirm, setConfirm]     = useState(false)   // show confirm modal before enabling
  const [localValue, setLocalValue] = useState(allowSharing)

  // Sync if parent refreshes
  useEffect(() => { setLocalValue(allowSharing) }, [allowSharing])

  const doToggle = async (next) => {
    setToggling(true)
    try {
      const res = await apiFetch('/api/me/sharing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allow_sharing: next }),
      })
      if (res.ok) {
        setLocalValue(next)
        onAllowSharingChange?.(next)
      }
    } catch {}
    finally { setToggling(false) }
  }

  const handleToggle = () => {
    if (!localValue) {
      // Turning ON → show confirmation first
      setConfirm(true)
    } else {
      // Turning OFF → immediate, no confirmation
      doToggle(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text-strong)' }}>Profile</h2>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>Your account information from Google sign-in.</p>
      </div>
      <div className="panel-inner rounded-xl p-6 flex items-center gap-5">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-blue-400 to-violet-500">
          {user?.photoURL && <img src={user.photoURL} alt="" className="h-full w-full object-cover"/>}
        </div>
        <div>
          <div className="text-[16px] font-semibold" style={{ color: 'var(--text-strong)' }}>{user?.displayName || 'User'}</div>
          <div className="text-[13px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{user?.email}</div>
          <div className="text-[11px] mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: 'var(--card2)', color: 'var(--text-dim)' }}>
            Google account
          </div>
        </div>
      </div>
      <div className="panel-inner rounded-xl p-6 space-y-3">
        {[
          { label: 'Display name', value: user?.displayName || '—' },
          { label: 'Email',        value: user?.email        || '—' },
          { label: 'User ID',      value: user?.uid          || '—' },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--line)' }}>
            <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
            <span className="text-[13px] font-mono" style={{ color: 'var(--text-strong)' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Allow sharing toggle */}
      <div className="panel-inner rounded-xl p-5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="text-[14px] font-semibold" style={{ color: 'var(--text-strong)' }}>
              Allow others to share projects with me
            </div>
            <div className="mt-1 text-[12px] leading-relaxed" style={{ color: 'var(--text-dim)' }}>
              When enabled, your <strong style={{ color: 'var(--text-muted)' }}>name</strong> and{' '}
              <strong style={{ color: 'var(--text-muted)' }}>email address</strong> will be visible
              to all CASI users when they search for someone to share a project with.
              You can turn this off at any time.
            </div>
          </div>
          <button
            onClick={handleToggle}
            disabled={toggling}
            className="relative mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60"
            style={{ background: localValue ? 'var(--accent)' : 'var(--line2)' }}
          >
            <span
              className="absolute h-4 w-4 rounded-full bg-white shadow transition-transform"
              style={{ transform: localValue ? 'translateX(22px)' : 'translateX(4px)' }}
            />
          </button>
        </div>
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-[11px]"
          style={{ background: localValue ? 'rgba(16,185,129,0.08)' : 'var(--card2)', color: localValue ? '#10b981' : 'var(--text-dim)' }}>
          <span>{localValue ? '✓ Discoverable — others can find you' : '✗ Hidden — others cannot find you'}</span>
        </div>
      </div>

      {/* Confirmation modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div className="w-full max-w-sm rounded-2xl border p-6 shadow-2xl" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full" style={{ background: 'rgba(59,130,246,0.12)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
              </svg>
            </div>
            <h3 className="text-center text-[15px] font-semibold" style={{ color: 'var(--text-strong)' }}>
              Enable sharing visibility?
            </h3>
            <p className="mt-3 text-center text-[13px] leading-relaxed" style={{ color: 'var(--text-dim)' }}>
              By turning this on, your name{' '}
              <strong style={{ color: 'var(--text)' }}>{user?.displayName || ''}</strong> and email{' '}
              <strong style={{ color: 'var(--text)' }}>{user?.email || ''}</strong> will be visible
              to all CASI users in the share search. You can turn this off any time.
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setConfirm(false)}
                className="flex-1 rounded-lg border py-2 text-[13px] font-semibold transition hover:bg-[var(--card2)]"
                style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}>
                Cancel
              </button>
              <button
                onClick={() => { setConfirm(false); doToggle(true) }}
                className="flex-1 rounded-lg py-2 text-[13px] font-semibold text-white transition"
                style={{ background: 'var(--accent)' }}>
                Yes, make me discoverable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── API Keys tab ──────────────────────────────────────────────────────────────
function ApiKeysTab() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text-strong)' }}>API Keys</h2>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>Programmatic access to the CASI API.</p>
      </div>
      <div className="flex flex-col items-center justify-center py-20 rounded-xl" style={{ background: 'var(--card2)', border: '1px dashed var(--line)' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <p className="mt-4 text-[14px] font-semibold" style={{ color: 'var(--text-strong)' }}>API Keys</p>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--text-dim)' }}>Coming soon</p>
      </div>
    </div>
  )
}

// ── Main AccountPage ──────────────────────────────────────────────────────────
const TABS = ['Profile', 'Token Usage', 'API Keys']

export default function AccountPage({ theme, setTheme, accent, setAccent }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tab, setTab] = useState('Token Usage')
  const [allowSharing, setAllowSharing] = useState(false)

  // Fetch quota once to seed allow_sharing (quota endpoint now includes it)
  useEffect(() => {
    apiFetch('/api/me/quota').then(r => r.json()).then(q => {
      if (typeof q?.allow_sharing === 'boolean') setAllowSharing(q.allow_sharing)
    }).catch(() => {})
  }, [])

  return (
    <div className={`theme-${theme} ${accent} flex h-screen w-full flex-col`} style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-6" style={{ borderColor: 'var(--line)', background: 'var(--bg2)' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-7 w-7 items-center justify-center rounded-md border transition hover:bg-[var(--card2)]"
            style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
            title="Go back"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div className="h-5 w-px" style={{ background: 'var(--line)' }}/>
          <span className="text-[14px] font-semibold" style={{ color: 'var(--text-strong)' }}>Account Settings</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Accent swatches */}
          <div className="hidden items-center gap-1.5 md:flex">
            {ACCENT_COLORS.map(({ cls, hex }) => (
              <button
                key={hex}
                onClick={() => setAccent(cls)}
                title={hex}
                className="h-4 w-4 rounded-full transition hover:scale-110"
                style={{ background: hex, outline: accent === cls ? `2px solid ${hex}` : 'none', outlineOffset: 2 }}
              />
            ))}
          </div>
          <div className="h-5 w-px" style={{ background: 'var(--line)' }}/>
          <ThemeToggleBtn theme={theme} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}/>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 border-r p-4" style={{ borderColor: 'var(--line)', background: 'var(--bg2)' }}>
          <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>Account</div>
          <nav className="space-y-0.5">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[12px] font-medium transition ${tab === t ? 'bg-[var(--accent-bg)] text-accent' : 'hover:bg-[var(--card2)]'}`}
                style={{ color: tab === t ? undefined : 'var(--text-muted)' }}
              >
                {t}
                {tab === t && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="scrollbar-thin flex-1 overflow-y-auto p-8">
          {tab === 'Profile'     && <ProfileTab user={user} allowSharing={allowSharing} onAllowSharingChange={setAllowSharing} />}
          {tab === 'Token Usage' && <TokenUsageTab user={user} />}
          {tab === 'API Keys'    && <ApiKeysTab />}
        </main>
      </div>
    </div>
  )
}
