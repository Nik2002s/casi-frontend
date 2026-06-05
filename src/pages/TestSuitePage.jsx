import { useState, useEffect, useMemo } from 'react'
import { apiFetch } from '../lib/api'

// ── helpers ───────────────────────────────────────────────────────────────────
// Smart column detection from raw test record keys
function detectCols(records) {
  if (!records.length) return {}
  const keys = Object.keys(records[0])
  const find = (...candidates) => keys.find(k => candidates.some(c => k.toLowerCase().includes(c))) || null
  return {
    id:       find('tc id', 'tcid', 'test id', 'id'),
    name:     find('name', 'title', 'description', 'test case name', 'test name'),
    status:   find('status'),
    priority: find('priority'),
    module:   find('sheet', 'module'),
    sprint:   keys.find(k => k.toLowerCase().includes('sprint') && !k.toLowerCase().includes('sprint_')) || null,
    daysOpen: find('days_open', 'days open', 'open days'),
  }
}

const STATUS_COLOR = {
  'FAIL': { bg: 'rgba(239,68,68,0.12)', fg: '#ef4444' },
  'PASS': { bg: 'rgba(16,185,129,0.12)', fg: '#10b981' },
  'BLOCKED': { bg: 'rgba(245,158,11,0.12)', fg: '#f59e0b' },
  'NA': { bg: 'rgba(100,116,139,0.12)', fg: '#64748b' },
}
const statusStyle = (s = '') => STATUS_COLOR[(s || '').toUpperCase()] || { bg: 'var(--card2)', fg: 'var(--text-dim)' }

// ── Table component ───────────────────────────────────────────────────────────
function TestTable({ records, cols, search, sortKey, sortDir, onSort, onSelectTc }) {
  const filtered = useMemo(() => {
    if (!search.trim()) return records
    const q = search.toLowerCase()
    return records.filter(r => Object.values(r).some(v => String(v || '').toLowerCase().includes(q)))
  }, [records, search])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const av = String(a[sortKey] || ''), bv = String(b[sortKey] || '')
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  }, [filtered, sortKey, sortDir])

  const Th = ({ label, col }) => (
    <th
      onClick={() => onSort(col)}
      className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none hover:text-accent transition"
      style={{ color: sortKey === col ? 'var(--accent)' : 'var(--text-dim)', borderBottom: '1px solid var(--line)' }}
    >
      {label} {sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  )

  if (!sorted.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-[13px]" style={{ color: 'var(--text-dim)' }}>{search ? 'No matching test cases' : 'No test cases found'}</p>
      </div>
    )
  }

  return (
    <div className="overflow-auto">
      <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
        <thead style={{ background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 10 }}>
          <tr>
            {cols.id       && <Th label="TC ID"    col={cols.id}/>}
            {cols.name     && <Th label="Test Case" col={cols.name}/>}
            {cols.module   && <Th label="Module"   col={cols.module}/>}
            {cols.status   && <Th label="Status"   col={cols.status}/>}
            {cols.priority && <Th label="Priority" col={cols.priority}/>}
            {cols.daysOpen && <Th label="Days Open" col={cols.daysOpen}/>}
            {cols.sprint   && <Th label="Sprint"   col={cols.sprint}/>}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            const st = r[cols.status] || ''
            const sc = statusStyle(st)
            return (
              <tr
                key={i}
                onClick={() => onSelectTc?.(r)}
                className="cursor-pointer border-b transition hover:bg-[var(--card2)]"
                style={{ borderColor: 'var(--line)' }}
              >
                {cols.id && (
                  <td className="px-3 py-2.5 font-mono text-[11px] whitespace-nowrap" style={{ color: 'var(--text-dim)' }}>
                    {r[cols.id] || '—'}
                  </td>
                )}
                {cols.name && (
                  <td className="px-3 py-2.5 max-w-[320px]" style={{ color: 'var(--text-strong)' }}>
                    <div className="truncate">{r[cols.name] || '—'}</div>
                  </td>
                )}
                {cols.module && (
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ background: 'var(--card2)', color: 'var(--text-muted)' }}>
                      {r[cols.module] || '—'}
                    </span>
                  </td>
                )}
                {cols.status && (
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase" style={{ background: sc.bg, color: sc.fg }}>
                      {st || '—'}
                    </span>
                  </td>
                )}
                {cols.priority && (
                  <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                    {r[cols.priority] || '—'}
                  </td>
                )}
                {cols.daysOpen && (
                  <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap" style={{ color: r[cols.daysOpen] > 7 ? '#ef4444' : 'var(--text-dim)' }}>
                    {r[cols.daysOpen] != null ? `${r[cols.daysOpen]}d` : '—'}
                  </td>
                )}
                {cols.sprint && (
                  <td className="px-3 py-2.5 max-w-[160px]" style={{ color: 'var(--text-dim)' }}>
                    <div className="truncate text-[10px]">{r[cols.sprint] || '—'}</div>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="px-4 py-2 text-[11px]" style={{ color: 'var(--text-dim)' }}>
        {sorted.length} of {records.length} test cases
      </div>
    </div>
  )
}

// ── TC History panel — shows a test case across runs ─────────────────────────
function TcHistoryPanel({ tcId, uploads, projectId, cols, onClose }) {
  const [history, setHistory] = useState([])  // [{upload, record}]
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!tcId) return
    setLoading(true)
    // Search across all uploads for this TC ID
    Promise.all(
      uploads.map(u =>
        apiFetch(`/api/projects/${projectId}/uploads/${u.id}/tests`)
          .then(r => r.json())
          .then(recs => {
            const found = recs.find(r => {
              const idCol = cols.id
              return idCol && String(r[idCol] || '').trim() === String(tcId).trim()
            })
            return found ? { upload: u, record: found } : null
          })
          .catch(() => null)
      )
    ).then(results => {
      setHistory(results.filter(Boolean))
      setLoading(false)
    })
  }, [tcId, uploads, projectId])

  if (!tcId) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(2,6,16,0.6)', backdropFilter: 'blur(2px)' }} onClick={onClose}>
      <div className="panel w-full max-w-lg rounded-2xl shadow-2xl" style={{ maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--line)' }}>
          <div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Test case history</div>
            <div className="mt-0.5 font-mono text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>{tcId}</div>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--card2)]" style={{ color: 'var(--text-muted)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-2">
          {loading && <div className="text-center py-8 text-[13px]" style={{ color: 'var(--text-dim)' }}>Searching across runs…</div>}
          {!loading && history.length === 0 && (
            <div className="text-center py-8 text-[13px]" style={{ color: 'var(--text-dim)' }}>Not found in any uploaded run</div>
          )}
          {!loading && history.map(({ upload, record }, i) => {
            const st = record[cols.status] || ''
            const sc = statusStyle(st)
            return (
              <div key={i} className="panel-inner flex items-center gap-4 rounded-xl p-4">
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium" style={{ color: 'var(--text-strong)' }}>{upload.filename}</div>
                  <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
                    {upload.created_at ? new Date(upload.created_at).toLocaleDateString() : '—'}
                    {record[cols.sprint] && ` · ${String(record[cols.sprint]).slice(0,30)}`}
                  </div>
                </div>
                <span className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ background: sc.bg, color: sc.fg }}>
                  {st || '—'}
                </span>
                {record[cols.daysOpen] != null && (
                  <span className="shrink-0 font-mono text-[11px]" style={{ color: 'var(--text-dim)' }}>{record[cols.daysOpen]}d</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TestSuitePage({ project, uploads }) {
  const [selectedUpload, setSelectedUpload] = useState(null)
  const [records, setRecords]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [search, setSearch]     = useState('')
  const [sortKey, setSortKey]   = useState(null)
  const [sortDir, setSortDir]   = useState('asc')
  const [selectedTc, setSelectedTc] = useState(null)  // TC for cross-run history

  // Pick the first upload by default
  useEffect(() => {
    if (uploads?.length && !selectedUpload) setSelectedUpload(uploads[0])
  }, [uploads])

  // Fetch test records for the selected upload
  useEffect(() => {
    if (!selectedUpload || !project?.id) return
    setLoading(true)
    setRecords([])
    apiFetch(`/api/projects/${project.id}/uploads/${selectedUpload.id}/tests`)
      .then(r => r.json())
      .then(data => setRecords(Array.isArray(data) ? data : []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }, [selectedUpload, project?.id])

  const cols = useMemo(() => detectCols(records), [records])

  const handleSort = (col) => {
    if (!col) return
    if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('asc') }
  }

  const handleSelectTc = (r) => {
    const tcId = cols.id ? r[cols.id] : null
    if (tcId) setSelectedTc(String(tcId).trim())
  }

  if (!uploads?.length) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-24 text-center">
        <p className="text-[15px] font-semibold" style={{ color: 'var(--text-strong)' }}>No uploads yet</p>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--text-dim)' }}>Upload a test suite to browse test cases</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* ── Left sidebar: upload list ── */}
      <aside className="flex w-[260px] shrink-0 flex-col border-r" style={{ borderColor: 'var(--line)', background: 'var(--bg2)' }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--line)' }}>
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
            Test Runs · {uploads.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {uploads.map(u => {
            const active = selectedUpload?.id === u.id
            return (
              <button
                key={u.id}
                onClick={() => { setSelectedUpload(u); setSearch('') }}
                className={`w-full border-b px-4 py-3 text-left transition ${active ? 'bg-[var(--accent-bg)]' : 'hover:bg-[var(--card)]'}`}
                style={{ borderColor: 'var(--line)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-medium" style={{ color: active ? 'var(--accent)' : 'var(--text-strong)' }}>
                      {u.filename || 'Unnamed'}
                    </div>
                    <div className="mt-0.5 text-[10px]" style={{ color: 'var(--text-dim)' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                      {u.record_count != null && ` · ${u.record_count} TCs`}
                    </div>
                  </div>
                  {active && <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"/>}
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* ── Main area: test cases table ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-3" style={{ borderColor: 'var(--line)' }}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--text-dim)' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search test cases…"
                className="rounded-lg border bg-transparent py-1.5 pl-8 pr-3 text-[12px] outline-none w-56"
                style={{ borderColor: 'var(--line2)', color: 'var(--text)' }}
              />
            </div>
            {search && (
              <button onClick={() => setSearch('')} className="text-[11px]" style={{ color: 'var(--text-dim)' }}>✕ Clear</button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
              {selectedUpload?.filename}
            </span>
            <div className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[10px]" style={{ borderColor: 'var(--line)', color: 'var(--text-dim)' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              Click a row to track across runs
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            </div>
          ) : (
            <TestTable
              records={records}
              cols={cols}
              search={search}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              onSelectTc={handleSelectTc}
            />
          )}
        </div>
      </div>

      {/* Cross-run TC history modal */}
      {selectedTc && (
        <TcHistoryPanel
          tcId={selectedTc}
          uploads={uploads}
          projectId={project?.id}
          cols={cols}
          onClose={() => setSelectedTc(null)}
        />
      )}
    </div>
  )
}
