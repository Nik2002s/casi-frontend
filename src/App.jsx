import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom'
import { apiFetch } from './lib/api'
import { useAuth } from './lib/AuthContext'
import LoginPage from './pages/LoginPage'
import LandingPage from './pages/LandingPage'
import AppHeader from './components/AppHeader'
import AdminPage from './pages/AdminPage'
import ProjectsPage from './pages/ProjectsPage'
import UploadPage from './pages/UploadPage'
import DashboardPage from './pages/DashboardPage'
import ChatPage from './pages/ChatPage'
import RunsPage from './pages/RunsPage'
import SettingsPage from './pages/SettingsPage'
import AccountPage from './pages/AccountPage'
import GateStatusPage from './pages/GateStatusPage'
import SprintTable from './components/SprintTable'
import DiagnosticCard from './components/DiagnosticCard'
import TestSuitePage from './pages/TestSuitePage'
import TestExecutionPage from './pages/TestExecutionPage'
import CompareProjectsPage from './pages/CompareProjectsPage'
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsAcceptanceModal from './pages/TermsAcceptanceModal'

// ── sessionStorage helpers ────────────────────────────────────────────────────
// API keys are kept in sessionStorage (tab-scoped, cleared on tab close) rather
// than localStorage so they do not persist between browser sessions and are not
// accessible to other tabs. This limits the blast radius of any XSS to the
// current tab only.
const LS_API_KEYS = 'casi_api_keys'
const LS_THEME    = 'casi_theme'

function loadStoredKeys() {
  try { return JSON.parse(sessionStorage.getItem(LS_API_KEYS) || '{}') } catch { return {} }
}
export function saveKey(projectId, apiKey) {
  const keys = loadStoredKeys()
  keys[projectId] = apiKey
  sessionStorage.setItem(LS_API_KEYS, JSON.stringify(keys))
}
export function getKey(projectId) {
  return loadStoredKeys()[projectId] || null
}

// ── Root App — auth gate + theme + routes ────────────────────────────────────
export default function App() {
  const { user, loading, needsTerms, acceptTerms } = useAuth()
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(LS_THEME) || 'light' } catch { return 'light' }
  })
  const [accent, setAccent] = useState(() => {
    try { return localStorage.getItem('casi_accent') || '' } catch { return '' }
  })
  const [termsError, setTermsError]     = useState('')
  const [termsLoading, setTermsLoading] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(LS_THEME, theme) } catch {}
  }, [theme])

  const handleAcceptTerms = async () => {
    setTermsLoading(true)
    setTermsError('')
    try {
      await acceptTerms()
    } catch (err) {
      setTermsError(err.message || 'Failed to save acceptance. Please try again.')
    } finally {
      setTermsLoading(false)
    }
  }

  // Show spinner while Firebase resolves auth state
  if (loading) {
    return (
      <div className={`theme-${theme} flex h-screen items-center justify-center`} style={{ background: 'var(--bg)' }}>
        <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      </div>
    )
  }

  // Not signed in → show marketing landing page (sign-in is embedded in landing)
  if (!user) {
    return (
      <Routes>
        <Route path="/terms"   element={<div className={`theme-${theme} ${accent}`}><TermsPage /></div>} />
        <Route path="/privacy" element={<div className={`theme-${theme} ${accent}`}><PrivacyPage /></div>} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    )
  }

  // Signed in but hasn't accepted current T&C + Privacy Policy yet
  if (needsTerms) {
    return (
      <div className={`theme-${theme} ${accent}`} style={{ background: 'var(--bg)' }}>
        <TermsAcceptanceModal
          onAccept={handleAcceptTerms}
          loading={termsLoading}
          error={termsError}
        />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/projects" replace />} />
      <Route path="/compare" element={
        <div className={`theme-${theme} ${accent} flex h-screen w-full flex-col`} style={{ background: 'var(--bg)', color: 'var(--text)' }}>
          <CompareProjectsPage theme={theme} setTheme={setTheme} accent={accent} setAccent={setAccent}/>
        </div>
      }/>
      <Route path="/admin" element={
        <div className={`theme-${theme} ${accent} flex h-screen w-full flex-col`} style={{ background: 'var(--bg)', color: 'var(--text)' }}>
          <AdminPage />
        </div>
      }/>
      <Route path="/account" element={
        <AccountPage theme={theme} setTheme={setTheme} accent={accent} setAccent={setAccent} />
      }/>
      <Route
        path="/projects"
        element={
          <ProjectsPage
            theme={theme} setTheme={setTheme}
            accent={accent} setAccent={setAccent}
            onProjectCreated={(data) => { if (data.api_key) saveKey(data.id, data.api_key) }}
          />
        }
      />
      <Route path="/projects/:projectId/*"
        element={<ProjectShell theme={theme} setTheme={setTheme} accent={accent} setAccent={setAccent} />}
      />
      <Route path="/terms"   element={<div className={`theme-${theme} ${accent}`}><TermsPage /></div>} />
      <Route path="/privacy" element={<div className={`theme-${theme} ${accent}`}><PrivacyPage /></div>} />
      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  )
}

// ── Project shell — loads project context, renders sub-routes ─────────────────
function ProjectShell({ theme, setTheme, accent, setAccent }) {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user: shellUser } = useAuth()

  const [project, setProject]   = useState(null)
  const [runs, setRuns]         = useState([])
  const [uploads, setUploads]   = useState([])
  const [runsLoading, setRunsLoading] = useState(false)
  const [result, setResult]     = useState(null)
  const [currentRunId, setCurrentRunId] = useState(null)
  const [toast, setToast]       = useState(null)  // { msg, type: 'error'|'info' }

  const showToast = (msg, type = 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4500)
  }

  // Derive current view from URL path
  const pathSuffix = location.pathname.replace(`/projects/${projectId}`, '').replace(/^\//, '') || 'runs'

  const apiKey = project?.api_key || getKey(projectId) || null

  const authHeaders = useCallback(() =>
    apiKey ? { 'X-CASI-Key': apiKey } : {},
  [apiKey])

  // ── Fetch project metadata ──────────────────────────────────────────────────
  // NOTE: GET /api/projects/:id requires no auth — fetch first, attach key after.
  useEffect(() => {
    if (!projectId) return
    apiFetch(`/api/projects/${projectId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { navigate('/projects'); return }

        // Attach stored key (if any). Reject non-CASI keys so they can't leak.
        let key = getKey(projectId)
        if (key && !key.startsWith('sk-casi-')) {
          const stored = JSON.parse(sessionStorage.getItem('casi_api_keys') || '{}')
          delete stored[projectId]
          sessionStorage.setItem('casi_api_keys', JSON.stringify(stored))
          key = null
        }
        setProject({ ...data, api_key: key || null })
      })
      .catch(() => navigate('/projects'))
  }, [projectId])

  // ── Fetch runs (no auth needed — read route is open) ───────────────────────
  const fetchRuns = useCallback(async () => {
    if (!projectId) return
    setRunsLoading(true)
    try {
      const res = await apiFetch(`/api/projects/${projectId}/runs`)
      const data = await res.json()
      setRuns(Array.isArray(data) ? data : [])
    } catch { setRuns([]) }
    finally { setRunsLoading(false) }
  }, [projectId])

  // ── Fetch uploads (no auth needed) ─────────────────────────────────────────
  const fetchUploads = useCallback(async () => {
    if (!projectId) return
    try {
      const res = await apiFetch(`/api/projects/${projectId}/uploads`)
      if (!res.ok) { setUploads([]); return }
      const data = await res.json()
      setUploads(Array.isArray(data) ? data : [])
    } catch { setUploads([]) }
  }, [projectId])

  // ── Auto-load latest run (no auth needed) ───────────────────────────────────
  const fetchLatestRun = useCallback(async () => {
    if (!projectId) return
    try {
      const res = await apiFetch(`/api/projects/${projectId}/runs/latest`)
      if (!res.ok) return
      const run = await res.json()
      if (run?.id) {
        const flat = { ...(run.result || {}), run_id: run.id, filename: run.filename, computed_at: run.computed_at, project_id: run.project_id }
        setResult(flat)
        setCurrentRunId(run.id)
      }
    } catch {}
  }, [projectId])

  // ── On mount: load data as soon as we have a projectId ─────────────────────
  useEffect(() => {
    if (!projectId) return
    fetchRuns()
    fetchUploads()
    fetchLatestRun()
  }, [projectId])

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleComputed = (flat, _rawRun) => {
    setResult(flat)
    setCurrentRunId(flat.run_id || null)
    fetchRuns()
    fetchUploads()
    navigate(`/projects/${projectId}/dashboard`)
  }

  const handleLoadRun = async (run) => {
    const load = (r) => {
      const flat = { ...(r.result || {}), run_id: r.id, filename: r.filename, computed_at: r.computed_at, project_id: r.project_id }
      setResult(flat)
      setCurrentRunId(r.id)
      navigate(`/projects/${projectId}/dashboard`)
    }

    if (run.result) { load(run); return }

    try {
      const res = await apiFetch(`/api/projects/${projectId}/runs/${run.id}`)
      if (res.ok) load(await res.json())
    } catch {}
  }

  const handleDeleteUpload = async (uploadId) => {
    try {
      const res = await apiFetch(`/api/projects/${projectId}/uploads/${uploadId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error || 'Delete failed'); return }
      await Promise.all([fetchUploads(), fetchRuns()])
      if (data.new_run) {
        const flat = { ...(data.new_run.result || {}), run_id: data.new_run.id, filename: data.new_run.filename, computed_at: data.new_run.computed_at, project_id: data.new_run.project_id }
        setResult(flat)
        setCurrentRunId(data.new_run.id)
      } else {
        setResult(null)
        setCurrentRunId(null)
      }
    } catch (e) { showToast(`Delete failed: ${e.message}`) }
  }

  // ── Manual recompute — reruns CASI on all currently stored records ─────────
  const handleRecompute = async () => {
    try {
      const res = await apiFetch(`/api/projects/${projectId}/recompute`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { showToast(data.error || 'Recompute failed'); return null }
      await fetchRuns()
      const flat = { ...(data.result || {}), run_id: data.id, filename: data.filename, computed_at: data.computed_at, project_id: data.project_id }
      setResult(flat)
      setCurrentRunId(data.id)
      return data
    } catch (e) { showToast(`Recompute failed: ${e.message}`); return null }
  }

  // Delete a single computation run (no record/upload changes)
  const handleDeleteRun = async (runId) => {
    try {
      const res = await apiFetch(`/api/projects/${projectId}/runs/${runId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        showToast(data.error || 'Delete failed'); return
      }
      await fetchRuns()
      if (currentRunId === runId) {
        setResult(null)
        setCurrentRunId(null)
        fetchLatestRun()
      }
    } catch (e) { showToast(`Delete failed: ${e.message}`) }
  }

  // ── Nav items (only data views need a result) ───────────────────────────────
  const hasResult = !!result
  const projectName = project?.name || null

  // Determine active nav view from URL
  const activeView = pathSuffix || 'runs'

  // Show a loading state until project is resolved
  if (!project) {
    return (
      <div className={`theme-${theme} ${accent} flex h-screen items-center justify-center`} style={{ background: 'var(--bg)' }}>
        <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      </div>
    )
  }

  // ── Shared shell wrapper ────────────────────────────────────────────────────
  return (
    <div className={`theme-${theme} ${accent} flex h-screen w-full flex-col`} style={{ background: 'var(--bg)', color: 'var(--text)', position: 'relative' }}>
      {/* In-app toast notification */}
      {toast && (
        <div
          className="fixed bottom-5 left-1/2 z-[9999] -translate-x-1/2 flex items-center gap-3 rounded-xl border px-4 py-3 text-[13px] font-medium shadow-2xl"
          style={{
            background: toast.type === 'error' ? 'rgba(239,68,68,0.12)' : 'var(--card)',
            borderColor: toast.type === 'error' ? 'rgba(239,68,68,0.4)' : 'var(--accent-ring)',
            color: toast.type === 'error' ? '#ef4444' : 'var(--text-strong)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {toast.type === 'error'
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          }
          {toast.msg}
        </div>
      )}
      <AppHeader
        activeView={activeView}
        projectId={projectId}
        projectName={projectName}
        theme={theme} setTheme={setTheme}
        accent={accent} setAccent={setAccent}
        hasResult={hasResult}
        project={project}
        onRecompute={handleRecompute}
        canRecompute={uploads.length > 0}
      />

      <Routes>
        {/* Project home — runs + uploads */}
        <Route index element={
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <RunsPage
              runs={runs} uploads={uploads} loading={runsLoading}
              currentRunId={currentRunId} project={project}
              onLoadRun={handleLoadRun}
              onNewUpload={() => navigate(`/projects/${projectId}/upload`)}
              onDeleteUpload={handleDeleteUpload}
              onRecompute={handleRecompute}
              onDeleteRun={handleDeleteRun}
            />
          </main>
        }/>

        {/* Upload */}
        <Route path="upload" element={
          <UploadPage
            theme={theme} setTheme={setTheme}
            accent={accent} setAccent={setAccent}
            project={project} onComputed={handleComputed}
            apiKey={apiKey}
          />
        }/>

        {/* Dashboard */}
        <Route path="dashboard" element={
          result
            ? <DashboardPage result={result} theme={theme}
                onNavigate={(view, state) => navigate(`/projects/${projectId}/${view}`, { state })}/>
            : <EmptyState onUpload={() => navigate(`/projects/${projectId}/upload`)}/>
        }/>

        {/* Sprint table */}
        <Route path="sprints" element={
          result
            ? <main className="scrollbar-thin flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-[1440px]">
                  <SprintTable
                    history={result.sprint_history || []}
                    components={result.components || {}}
                    onNavigate={(view, state) => navigate(`/projects/${projectId}/${view}`, { state })}
                  />
                </div>
              </main>
            : <EmptyState onUpload={() => navigate(`/projects/${projectId}/upload`)}/>
        }/>

        {/* Diagnostic */}
        <Route path="diagnostic" element={
          result
            ? <main className="scrollbar-thin flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-[1440px]">
                  <DiagnosticCard result={result} onNavigate={(view, opts) => navigate(`/projects/${projectId}/${view}`, opts)}/>
                </div>
              </main>
            : <EmptyState onUpload={() => navigate(`/projects/${projectId}/upload`)}/>
        }/>

        {/* Suite & Test — execution runs explorer */}
        <Route path="tests" element={
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <TestExecutionPage project={project}/>
          </main>
        }/>

        {/* Chat */}
        <Route path="chat" element={
          result
            ? <ChatPage result={result} project={project}
                onNavigate={(view) => navigate(`/projects/${projectId}/${view}`)}/>
            : <EmptyState onUpload={() => navigate(`/projects/${projectId}/upload`)}/>
        }/>

        {/* Gate */}
        <Route path="gate" element={
          result
            ? <GateStatusPage result={result} project={project}
                onBack={() => navigate(`/projects/${projectId}/dashboard`)}/>
            : <EmptyState onUpload={() => navigate(`/projects/${projectId}/upload`)}/>
        }/>

        {/* Settings */}
        <Route path="settings" element={
          <SettingsPage
            project={project} result={result}
            onBack={() => navigate(result ? `/projects/${projectId}/dashboard` : `/projects/${projectId}`)}
          />
        }/>

        {/* Fallback */}
        <Route path="*" element={<Navigate to={`/projects/${projectId}`} replace />} />
      </Routes>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onUpload }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'var(--card2)' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>
      <p className="mt-4 text-[15px] font-semibold" style={{ color: 'var(--text-strong)' }}>No data yet</p>
      <button onClick={onUpload} className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold" style={{ color: 'var(--accent-fg)' }}>
        Upload test suite →
      </button>
    </div>
  )
}
