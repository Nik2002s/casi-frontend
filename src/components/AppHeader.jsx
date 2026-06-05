import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { ThemeToggleBtn } from './primitives'
import { useAuth } from '../lib/AuthContext'

const ACCENT_COLORS = [
  { cls: '',               hex: '#3B82F6' },
  { cls: 'accent-teal',   hex: '#14B8A6' },
  { cls: 'accent-violet', hex: '#8B5CF6' },
  { cls: 'accent-rose',   hex: '#F43F5E' },
  { cls: 'accent-amber',  hex: '#F59E0B' },
]

// Tabs visible when a project is open
// 'path' is the URL segment under /projects/:id/
const NAV_ITEMS = [
  { label: 'Dashboard',     path: 'dashboard' },
  { label: 'Sprint Table',  path: 'sprints' },
  { label: 'Diagnostic',    path: 'diagnostic' },
  { label: 'Gate',          path: 'gate' },
  { label: 'Suite & Test',  path: 'tests' },
  { label: 'Chat',          path: 'chat' },
  { label: 'Runs',          path: '' },
  { label: 'Upload',        path: 'upload' },
]

export default function AppHeader({
  activeView,          // current URL suffix e.g. 'dashboard', 'upload', '' for runs
  projectId,           // UUID — present when inside a project
  projectName,
  theme, setTheme,
  accent, setAccent,
  hasResult,
  project,             // full project object — nav shows when this is set
  onRecompute,         // async fn — triggers a CASI recompute for this project
  canRecompute,        // bool — true when uploads exist
}) {
  const navigate = useNavigate()
  const { user, signOut, isAdmin } = useAuth()
  const showNav = !!(project || hasResult)

  const [recomputing, setRecomputing] = useState(false)
  const handleRecompute = async () => {
    if (!onRecompute || recomputing) return
    setRecomputing(true)
    await onRecompute()
    setRecomputing(false)
  }

  // Click-toggle account menu (replaces hover-only dropdown so it works on touch / trackpad)
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

  const goTo = (path) => {
    if (!projectId) { navigate('/projects'); return }
    navigate(path === '' ? `/projects/${projectId}` : `/projects/${projectId}/${path}`)
  }

  return (
    <header
      className="flex h-14 shrink-0 items-center justify-between border-b px-6"
      style={{ borderColor: 'var(--line)', background: 'var(--bg2)' }}
    >
      {/* ── Left: logo + nav ── */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          {/* Logo — always goes to projects list */}
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center gap-2 hover:opacity-80 transition"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent font-mono text-[11px] font-bold" style={{ color: 'var(--accent-fg)' }}>C</div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-strong)' }}>CASI</span>
              {projectName && (
                <span className="hidden text-[11px] sm:inline" style={{ color: 'var(--text-dim)' }}>/ {projectName}</span>
              )}
            </div>
          </button>
        </div>

        {/* Nav tabs — only when a project is active */}
        {showNav && (
          <nav className="flex items-center gap-0.5">
            {NAV_ITEMS.map(({ label, path }) => {
              // Dashboard and below only make sense once there's a result
              const needsResult = ['dashboard', 'sprints', 'diagnostic', 'gate', 'chat'].includes(path)
              // "tests" tab is always visible once a project is open (it works with just uploads)
              if (needsResult && !hasResult) return null
              const isActive = activeView === path || (path === '' && (activeView === '' || activeView === 'runs'))
              return (
                <button
                  key={path}
                  onClick={() => goTo(path)}
                  className="relative rounded-md px-3 py-1.5 text-xs font-medium transition hover:bg-[var(--card)]"
                  style={{ color: isActive ? 'var(--text-strong)' : 'var(--text-muted)' }}
                >
                  {label}
                  {isActive && (
                    <span className="absolute inset-x-2 -bottom-[15px] h-0.5 rounded-full bg-accent"/>
                  )}
                </button>
              )
            })}
          </nav>
        )}
      </div>

      {/* ── Right: accent swatches + theme toggle + settings + avatar ── */}
      <div className="flex items-center gap-3">

        {/* Recompute — only inside a project with at least one upload */}
        {onRecompute && canRecompute && (
          <button
            onClick={handleRecompute}
            disabled={recomputing}
            className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition hover:bg-[var(--card2)] disabled:opacity-50"
            style={{ borderColor: 'var(--line2)', color: 'var(--text-strong)' }}
            title="Re-run CASI on all stored test records for this project"
          >
            {recomputing ? (
              <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/>
                <polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            )}
            Recompute
          </button>
        )}

        <div className="hidden items-center gap-1.5 md:flex">
          {ACCENT_COLORS.map(({ cls, hex }) => (
            <button
              key={hex}
              onClick={() => setAccent(cls)}
              title={hex}
              className="h-4 w-4 rounded-full transition hover:scale-110"
              style={{
                background: hex,
                outline: accent === cls ? `2px solid ${hex}` : 'none',
                outlineOffset: 2,
              }}
            />
          ))}
        </div>
        <div className="h-6 w-px" style={{ background: 'var(--line)' }}/>
        <ThemeToggleBtn theme={theme} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}/>
        {/* Settings gear */}
        {showNav && (
          <button
            onClick={() => goTo('settings')}
            className="flex h-7 w-7 items-center justify-center rounded-md border transition hover:bg-[var(--card2)]"
            style={{ borderColor: 'var(--line)', color: activeView === 'settings' ? 'var(--accent)' : 'var(--text-muted)' }}
            title="Settings"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        )}
        {/* Admin link */}
        {isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className="flex h-7 w-7 items-center justify-center rounded-md border transition hover:bg-[var(--card2)]"
            style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
            title="Admin panel"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </button>
        )}
        {/* Avatar + sign out (click-toggle menu) */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title={user?.email || 'Account'}
            className="flex items-center gap-1 rounded-full p-0.5 ring-1 transition hover:ring-2"
            style={{ '--tw-ring-color': 'var(--line2)' }}
          >
            <span className="h-7 w-7 overflow-hidden rounded-full bg-gradient-to-br from-blue-400 to-violet-500">
              {user?.photoURL && <img src={user.photoURL} alt="" className="h-full w-full object-cover"/>}
            </span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-10 z-50 min-w-[180px] rounded-xl border shadow-lg py-1"
              style={{ background: 'var(--card)', borderColor: 'var(--line)' }}
            >
              <div className="px-3 py-2 text-[11px] truncate" style={{ color: 'var(--text-dim)' }}>{user?.email}</div>
              <div className="h-px mx-2" style={{ background: 'var(--line)' }}/>
              <button
                onClick={() => { setMenuOpen(false); signOut() }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-[var(--card2)] transition"
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
  )
}
