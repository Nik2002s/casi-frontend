import { useState, useEffect, useCallback, useRef } from 'react'
import { apiFetch } from '../lib/api'

// ─────────────────────────────────────────────────────────────────────────────
// VarianceDetailModal
// ─────────────────────────────────────────────────────────────────────────────
function VarianceDetailModal({ projectId, varianceId, onClose }) {
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!varianceId || !projectId) return
    setLoading(true)
    setError(false)
    setData(null)
    apiFetch(`/api/projects/${projectId}/test-execution/variances/${encodeURIComponent(varianceId)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [projectId, varianceId])

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  if (!varianceId) return null

  const fmtDate = (iso) => {
    if (!iso) return '—'
    try { return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) } catch { return iso }
  }

  const statusColor = (s) => {
    const u = (s || '').toUpperCase()
    if (u === 'APPROVED' || u === 'ACTIVE') return '#10b981'
    if (u === 'DISMISSED' || u === 'EXPIRED') return '#64748b'
    return '#f59e0b'
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(2,6,16,0.65)', backdropFilter: 'blur(3px)' }}
        onClick={onClose}
      />
      {/* Modal */}
      <div
        className="panel fixed left-1/2 top-1/2 z-50 w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border shadow-2xl"
        style={{ borderColor: 'var(--line)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--line)' }}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(59,130,246,0.12)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-semibold" style={{ color: 'var(--text-strong)' }}>Variance Detail</div>
              <div className="font-mono text-[11px]" style={{ color: 'var(--accent)' }}>{varianceId}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-[var(--card2)]"
            style={{ color: 'var(--text-dim)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {loading && (
            <div className="flex items-center justify-center py-10 gap-2 text-[13px]" style={{ color: 'var(--text-dim)' }}>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Loading…
            </div>
          )}
          {error && (
            <div className="rounded-xl border px-4 py-3 text-[12px]" style={{ borderColor: '#ef4444', color: '#ef4444', background: 'rgba(239,68,68,0.07)' }}>
              Variance details could not be loaded.
            </div>
          )}
          {data && (
            <div className="space-y-3">
              {/* Key fields grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Variance ID',  value: data.variance_id },
                  { label: 'Test Case ID', value: data.test_case_id },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border px-3 py-2.5" style={{ borderColor: 'var(--line)', background: 'var(--card2)' }}>
                    <div className="mb-0.5 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{label}</div>
                    <div className="font-mono text-[12px] font-medium" style={{ color: 'var(--text-strong)' }}>{value || '—'}</div>
                  </div>
                ))}
              </div>

              {/* Status + active window */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: 'var(--line)', background: 'var(--card2)' }}>
                  <div className="mb-0.5 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Status</div>
                  {data.variance_current_status ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-[11px] uppercase tracking-wide">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor(data.variance_current_status) }}/>
                      <span style={{ color: statusColor(data.variance_current_status) }}>{data.variance_current_status}</span>
                    </span>
                  ) : <span className="text-[12px]" style={{ color: 'var(--text-dim)' }}>—</span>}
                </div>
                <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: 'var(--line)', background: 'var(--card2)' }}>
                  <div className="mb-0.5 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Start</div>
                  <div className="text-[12px]" style={{ color: 'var(--text)' }}>{fmtDate(data.variance_start)}</div>
                </div>
                <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: 'var(--line)', background: 'var(--card2)' }}>
                  <div className="mb-0.5 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>End</div>
                  <div className="text-[12px]" style={{ color: 'var(--text)' }}>{fmtDate(data.variance_end)}</div>
                </div>
              </div>

              {/* Reason */}
              {data.variance_reason && (
                <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: 'var(--line)', background: 'var(--card2)' }}>
                  <div className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Reason</div>
                  <div className="text-[12px] leading-relaxed" style={{ color: 'var(--text)' }}>{data.variance_reason}</div>
                </div>
              )}

              {/* Coverage */}
              <div className="flex items-center gap-3 rounded-xl border px-3 py-2.5" style={{ borderColor: 'var(--line)', background: 'rgba(16,185,129,0.06)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
                <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  <span className="font-semibold font-mono" style={{ color: '#10b981' }}>{data.covered_runs ?? 0}</span> testcase run{data.covered_runs !== 1 ? 's' : ''} have this variance applied
                  {data.covered_runs > 0 && " — those FAIL results show as PASS effective."}
                </span>
              </div>

              {/* Dismissed date */}
              {data.dismissed_date && (
                <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
                  Dismissed: {fmtDate(data.dismissed_date)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SUITE_STATUSES = ['PASS', 'FAIL', 'ERROR', 'EXECUTING', 'BLOCKED']
const TC_STATUSES    = ['PASS', 'FAIL', 'ERROR', 'EXECUTING', 'BLOCKED', 'SKIP']
// Statuses that indicate no completion — suppress end date display
const NO_END_STATUSES = new Set(['ERROR', 'INFO', 'EXECUTING'])

const STATUS_STYLE = {
  PASS:      { bg: 'rgba(16,185,129,0.15)',  fg: '#10b981' },
  FAIL:      { bg: 'rgba(239,68,68,0.15)',   fg: '#ef4444' },
  ERROR:     { bg: 'rgba(239,68,68,0.15)',   fg: '#ef4444' },
  EXECUTING: { bg: 'rgba(59,130,246,0.15)',  fg: '#3b82f6' },
  BLOCKED:   { bg: 'rgba(245,158,11,0.15)',  fg: '#f59e0b' },
  SKIP:      { bg: 'rgba(100,116,139,0.15)', fg: '#64748b' },
}
const statusStyle = s => STATUS_STYLE[(s || '').toUpperCase()] || { bg: 'var(--card2)', fg: 'var(--text-dim)' }

const PAGE_SIZES = [10, 25, 50, 100]

// ─────────────────────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtDuration(seconds) {
  if (seconds == null || seconds === '') return '—'
  const s = Math.round(Number(seconds))
  if (isNaN(s)) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m ${sec}s`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

function fmtTs(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d)) return iso
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function buildQuery(filters, sort, page, pageSize) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
  params.set('sortBy', sort.col)
  params.set('sortDirection', sort.dir)
  params.set('page', page)
  params.set('pageSize', pageSize)
  return params.toString()
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const { bg, fg } = statusStyle(status)
  return (
    <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: bg, color: fg }}>
      {status || '—'}
    </span>
  )
}

function SortIcon({ col, sort }) {
  if (sort.col !== col) return <span className="ml-0.5 opacity-30">↕</span>
  return <span className="ml-0.5">{sort.dir === 'asc' ? '↑' : '↓'}</span>
}

function Th({ label, col, sort, onSort, className = '' }) {
  return (
    <th
      onClick={() => onSort(col)}
      className={`whitespace-nowrap px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none transition hover:opacity-80 ${className}`}
      style={{ color: sort.col === col ? 'var(--accent)' : 'var(--text-dim)', borderBottom: '1px solid var(--line)' }}
    >
      {label}<SortIcon col={col} sort={sort}/>
    </th>
  )
}

// Multi-select dropdown
function MultiSelect({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const selected = value ? value.split(',').filter(Boolean) : []

  const toggle = (opt) => {
    const next = selected.includes(opt) ? selected.filter(x => x !== opt) : [...selected, opt]
    onChange(next.join(','))
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex h-8 min-w-[120px] items-center justify-between gap-2 rounded-lg border px-2.5 text-[12px] transition hover:border-[var(--accent)]"
        style={{ borderColor: selected.length ? 'var(--accent)' : 'var(--line)', background: 'var(--card2)', color: selected.length ? 'var(--text-strong)' : 'var(--text-dim)' }}
      >
        <span className="truncate max-w-[140px]">
          {selected.length === 0 ? placeholder : selected.length === 1 ? selected[0] : `${selected.length} selected`}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-30 min-w-full overflow-hidden rounded-xl border py-1 shadow-xl"
          style={{ background: 'var(--card)', borderColor: 'var(--line)', minWidth: 160 }}>
          {options.map(opt => (
            <label key={opt} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[12px] transition hover:bg-[var(--card2)]"
              style={{ color: 'var(--text)' }}>
              <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)}
                className="accent-[var(--accent)] h-3 w-3"/>
              <StatusBadge status={opt}/>
            </label>
          ))}
          {selected.length > 0 && (
            <>
              <div className="mx-2 my-1 h-px" style={{ background: 'var(--line)' }}/>
              <button onClick={() => onChange('')}
                className="w-full px-3 py-1.5 text-left text-[11px] transition hover:bg-[var(--card2)]"
                style={{ color: 'var(--text-dim)' }}>
                Clear
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Simple searchable dropdown (for sprint, suite name, etc.)
function SelectFilter({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQ('') } }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const filtered = options.filter(o => o.toLowerCase().includes(q.toLowerCase()))
  const selected = value ? value.split(',').filter(Boolean) : []

  const toggle = (opt) => {
    const next = selected.includes(opt) ? selected.filter(x => x !== opt) : [...selected, opt]
    onChange(next.join(','))
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex h-8 min-w-[140px] items-center justify-between gap-2 rounded-lg border px-2.5 text-[12px] transition hover:border-[var(--accent)]"
        style={{ borderColor: selected.length ? 'var(--accent)' : 'var(--line)', background: 'var(--card2)', color: selected.length ? 'var(--text-strong)' : 'var(--text-dim)' }}
      >
        <span className="truncate max-w-[160px]">
          {selected.length === 0 ? placeholder : selected.length === 1 ? selected[0] : `${selected.length} selected`}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-30 overflow-hidden rounded-xl border shadow-xl"
          style={{ background: 'var(--card)', borderColor: 'var(--line)', width: 220 }}>
          <div className="px-2 py-2">
            <input autoFocus value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-lg border bg-transparent px-2 py-1 text-[12px] outline-none"
              style={{ borderColor: 'var(--line2)', color: 'var(--text)' }}/>
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0
              ? <div className="px-3 py-2 text-[11px]" style={{ color: 'var(--text-dim)' }}>No options</div>
              : filtered.map(opt => (
                <label key={opt} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[12px] transition hover:bg-[var(--card2)]"
                  style={{ color: 'var(--text)' }}>
                  <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)}
                    className="accent-[var(--accent)] h-3 w-3"/>
                  <span className="truncate">{opt}</span>
                </label>
              ))
            }
          </div>
          {selected.length > 0 && (
            <>
              <div className="mx-2 my-1 h-px" style={{ background: 'var(--line)' }}/>
              <button onClick={() => onChange('')}
                className="w-full px-3 py-1.5 text-left text-[11px] transition hover:bg-[var(--card2)]"
                style={{ color: 'var(--text-dim)' }}>
                Clear
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function TextFilter({ value, onChange, placeholder, width = 'w-36' }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`h-8 rounded-lg border px-2.5 text-[12px] outline-none transition hover:border-[var(--accent)] focus:border-[var(--accent)] ${width}`}
      style={{ borderColor: value ? 'var(--accent)' : 'var(--line)', background: 'var(--card2)', color: 'var(--text)' }}
    />
  )
}

function DateFilter({ valueFrom, valueTo, onChangeFrom, onChangeTo }) {
  return (
    <div className="flex items-center gap-1">
      <input type="date" value={valueFrom} onChange={e => onChangeFrom(e.target.value)}
        className="h-8 rounded-lg border px-2 text-[12px] outline-none transition hover:border-[var(--accent)]"
        style={{ borderColor: valueFrom ? 'var(--accent)' : 'var(--line)', background: 'var(--card2)', color: 'var(--text)', colorScheme: 'dark' }}/>
      <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>–</span>
      <input type="date" value={valueTo} onChange={e => onChangeTo(e.target.value)}
        className="h-8 rounded-lg border px-2 text-[12px] outline-none transition hover:border-[var(--accent)]"
        style={{ borderColor: valueTo ? 'var(--accent)' : 'var(--line)', background: 'var(--card2)', color: 'var(--text)', colorScheme: 'dark' }}/>
    </div>
  )
}

function Pagination({ page, pages, total, pageSize, onPage, onPageSize }) {
  return (
    <div className="flex shrink-0 items-center justify-between border-t px-4 py-3" style={{ borderColor: 'var(--line)' }}>
      <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-dim)' }}>
        <span>{total.toLocaleString()} record{total !== 1 ? 's' : ''}</span>
        <span>·</span>
        <span>Rows per page:</span>
        <select
          value={pageSize}
          onChange={e => onPageSize(Number(e.target.value))}
          className="rounded border px-1.5 py-0.5 text-[12px] outline-none"
          style={{ background: 'var(--card2)', borderColor: 'var(--line)', color: 'var(--text)' }}
        >
          {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(1)} disabled={page === 1}
          className="rounded px-2 py-1 text-[12px] transition hover:bg-[var(--card2)] disabled:opacity-30"
          style={{ color: 'var(--text-muted)' }}>«</button>
        <button onClick={() => onPage(page - 1)} disabled={page === 1}
          className="rounded px-2 py-1 text-[12px] transition hover:bg-[var(--card2)] disabled:opacity-30"
          style={{ color: 'var(--text-muted)' }}>‹</button>
        <span className="px-2 text-[12px]" style={{ color: 'var(--text-dim)' }}>
          Page {page} of {pages}
        </span>
        <button onClick={() => onPage(page + 1)} disabled={page >= pages}
          className="rounded px-2 py-1 text-[12px] transition hover:bg-[var(--card2)] disabled:opacity-30"
          style={{ color: 'var(--text-muted)' }}>›</button>
        <button onClick={() => onPage(pages)} disabled={page >= pages}
          className="rounded px-2 py-1 text-[12px] transition hover:bg-[var(--card2)] disabled:opacity-30"
          style={{ color: 'var(--text-muted)' }}>»</button>
      </div>
    </div>
  )
}

function ActiveFilterChip({ label, onRemove }) {
  return (
    <span className="flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
      style={{ background: 'rgba(59,130,246,0.1)', borderColor: '#3b82f6', color: '#3b82f6' }}>
      {label}
      <button onClick={onRemove} className="ml-0.5 opacity-60 hover:opacity-100">✕</button>
    </span>
  )
}

function EmptyState({ filtered }) {
  return (
    <tr>
      <td colSpan={99} className="py-20 text-center">
        <p className="text-[14px] font-medium" style={{ color: 'var(--text-dim)' }}>
          {filtered ? 'No execution runs found for selected filters.' : 'No data yet — upload a test suite first.'}
        </p>
      </td>
    </tr>
  )
}

function ErrorState({ onRetry }) {
  return (
    <tr>
      <td colSpan={99} className="py-20 text-center">
        <p className="text-[14px] font-medium" style={{ color: '#ef4444' }}>
          Unable to load execution runs.
        </p>
        <button onClick={onRetry}
          className="mt-3 rounded-lg border px-4 py-1.5 text-[12px] transition hover:bg-[var(--card2)]"
          style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}>
          Try again
        </button>
      </td>
    </tr>
  )
}

function LoadingRows({ cols }) {
  return Array.from({ length: 8 }).map((_, i) => (
    <tr key={i} className="border-b animate-pulse" style={{ borderColor: 'var(--line)' }}>
      {Array.from({ length: cols }).map((_, j) => (
        <td key={j} className="px-3 py-3">
          <div className="h-3 rounded" style={{ background: 'var(--card2)', width: `${40 + (i * j * 7) % 40}%` }}/>
        </td>
      ))}
    </tr>
  ))
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite Runs tab
// ─────────────────────────────────────────────────────────────────────────────

const SUITE_FILTER_DEFAULTS = {
  sprint: '', suiteId: '', suiteName: '', suiteRunId: '', status: '',
  startDateFrom: '', startDateTo: '', endDateFrom: '', endDateTo: '',
}

function SuiteRunsTab({ projectId, filterOptions, onRowClick, initialFilters, onFiltersChange }) {
  const [filters, setFilters] = useState({ ...SUITE_FILTER_DEFAULTS, ...initialFilters })
  const [sort, setSort]       = useState({ col: 'startTimestamp', dir: 'desc' })
  const [page, setPage]       = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [data, setData]       = useState([])
  const [total, setTotal]     = useState(0)
  const [pages, setPages]     = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(false)
  const [showFilters, setShowFilters] = useState(true)

  const setFilter = (k, v) => {
    const next = { ...filters, [k]: v }
    setFilters(next)
    setPage(1)
    onFiltersChange?.(next)
  }

  const clearFilters = () => {
    setFilters({ ...SUITE_FILTER_DEFAULTS })
    setPage(1)
    onFiltersChange?.({ ...SUITE_FILTER_DEFAULTS })
  }

  const handleSort = (col) => {
    setSort(s => ({ col, dir: s.col === col && s.dir === 'desc' ? 'asc' : 'desc' }))
    setPage(1)
  }

  const fetch = useCallback(() => {
    setLoading(true)
    setError(false)
    const qs = buildQuery(filters, sort, page, pageSize)
    apiFetch(`/api/projects/${projectId}/test-execution/suite-runs?${qs}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(res => { setData(res.data); setTotal(res.total); setPages(res.pages); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [projectId, filters, sort, page, pageSize])

  useEffect(() => { fetch() }, [fetch])

  const hasFilters = Object.values(filters).some(Boolean)

  // Active filter chips — show "N selected" for multi-value fields
  const multiLabel = (prefix, val) => {
    if (!val) return null
    const parts = val.split(',').filter(Boolean)
    return parts.length > 1 ? `${prefix}: ${parts.length} selected` : `${prefix}: ${parts[0]}`
  }
  const chips = []
  if (filters.sprint)    chips.push({ label: multiLabel('Sprint', filters.sprint),     key: 'sprint' })
  if (filters.suiteId)   chips.push({ label: `Suite ID: ${filters.suiteId}`,           key: 'suiteId' })
  if (filters.suiteName) chips.push({ label: multiLabel('Suite', filters.suiteName),   key: 'suiteName' })
  if (filters.suiteRunId) chips.push({ label: `Run ID: ${filters.suiteRunId}`,         key: 'suiteRunId' })
  if (filters.status)    chips.push({ label: multiLabel('Status', filters.status),     key: 'status' })
  if (filters.startDateFrom || filters.startDateTo) chips.push({ label: `Start: ${filters.startDateFrom || '…'} – ${filters.startDateTo || '…'}`, key: '_startDate' })
  if (filters.endDateFrom   || filters.endDateTo)   chips.push({ label: `End: ${filters.endDateFrom || '…'} – ${filters.endDateTo || '…'}`, key: '_endDate' })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Filter panel */}
      <div className="border-b shrink-0" style={{ borderColor: 'var(--line)' }}>
        <div className="flex items-center justify-between px-4 py-2.5">
          <button
            onClick={() => setShowFilters(f => !f)}
            className="flex items-center gap-1.5 text-[12px] font-medium transition hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filters
            {hasFilters && <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold" style={{ color: 'var(--accent-fg)' }}>{chips.length}</span>}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points={showFilters ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/></svg>
          </button>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <button onClick={clearFilters}
                className="rounded-lg border px-2.5 py-1 text-[11px] font-medium transition hover:bg-[var(--card2)]"
                style={{ borderColor: 'var(--line)', color: 'var(--text-dim)' }}>
                Clear all
              </button>
            )}
            <button onClick={fetch}
              className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition hover:bg-[var(--card2)]"
              style={{ borderColor: 'var(--line)', color: 'var(--text-dim)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.08-8.07"/></svg>
              Refresh
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-end gap-3 px-4 pb-3">
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Sprint</div>
              <SelectFilter options={filterOptions.sprints} value={filters.sprint}
                onChange={v => setFilter('sprint', v)} placeholder="All sprints"/>
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Suite Name</div>
              <SelectFilter options={filterOptions.suiteNames} value={filters.suiteName}
                onChange={v => setFilter('suiteName', v)} placeholder="All suites"/>
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Suite ID</div>
              <TextFilter value={filters.suiteId} onChange={v => setFilter('suiteId', v)} placeholder="Suite ID…"/>
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Run ID</div>
              <TextFilter value={filters.suiteRunId} onChange={v => setFilter('suiteRunId', v)} placeholder="Run ID…"/>
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Status</div>
              <MultiSelect options={SUITE_STATUSES} value={filters.status}
                onChange={v => setFilter('status', v)} placeholder="All statuses"/>
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Start Date</div>
              <DateFilter valueFrom={filters.startDateFrom} valueTo={filters.startDateTo}
                onChangeFrom={v => setFilter('startDateFrom', v)} onChangeTo={v => setFilter('startDateTo', v)}/>
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>End Date</div>
              <DateFilter valueFrom={filters.endDateFrom} valueTo={filters.endDateTo}
                onChangeFrom={v => setFilter('endDateFrom', v)} onChangeTo={v => setFilter('endDateTo', v)}/>
            </div>
          </div>
        )}

        {/* Active chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-2.5">
            {chips.map(c => (
              <ActiveFilterChip key={c.key} label={c.label}
                onRemove={() => {
                  if (c.key === '_startDate') { setFilter('startDateFrom', ''); setFilter('startDateTo', '') }
                  else if (c.key === '_endDate') { setFilter('endDateFrom', ''); setFilter('endDateTo', '') }
                  else setFilter(c.key, '')
                }}/>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
          <thead style={{ background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              <Th label="Suite Run ID"   col="suiteRunId"      sort={sort} onSort={handleSort}/>
              <Th label="Suite ID"       col="suiteId"         sort={sort} onSort={handleSort}/>
              <Th label="Suite Name"     col="suiteName"       sort={sort} onSort={handleSort}/>
              <Th label="Sprint"         col="sprint"          sort={sort} onSort={handleSort}/>
              <Th label="Status"         col="status"          sort={sort} onSort={handleSort}/>
              <Th label="Start"          col="startTimestamp"  sort={sort} onSort={handleSort}/>
              <Th label="End"            col="endTimestamp"    sort={sort} onSort={handleSort}/>
              <Th label="Duration"       col="duration"        sort={sort} onSort={handleSort}/>
              <Th label="Total"          col="totalTestcases"  sort={sort} onSort={handleSort} className="text-right"/>
              <Th label="Pass"           col="passedTestcases" sort={sort} onSort={handleSort} className="text-right"/>
              <Th label="Fail"           col="failedTestcases" sort={sort} onSort={handleSort} className="text-right"/>
              <Th label="Error"          col="errorTestcases"  sort={sort} onSort={handleSort} className="text-right"/>
              <Th label="Exec"           col="executingTestcases" sort={sort} onSort={handleSort} className="text-right"/>
              <Th label="Blocked"        col="blockedTestcases" sort={sort} onSort={handleSort} className="text-right"/>
            </tr>
          </thead>
          <tbody>
            {loading && <LoadingRows cols={14}/>}
            {!loading && error && <ErrorState onRetry={fetch}/>}
            {!loading && !error && data.length === 0 && <EmptyState filtered={hasFilters}/>}
            {!loading && !error && data.map(row => {
              const failed = Number(row.failed_testcases) > 0 || row.suite_run_status === 'FAIL'
              const errored = row.suite_run_status === 'ERROR'
              return (
                <tr
                  key={row.id}
                  onClick={() => onRowClick(row.suite_run_id)}
                  className="cursor-pointer border-b transition hover:bg-[var(--card2)]"
                  style={{
                    borderColor: 'var(--line)',
                    background: failed ? 'rgba(239,68,68,0.03)' : errored ? 'rgba(239,68,68,0.03)' : undefined,
                  }}
                >
                  <td className="px-3 py-2.5 font-mono text-[11px] whitespace-nowrap" style={{ color: 'var(--accent)' }}>{row.suite_run_id}</td>
                  <td className="px-3 py-2.5 font-mono text-[11px]" style={{ color: 'var(--text-dim)' }}>{row.suite_id || '—'}</td>
                  <td className="px-3 py-2.5 max-w-[180px]"><div className="truncate font-medium" style={{ color: 'var(--text-strong)' }}>{row.suite_name || '—'}</div></td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: 'var(--card2)', color: 'var(--text-muted)' }}>{row.sprint || '—'}</span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap"><StatusBadge status={row.suite_run_status}/></td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-[11px]" style={{ color: 'var(--text-muted)' }}>{fmtTs(row.start_timestamp)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-[11px]" style={{ color: 'var(--text-muted)' }}>{NO_END_STATUSES.has((row.suite_run_status || '').toUpperCase()) ? '—' : fmtTs(row.end_timestamp)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px]" style={{ color: 'var(--text-dim)' }}>{fmtDuration(row.duration_seconds)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-[11px]" style={{ color: 'var(--text-dim)' }}>{row.total_testcases ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-[11px]" style={{ color: Number(row.passed_testcases) > 0 ? '#10b981' : 'var(--text-dim)' }}>{row.passed_testcases ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-[11px]" style={{ color: Number(row.failed_testcases) > 0 ? '#ef4444' : 'var(--text-dim)' }}>{row.failed_testcases ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-[11px]" style={{ color: Number(row.error_testcases) > 0 ? '#ef4444' : 'var(--text-dim)' }}>{row.error_testcases ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-[11px]" style={{ color: Number(row.executing_testcases) > 0 ? '#3b82f6' : 'var(--text-dim)' }}>{row.executing_testcases ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-[11px]" style={{ color: Number(row.blocked_testcases) > 0 ? '#f59e0b' : 'var(--text-dim)' }}>{row.blocked_testcases ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pages={pages} total={total} pageSize={pageSize}
        onPage={setPage} onPageSize={n => { setPageSize(n); setPage(1) }}/>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Testcase Runs tab
// ─────────────────────────────────────────────────────────────────────────────

const TC_FILTER_DEFAULTS = {
  sprint: '', suiteId: '', suiteName: '', suiteRunId: '',
  tcId: '', tcRunId: '', tcName: '',
  originalStatus: '', effectiveStatus: '',
  executedBy: '', activeVarianceApplied: '', varianceId: '',
  startDateFrom: '', startDateTo: '', endDateFrom: '', endDateTo: '',
}

function TestcaseRunsTab({ projectId, filterOptions, initialFilters, onFiltersChange }) {
  const [filters, setFilters] = useState({ ...TC_FILTER_DEFAULTS, ...initialFilters })
  const [sort, setSort]       = useState({ col: 'startTimestamp', dir: 'desc' })
  const [varianceModal, setVarianceModal] = useState(null)  // variance_id string or null
  const [page, setPage]       = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [data, setData]       = useState([])
  const [total, setTotal]     = useState(0)
  const [pages, setPages]     = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(false)
  const [showFilters, setShowFilters] = useState(true)

  // When parent injects a suiteRunId filter (from clicking a suite row), apply it
  useEffect(() => {
    if (initialFilters?.suiteRunId !== undefined) {
      setFilters(f => ({ ...f, suiteRunId: initialFilters.suiteRunId }))
      setPage(1)
    }
  }, [initialFilters?.suiteRunId])

  const setFilter = (k, v) => {
    const next = { ...filters, [k]: v }
    setFilters(next)
    setPage(1)
    onFiltersChange?.(next)
  }

  const clearFilters = () => {
    setFilters({ ...TC_FILTER_DEFAULTS })
    setPage(1)
    onFiltersChange?.({ ...TC_FILTER_DEFAULTS })
  }

  const handleSort = (col) => {
    setSort(s => ({ col, dir: s.col === col && s.dir === 'desc' ? 'asc' : 'desc' }))
    setPage(1)
  }

  const fetch = useCallback(() => {
    setLoading(true)
    setError(false)
    const qs = buildQuery(filters, sort, page, pageSize)
    apiFetch(`/api/projects/${projectId}/test-execution/testcase-runs?${qs}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(res => { setData(res.data); setTotal(res.total); setPages(res.pages); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [projectId, filters, sort, page, pageSize])

  useEffect(() => { fetch() }, [fetch])

  const hasFilters = Object.values(filters).some(Boolean)

  const multiLabel = (prefix, val) => {
    if (!val) return null
    const parts = val.split(',').filter(Boolean)
    return parts.length > 1 ? `${prefix}: ${parts.length} selected` : `${prefix}: ${parts[0]}`
  }
  const chips = []
  if (filters.suiteRunId)   chips.push({ label: `Suite Run: ${filters.suiteRunId}`,           key: 'suiteRunId' })
  if (filters.sprint)       chips.push({ label: multiLabel('Sprint', filters.sprint),          key: 'sprint' })
  if (filters.suiteName)    chips.push({ label: multiLabel('Suite', filters.suiteName),        key: 'suiteName' })
  if (filters.suiteId)      chips.push({ label: `Suite ID: ${filters.suiteId}`,                key: 'suiteId' })
  if (filters.tcId)         chips.push({ label: `TC ID: ${filters.tcId}`,                     key: 'tcId' })
  if (filters.tcRunId)      chips.push({ label: `TC Run ID: ${filters.tcRunId}`,               key: 'tcRunId' })
  if (filters.tcName)       chips.push({ label: `TC Name: ${filters.tcName}`,                 key: 'tcName' })
  if (filters.originalStatus)  chips.push({ label: multiLabel('Orig', filters.originalStatus), key: 'originalStatus' })
  if (filters.effectiveStatus) chips.push({ label: multiLabel('Eff', filters.effectiveStatus), key: 'effectiveStatus' })
  if (filters.executedBy)   chips.push({ label: multiLabel('By', filters.executedBy),          key: 'executedBy' })
  if (filters.activeVarianceApplied) chips.push({ label: `Variance: ${filters.activeVarianceApplied}`, key: 'activeVarianceApplied' })
  if (filters.varianceId)   chips.push({ label: `Var ID: ${filters.varianceId}`,               key: 'varianceId' })
  if (filters.startDateFrom || filters.startDateTo) chips.push({ label: `Start: ${filters.startDateFrom || '…'} – ${filters.startDateTo || '…'}`, key: '_startDate' })
  if (filters.endDateFrom   || filters.endDateTo)   chips.push({ label: `End: ${filters.endDateFrom || '…'} – ${filters.endDateTo || '…'}`, key: '_endDate' })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Suite Run ID injected-filter banner */}
      {filters.suiteRunId && (
        <div className="flex shrink-0 items-center gap-3 border-b px-4 py-2"
          style={{ background: 'rgba(59,130,246,0.07)', borderColor: '#3b82f6' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          <span className="text-[12px] font-medium" style={{ color: '#3b82f6' }}>
            Filtered by Suite Run: <span className="font-mono">{filters.suiteRunId}</span>
          </span>
          <button onClick={() => setFilter('suiteRunId', '')}
            className="ml-auto rounded-lg border px-2 py-0.5 text-[11px] transition hover:bg-[rgba(59,130,246,0.15)]"
            style={{ borderColor: '#3b82f6', color: '#3b82f6' }}>
            ✕ Remove filter
          </button>
        </div>
      )}

      {/* Filter panel */}
      <div className="border-b shrink-0" style={{ borderColor: 'var(--line)' }}>
        <div className="flex items-center justify-between px-4 py-2.5">
          <button
            onClick={() => setShowFilters(f => !f)}
            className="flex items-center gap-1.5 text-[12px] font-medium transition hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filters
            {hasFilters && <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold" style={{ color: 'var(--accent-fg)' }}>{chips.length}</span>}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points={showFilters ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/></svg>
          </button>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <button onClick={clearFilters}
                className="rounded-lg border px-2.5 py-1 text-[11px] font-medium transition hover:bg-[var(--card2)]"
                style={{ borderColor: 'var(--line)', color: 'var(--text-dim)' }}>
                Clear all
              </button>
            )}
            <button onClick={fetch}
              className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition hover:bg-[var(--card2)]"
              style={{ borderColor: 'var(--line)', color: 'var(--text-dim)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.08-8.07"/></svg>
              Refresh
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-end gap-3 px-4 pb-3">
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Sprint</div>
              <SelectFilter options={filterOptions.sprints} value={filters.sprint}
                onChange={v => setFilter('sprint', v)} placeholder="All sprints"/>
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Suite Name</div>
              <SelectFilter options={filterOptions.suiteNames} value={filters.suiteName}
                onChange={v => setFilter('suiteName', v)} placeholder="All suites"/>
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Suite ID</div>
              <TextFilter value={filters.suiteId} onChange={v => setFilter('suiteId', v)} placeholder="Suite ID…"/>
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Suite Run ID</div>
              <TextFilter value={filters.suiteRunId} onChange={v => setFilter('suiteRunId', v)} placeholder="Suite Run ID…" width="w-44"/>
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>TC ID</div>
              <TextFilter value={filters.tcId} onChange={v => setFilter('tcId', v)} placeholder="TC ID…"/>
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>TC Run ID</div>
              <TextFilter value={filters.tcRunId} onChange={v => setFilter('tcRunId', v)} placeholder="TC Run ID…" width="w-40"/>
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>TC Name</div>
              <TextFilter value={filters.tcName} onChange={v => setFilter('tcName', v)} placeholder="Name…" width="w-40"/>
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Original Status</div>
              <MultiSelect options={TC_STATUSES} value={filters.originalStatus}
                onChange={v => setFilter('originalStatus', v)} placeholder="All"/>
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Effective Status</div>
              <MultiSelect options={TC_STATUSES} value={filters.effectiveStatus}
                onChange={v => setFilter('effectiveStatus', v)} placeholder="All"/>
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Executed By</div>
              <SelectFilter options={filterOptions.executedBy} value={filters.executedBy}
                onChange={v => setFilter('executedBy', v)} placeholder="Anyone"/>
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Variance Applied</div>
              <select
                value={filters.activeVarianceApplied}
                onChange={e => setFilter('activeVarianceApplied', e.target.value)}
                className="h-8 rounded-lg border px-2.5 text-[12px] outline-none transition"
                style={{ borderColor: filters.activeVarianceApplied ? 'var(--accent)' : 'var(--line)', background: 'var(--card2)', color: 'var(--text)' }}
              >
                <option value="">All</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Variance ID</div>
              <TextFilter value={filters.varianceId} onChange={v => setFilter('varianceId', v)} placeholder="Variance ID…" width="w-36"/>
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Start Date</div>
              <DateFilter valueFrom={filters.startDateFrom} valueTo={filters.startDateTo}
                onChangeFrom={v => setFilter('startDateFrom', v)} onChangeTo={v => setFilter('startDateTo', v)}/>
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>End Date</div>
              <DateFilter valueFrom={filters.endDateFrom} valueTo={filters.endDateTo}
                onChangeFrom={v => setFilter('endDateFrom', v)} onChangeTo={v => setFilter('endDateTo', v)}/>
            </div>
          </div>
        )}

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-2.5">
            {chips.map(c => (
              <ActiveFilterChip key={c.key} label={c.label}
                onRemove={() => {
                  if (c.key === '_startDate') { setFilter('startDateFrom', ''); setFilter('startDateTo', '') }
                  else if (c.key === '_endDate') { setFilter('endDateFrom', ''); setFilter('endDateTo', '') }
                  else setFilter(c.key, '')
                }}/>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
          <thead style={{ background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              <Th label="TC Run ID"       col="tcRunId"               sort={sort} onSort={handleSort}/>
              <Th label="Suite Run ID"    col="suiteRunId"            sort={sort} onSort={handleSort}/>
              <Th label="TC ID"           col="tcId"                  sort={sort} onSort={handleSort}/>
              <Th label="TC Name"         col="tcName"                sort={sort} onSort={handleSort}/>
              <Th label="Suite ID"        col="suiteId"               sort={sort} onSort={handleSort}/>
              <Th label="Suite Name"      col="suiteName"             sort={sort} onSort={handleSort}/>
              <Th label="Sprint"          col="sprint"                sort={sort} onSort={handleSort}/>
              <Th label="Orig Status"     col="originalStatus"        sort={sort} onSort={handleSort}/>
              <Th label="Eff Status"      col="effectiveStatus"       sort={sort} onSort={handleSort}/>
              <Th label="Executed By"     col="executedBy"            sort={sort} onSort={handleSort}/>
              <Th label="Start"           col="startTimestamp"        sort={sort} onSort={handleSort}/>
              <Th label="End"             col="endTimestamp"          sort={sort} onSort={handleSort}/>
              <Th label="Duration"        col="duration"              sort={sort} onSort={handleSort}/>
              <Th label="Variance"        col="activeVarianceApplied" sort={sort} onSort={handleSort}/>
              <Th label="Variance ID"     col="varianceId"            sort={sort} onSort={handleSort}/>
            </tr>
          </thead>
          <tbody>
            {loading && <LoadingRows cols={15}/>}
            {!loading && error && <ErrorState onRetry={fetch}/>}
            {!loading && !error && data.length === 0 && <EmptyState filtered={hasFilters}/>}
            {!loading && !error && data.map(row => {
              const isFail  = ['FAIL','ERROR'].includes((row.effective_status || '').toUpperCase())
              return (
                <tr
                  key={row.id}
                  className="border-b transition hover:bg-[var(--card2)]"
                  style={{
                    borderColor: 'var(--line)',
                    background: isFail ? 'rgba(239,68,68,0.03)' : undefined,
                  }}
                >
                  <td className="px-3 py-2 font-mono text-[11px] whitespace-nowrap" style={{ color: 'var(--accent)' }}>{row.tc_run_id || '—'}</td>
                  <td className="px-3 py-2 font-mono text-[11px] whitespace-nowrap" style={{ color: 'var(--text-dim)' }}>{row.suite_run_id || '—'}</td>
                  <td className="px-3 py-2 font-mono text-[11px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{row.tc_id || '—'}</td>
                  <td className="px-3 py-2 max-w-[200px]"><div className="truncate" style={{ color: 'var(--text-strong)' }}>{row.tc_name || '—'}</div></td>
                  <td className="px-3 py-2 font-mono text-[11px]" style={{ color: 'var(--text-dim)' }}>{row.suite_id || '—'}</td>
                  <td className="px-3 py-2 max-w-[140px]"><div className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>{row.suite_name || '—'}</div></td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: 'var(--card2)', color: 'var(--text-muted)' }}>{row.sprint || '—'}</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap"><StatusBadge status={row.original_status}/></td>
                  <td className="px-3 py-2 whitespace-nowrap"><StatusBadge status={row.effective_status}/></td>
                  <td className="px-3 py-2 text-[11px]" style={{ color: 'var(--text-dim)' }}>{row.executed_by || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-[11px]" style={{ color: 'var(--text-muted)' }}>{fmtTs(row.start_timestamp)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-[11px]" style={{ color: 'var(--text-muted)' }}>{NO_END_STATUSES.has((row.original_status || '').toUpperCase()) ? '—' : fmtTs(row.end_timestamp)}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-[11px]" style={{ color: 'var(--text-dim)' }}>{fmtDuration(row.duration_seconds)}</td>
                  <td className="px-3 py-2 text-center">
                    {row.active_variance_applied
                      ? <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>Yes</span>
                      : <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>—</span>
                    }
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px]">
                    {row.variance_id
                      ? (
                        <button
                          onClick={e => { e.stopPropagation(); setVarianceModal(row.variance_id) }}
                          className="font-mono text-[11px] underline decoration-dotted transition hover:opacity-80"
                          style={{ color: '#3b82f6' }}
                          title="Click to view variance details"
                        >
                          {row.variance_id}
                        </button>
                      )
                      : <span style={{ color: 'var(--text-dim)' }}>—</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {varianceModal && (
        <VarianceDetailModal
          projectId={projectId}
          varianceId={varianceModal}
          onClose={() => setVarianceModal(null)}
        />
      )}

      <Pagination page={page} pages={pages} total={total} pageSize={pageSize}
        onPage={setPage} onPageSize={n => { setPageSize(n); setPage(1) }}/>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function TestExecutionPage({ project }) {
  const [activeTab, setActiveTab] = useState('suite')    // 'suite' | 'tc'
  const [tcInitialFilters, setTcInitialFilters] = useState({})
  const [filterOptions, setFilterOptions] = useState({ sprints: [], suiteNames: [], executedBy: [] })

  useEffect(() => {
    if (!project?.id) return
    apiFetch(`/api/projects/${project.id}/test-execution/filter-options`)
      .then(r => r.ok ? r.json() : { sprints: [], suiteNames: [], executedBy: [] })
      .then(data => setFilterOptions(data))
      .catch(() => {})
  }, [project?.id])

  // When user clicks a suite run row → switch to TC tab with suiteRunId filter
  const handleSuiteRowClick = (suiteRunId) => {
    setTcInitialFilters({ suiteRunId })
    setActiveTab('tc')
  }

  if (!project?.id) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-24 text-center">
        <p className="text-[15px] font-semibold" style={{ color: 'var(--text-strong)' }}>No project selected</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Page header + tabs */}
      <div className="shrink-0 border-b px-5" style={{ borderColor: 'var(--line)', background: 'var(--bg2)' }}>
        <div className="flex items-center justify-between py-3">
          <div>
            <h1 className="text-[15px] font-semibold" style={{ color: 'var(--text-strong)' }}>Test Execution Runs</h1>
            <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>Browse suite and testcase run history for this project</p>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-0">
          {[
            { id: 'suite', label: 'Suite Runs' },
            { id: 'tc',    label: 'Testcase Runs' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative px-4 pb-3 pt-1 text-[13px] font-medium transition"
              style={{ color: activeTab === tab.id ? 'var(--text-strong)' : 'var(--text-dim)' }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-t-full bg-accent"/>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content — keep both mounted to preserve filter state on tab switch */}
      <div className={`min-h-0 flex-1 flex-col overflow-hidden ${activeTab === 'suite' ? 'flex' : 'hidden'}`}>
        <SuiteRunsTab
          projectId={project.id}
          filterOptions={filterOptions}
          onRowClick={handleSuiteRowClick}
        />
      </div>

      <div className={`min-h-0 flex-1 flex-col overflow-hidden ${activeTab === 'tc' ? 'flex' : 'hidden'}`}>
        <TestcaseRunsTab
          projectId={project.id}
          filterOptions={filterOptions}
          initialFilters={tcInitialFilters}
        />
      </div>
    </div>
  )
}
