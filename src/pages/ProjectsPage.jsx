import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chip, gateColor, ThemeToggleBtn } from '../components/primitives'
import NewProjectModal from '../components/NewProjectModal'
import { apiFetch } from '../lib/api'
import { useAuth } from '../lib/AuthContext'

function ProjectCard({ p, onOpen, compareMode, selected, onToggle, onDelete, selectMode, isSelected, onToggleSelect, rcStatus }) {
  // Parse last_scores — comes from DB as JSON string or object
  let scores = {}
  if (p.last_scores) {
    try { scores = typeof p.last_scores === 'string' ? JSON.parse(p.last_scores) : p.last_scores } catch {}
  }
  const gate  = scores.casi_gate  || p.gate  || null
  const casi  = Math.round(scores.casi_score  ?? p.casi  ?? 0)
  const asi   = Math.round(scores.asi_score   ?? p.asi   ?? 0)
  const color = gate ? gateColor(gate) : 'var(--text-dim)'

  const [dropOpen, setDropOpen] = useState(false)
  const dropRef = useRef(null)
  useEffect(() => {
    if (!dropOpen) return
    const onDoc = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false) }
    const onEsc = (e) => { if (e.key === 'Escape') setDropOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc) }
  }, [dropOpen])

  // Relative time from last_run_at
  const relTime = (ts) => {
    if (!ts) return 'No runs yet'
    const diff = Date.now() - new Date(ts)
    const m = Math.floor(diff / 60000)
    if (m < 1)   return 'just now'
    if (m < 60)  return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24)  return `${h}h ago`
    const d = Math.floor(h / 24)
    if (d < 7)   return `${d}d ago`
    return new Date(ts).toLocaleDateString()
  }

  return (
    <div
      onClick={() => selectMode ? onToggleSelect?.(p.id) : compareMode ? onToggle?.(p.id) : onOpen(p)}
      className="panel group relative cursor-pointer overflow-hidden rounded-2xl p-5 transition hover:ring-1"
      style={{
        '--tw-ring-color': selectMode && isSelected ? '#10B981' : compareMode && selected ? (selected === 'A' ? '#3B82F6' : '#8B5CF6') : 'var(--accent-ring)',
        outline: selectMode && isSelected ? '2px solid #10B981' : compareMode && selected ? `2px solid ${selected === 'A' ? '#3B82F6' : '#8B5CF6'}` : 'none',
      }}
    >
      {/* Gate rail */}
      <div className="absolute inset-y-0 left-0 w-[3px]" style={{ background: color }}/>

      {/* Compare badge */}
      {compareMode && selected && (
        <div
          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ background: selected === 'A' ? '#3B82F6' : '#8B5CF6' }}
        >{selected}</div>
      )}
      {/* Select checkbox */}
      {selectMode && (
        <div
          className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded border-2 transition"
          style={{ background: isSelected ? '#10B981' : 'var(--card)', borderColor: isSelected ? '#10B981' : 'var(--line2)' }}
        >
          {isSelected && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          )}
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }}/>
          {gate
            ? <Chip tone={gate === 'Green' ? 'green' : gate === 'Yellow' ? 'amber' : 'red'}>{gate}</Chip>
            : <Chip tone="slate">No data</Chip>
          }
        </div>
        <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
          {(p.suite_run_count_6m ?? 0)} Suite runs · {(p.tc_run_count_6m ?? 0)} TC runs <span style={{ opacity: 0.6 }}>(6mo)</span>
        </span>
      </div>

      <h3 className="mt-4 text-[15px] font-semibold tracking-tight" style={{ color: 'var(--text-strong)' }}>{p.name}</h3>
      <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-dim)' }}>
        Last run · {relTime(p.last_run_at)}
      </p>

      {gate ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>CASI</div>
              <div className="font-mono text-xl font-semibold" style={{ color }}>{casi}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>ASI</div>
              <div className="font-mono text-xl font-semibold" style={{ color: 'var(--text-muted)' }}>{asi}</div>
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--line)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${(casi / 999) * 100}%`, background: color }}/>
          </div>
        </>
      ) : (
        <div className="mt-4 flex items-center justify-center rounded-lg py-5" style={{ background: 'var(--card2)' }}>
          <span className="text-[12px]" style={{ color: 'var(--text-dim)' }}>Upload a test suite to see scores</span>
        </div>
      )}

      {p.description && (
        <p className="mt-3 line-clamp-1 text-[11px]" style={{ color: 'var(--text-dim)' }}>{p.description}</p>
      )}

      <div className="mt-5 flex items-center justify-between border-t pt-4" style={{ borderColor: 'var(--line)' }}>
        {selectMode
          ? <span className="text-[12px] font-medium" style={{ color: isSelected ? '#10B981' : 'var(--text-muted)' }}>
              {isSelected ? '✓ Selected' : 'Click to select'}
            </span>
          : compareMode
            ? <span className="text-[12px] font-medium" style={{ color: selected ? (selected === 'A' ? '#3B82F6' : '#8B5CF6') : 'var(--text-muted)' }}>
                {selected ? `Selected as ${selected}` : 'Click to select'}
              </span>
            : <span className="text-[12px] font-medium text-accent">Open project →</span>
        }
        {selectMode && rcStatus && (
          <div className="flex items-center gap-1 text-[11px] font-medium">
            {rcStatus === 'running' && <><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><span style={{ color: 'var(--text-dim)' }}>Running…</span></>}
            {rcStatus === 'done'    && <span style={{ color: '#10B981' }}>✓ Done</span>}
            {rcStatus === 'error'   && <span style={{ color: '#EF4444' }}>✗ Failed</span>}
          </div>
        )}
        {!compareMode && !selectMode && (
          <div className="relative" ref={dropRef}>
            <button
              onClick={e => { e.stopPropagation(); setDropOpen(o => !o) }}
              className="rounded p-1 hover:bg-[var(--card2)]"
              style={{ color: 'var(--text-dim)' }}
              aria-label="Project options"
            >⋯</button>
            {dropOpen && (
              <div
                role="menu"
                className="absolute right-0 z-50 min-w-[160px] overflow-hidden rounded-xl border shadow-xl"
                style={{ bottom: '28px', background: 'var(--card)', borderColor: 'var(--line)' }}
              >
                <button
                  role="menuitem"
                  onClick={e => {
                    e.stopPropagation()
                    setDropOpen(false)
                    if (window.confirm(`Delete "${p.name}"? This cannot be undone.`)) onDelete(p.id)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-[13px] transition hover:bg-red-500/10"
                  style={{ color: '#EF4444' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                  Delete project
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProjectsPage({ theme, setTheme, accent, setAccent, onProjectCreated }) {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [filter, setFilter]         = useState('All')
  const [search, setSearch]         = useState('')
  const [projects, setProjects]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  // compareSelected: { A: projectId | null, B: projectId | null }
  const [compareSelected, setCompareSelected] = useState({ A: null, B: null })
  const [selectMode, setSelectMode]           = useState(false)
  const [selectedIds, setSelectedIds]         = useState(new Set())
  const [recomputeStatus, setRecomputeStatus] = useState({})
  const [recomputing, setRecomputing]         = useState(false)

  // Click-toggle account menu (was hover-only — invisible on touch / many trackpads)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    const onEsc = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc) }
  }, [menuOpen])

  const load = () => {
    setLoading(true)
    apiFetch('/api/projects')
      .then(r => r.json())
      .then(data => { setProjects(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = useCallback(async (id) => {
    try {
      await apiFetch(`/api/projects/${id}`, { method: 'DELETE' })
      load()
    } catch {}
  }, [])

  const handleCreated = (data) => {
    setShowModal(false)
    load() // refresh list
    onProjectCreated?.(data) // bubble up so App can store API key
  }

  const handleCompareModeToggle = () => {
    setCompareMode(m => !m)
    setCompareSelected({ A: null, B: null })
  }

  const handleToggleCompareSelect = (id) => {
    setCompareSelected(prev => {
      if (prev.A === id) return { ...prev, A: null }
      if (prev.B === id) return { ...prev, B: null }
      if (!prev.A) return { ...prev, A: id }
      if (!prev.B) return { ...prev, B: id }
      // Both slots full — swap A out
      return { A: id, B: prev.B }
    })
  }

  const handleCompare = () => {
    if (compareSelected.A && compareSelected.B) {
      navigate(`/compare?a=${compareSelected.A}&b=${compareSelected.B}`)
    }
  }

  const handleSelectModeToggle = () => {
    setSelectMode(m => !m)
    setSelectedIds(new Set())
    setRecomputeStatus({})
  }

  const handleToggleSelect = useCallback((id) => {
    setSelectedIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])

  const handleSelectAll = (filteredList) => {
    setSelectedIds(s => s.size === filteredList.length && filteredList.length > 0
      ? new Set()
      : new Set(filteredList.map(p => p.id))
    )
  }

  const handleRecompute = async (ids) => {
    if (ids.length === 0 || recomputing) return
    setRecomputing(true)
    setRecomputeStatus(Object.fromEntries(ids.map(id => [id, 'running'])))
    await Promise.allSettled(ids.map(async (id) => {
      try {
        await apiFetch(`/api/projects/${id}/recompute`, { method: 'POST' })
        setRecomputeStatus(s => ({ ...s, [id]: 'done' }))
      } catch {
        setRecomputeStatus(s => ({ ...s, [id]: 'error' }))
      }
    }))
    setRecomputing(false)
    load()
  }

  // Parse gate from last_scores for filtering
  const getGate = (p) => {
    if (!p.last_scores) return null
    try {
      const s = typeof p.last_scores === 'string' ? JSON.parse(p.last_scores) : p.last_scores
      return s.casi_gate || null
    } catch { return null }
  }

  const filtered = projects.filter(p => {
    const gate = getGate(p)
    if (filter !== 'All' && gate !== filter) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className={`theme-${theme} ${accent} flex h-screen w-full flex-col`} style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b px-8" style={{ borderColor: 'var(--line)', background: 'var(--bg3)' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent font-mono text-xs font-bold" style={{ color: 'var(--accent-fg)' }}>C</div>
          <span className="font-semibold tracking-tight" style={{ color: 'var(--text-strong)' }}>CASI</span>
          <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>· All projects</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggleBtn theme={theme} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}/>
          <button
            onClick={handleCompareModeToggle}
            className="rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition"
            style={{
              borderColor: compareMode ? '#3B82F6' : 'var(--line)',
              color: compareMode ? '#3B82F6' : 'var(--text-muted)',
              background: compareMode ? 'rgba(59,130,246,0.08)' : 'transparent',
            }}
          >
            {compareMode ? '✕ Cancel' : '⇄ Compare'}
          </button>
          {!compareMode && (
            <button
              onClick={() => setShowModal(true)}
              className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-semibold"
              style={{ color: 'var(--accent-fg)' }}
            >
              + New Project
            </button>
          )}
          {compareMode && (
            <button
              onClick={handleCompare}
              disabled={!compareSelected.A || !compareSelected.B}
              className="rounded-lg px-3 py-1.5 text-[13px] font-semibold transition disabled:opacity-40"
              style={{ background: '#3B82F6', color: '#fff' }}
            >
              Compare →
            </button>
          )}
          <button
            onClick={handleSelectModeToggle}
            className="rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition"
            style={{
              borderColor: selectMode ? '#10B981' : 'var(--line)',
              color: selectMode ? '#10B981' : 'var(--text-muted)',
              background: selectMode ? 'rgba(16,185,129,0.08)' : 'transparent',
            }}
          >
            {selectMode ? '✕ Cancel' : '☑ Select'}
          </button>
          {/* User avatar + sign-out dropdown (rightmost) */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-1 overflow-hidden rounded-full p-0.5 ring-1 transition hover:ring-2"
              style={{ '--tw-ring-color': 'var(--line2)' }}
              title={user?.email || 'Account'}
            >
              <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full">
                {user?.photoURL
                  ? <img src={user.photoURL} alt="" className="h-full w-full object-cover"/>
                  : <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-400 to-violet-500 text-[11px] font-bold text-white">
                      {(user?.email?.[0] || 'U').toUpperCase()}
                    </div>
                }
              </span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {/* Dropdown */}
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-10 z-50 min-w-[200px] overflow-hidden rounded-xl border shadow-xl"
                style={{ background: 'var(--card)', borderColor: 'var(--line)' }}
              >
                <div className="px-3 py-2.5 text-[11px] font-medium" style={{ color: 'var(--text-dim)', borderBottom: '1px solid var(--line)' }}>
                  <div className="truncate" style={{ color: 'var(--text-strong)' }}>{user?.displayName || 'User'}</div>
                  <div className="truncate">{user?.email}</div>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); signOut() }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-[13px] transition hover:bg-[var(--card2)]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Filter bar */}
      <div className="border-b px-8 py-4" style={{ borderColor: 'var(--line)' }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: 'var(--line)', background: 'var(--card)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-dim)' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="flex-1 bg-transparent text-[13px] outline-none"
              style={{ color: 'var(--text)' }}
            />
            <span className="font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>⌘K</span>
          </div>
          <div className="flex items-center gap-1 rounded-lg border p-1" style={{ borderColor: 'var(--line)', background: 'var(--card)' }}>
            {['All', 'Green', 'Yellow', 'Red'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="rounded-md px-3 py-1 text-[12px] transition"
                style={{ background: filter === f ? 'var(--card2)' : 'transparent', color: filter === f ? 'var(--text-strong)' : 'var(--text-muted)' }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards grid */}
      <div className="scrollbar-thin flex-1 overflow-y-auto p-8">
        <div className="mb-5 flex items-baseline gap-2">
          <h2 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-strong)' }}>{filter === 'All' ? 'All Projects' : `${filter} Projects`}</h2>
          <span className="font-mono text-[11px]" style={{ color: 'var(--text-dim)' }}>{filtered.length}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-dim)' }}>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Loading projects…
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'var(--card2)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </div>
            <p className="mt-4 text-[15px] font-semibold" style={{ color: 'var(--text-strong)' }}>
              {projects.length === 0 ? 'No projects yet' : 'No matching projects'}
            </p>
            {projects.length === 0 && (
              <>
                <p className="mt-1 text-[13px]" style={{ color: 'var(--text-dim)' }}>Create a project to start tracking engineering maturity</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold"
                  style={{ color: 'var(--accent-fg)' }}
                >
                  + New Project
                </button>
              </>
            )}
          </div>
        ) : (
          <>
          {compareMode && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-dashed px-4 py-3" style={{ borderColor: '#3B82F6', background: 'rgba(59,130,246,0.05)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 0-2 2h-3"/></svg>
              <span className="text-[13px]" style={{ color: '#3B82F6' }}>
                {!compareSelected.A && !compareSelected.B && 'Select two projects to compare'}
                {compareSelected.A && !compareSelected.B && 'Now select a second project'}
                {compareSelected.A && compareSelected.B && 'Ready to compare — click "Compare →"'}
              </span>
              {(compareSelected.A || compareSelected.B) && (
                <button onClick={() => setCompareSelected({ A: null, B: null })} className="ml-auto text-[11px]" style={{ color: 'var(--text-dim)' }}>Clear</button>
              )}
            </div>
          )}
          {selectMode && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-dashed px-4 py-3" style={{ borderColor: '#10B981', background: 'rgba(16,185,129,0.05)' }}>
              <div
                onClick={() => handleSelectAll(filtered)}
                className="flex h-4 w-4 cursor-pointer items-center justify-center rounded border-2 transition"
                style={{ background: selectedIds.size === filtered.length && filtered.length > 0 ? '#10B981' : 'transparent', borderColor: '#10B981' }}
              >
                {selectedIds.size === filtered.length && filtered.length > 0 && (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                )}
              </div>
              <button onClick={() => handleSelectAll(filtered)} className="text-[13px]" style={{ color: '#10B981' }}>Select all</button>
              <span className="text-[13px]" style={{ color: '#10B981' }}>
                {selectedIds.size === 0 ? 'Click cards to select' : `${selectedIds.size} project${selectedIds.size !== 1 ? 's' : ''} selected`}
              </span>
              <button
                disabled={selectedIds.size === 0 || recomputing}
                onClick={() => handleRecompute([...selectedIds])}
                className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition"
                style={{
                  background: selectedIds.size === 0 ? 'var(--card2)' : '#10B981',
                  color: selectedIds.size === 0 ? 'var(--text-dim)' : '#fff',
                  cursor: selectedIds.size === 0 ? 'default' : 'pointer',
                }}
              >
                {recomputing
                  ? <><svg className="animate-spin mr-1" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Recomputing…</>
                  : <>↻ Recompute{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}</>
                }
              </button>
            </div>
          )}
          <div className="grid grid-cols-3 gap-5">
            {filtered.map(p => {
              const slot = compareSelected.A === p.id ? 'A' : compareSelected.B === p.id ? 'B' : null
              return (
                <ProjectCard
                  key={p.id} p={p}
                  onOpen={() => {
                    // If project has runs, jump straight to Dashboard; else land on project root (Runs)
                    const hasRuns = (p.run_count && p.run_count > 0) || !!p.last_run_at
                    navigate(hasRuns ? `/projects/${p.id}/dashboard` : `/projects/${p.id}`)
                  }}
                  compareMode={compareMode}
                  selected={slot}
                  onToggle={handleToggleCompareSelect}
                  onDelete={handleDelete}
                  selectMode={selectMode}
                  isSelected={selectedIds.has(p.id)}
                  onToggleSelect={handleToggleSelect}
                  rcStatus={recomputeStatus[p.id] || null}
                />
              )
            })}
          </div>
          </>
        )}
      </div>

      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
