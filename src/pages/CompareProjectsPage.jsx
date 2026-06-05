import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { Panel, gateColor, FALLBACK_COMPONENT_LABELS } from '../components/primitives'

const COLOR_A = '#3B82F6'   // blue  — Project A
const COLOR_B = '#8B5CF6'   // violet — Project B

// Read label from component data — fall back to built-in map for old runs
const compLabel = (comps, key) => comps?.[key]?.label ?? FALLBACK_COMPONENT_LABELS[key] ?? key

// Union of all component keys from both sides, preserving insertion order
const mergeKeys = (compsA, compsB) => {
  const all = new Set([...Object.keys(compsA || {}), ...Object.keys(compsB || {})])
  return all.size > 0 ? [...all] : ['A','B','C','D','E','F']
}

// ── helpers ───────────────────────────────────────────────────────────────────
const parseScores = (p) => {
  if (!p?.last_scores) return {}
  try { return typeof p.last_scores === 'string' ? JSON.parse(p.last_scores) : p.last_scores } catch { return {} }
}

const normComp = (comps, key) => {
  const c = comps?.[key]
  if (!c) return 50
  return Math.max(0, Math.min(100, c.normalized ?? c.norm ?? 50))
}

// ── Dual Radar ────────────────────────────────────────────────────────────────
function CompareRadar({ compsA, compsB, theme }) {
  const cx = 140, cy = 140, rMax = 90
  const keys = mergeKeys(compsA, compsB)
  const n = keys.length
  const polar = (i, r) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  }
  const ringPath = (r) =>
    keys.map((_, i) => polar(i, rMax * r)).map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
  const shapePath = (comps) =>
    keys.map((k, i) => polar(i, rMax * Math.max(0.04, normComp(comps, k) / 100))).map((p, i) => `${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ') + ' Z'

  const grid      = theme === 'dark' ? '#1c2742' : '#e5e7eb'
  const labelCol  = theme === 'dark' ? '#cbd5e1' : '#1e293b'
  const bg        = theme === 'dark' ? '#0f1629'  : '#ffffff'

  return (
    <svg viewBox="0 0 280 280" className="w-full">
      {[0.25, 0.5, 0.75, 1].map(r => <path key={r} d={ringPath(r)} fill="none" stroke={grid} strokeWidth="1"/>)}
      {keys.map((_, i) => { const p = polar(i, rMax); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={grid} strokeWidth="1"/> })}
      {/* B (behind, dashed) */}
      <path d={shapePath(compsB)} fill={COLOR_B} fillOpacity="0.12" stroke={COLOR_B} strokeWidth="1.5" strokeDasharray="4 3"/>
      {/* A (front, solid) */}
      <path d={shapePath(compsA)} fill={COLOR_A} fillOpacity="0.18" stroke={COLOR_A} strokeWidth="2"/>
      {/* Dots + labels */}
      {keys.map((k, i) => {
        const pA = polar(i, rMax * Math.max(0.04, normComp(compsA, k) / 100))
        const pB = polar(i, rMax * Math.max(0.04, normComp(compsB, k) / 100))
        const lp = polar(i, rMax + 20)
        const label = compLabel(compsA, k) || compLabel(compsB, k) || k
        const words = label.split(' ')
        return (
          <g key={k}>
            <circle cx={pB.x} cy={pB.y} r="3"   fill={COLOR_B} stroke={bg} strokeWidth="1.5"/>
            <circle cx={pA.x} cy={pA.y} r="3.5" fill={COLOR_A} stroke={bg} strokeWidth="1.5"/>
            {words.length > 1 ? (
              <>
                <text x={lp.x} y={lp.y - 4}  textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="600" fill={labelCol}>{words[0]}</text>
                <text x={lp.x} y={lp.y + 6}  textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="600" fill={labelCol}>{words.slice(1).join(' ')}</text>
              </>
            ) : (
              <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="600" fill={labelCol}>{label}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Dual Trend ────────────────────────────────────────────────────────────────
function CompareTrend({ historyA = [], historyB = [], theme }) {
  const W = 540, H = 220, P = { t: 16, r: 16, b: 34, l: 40 }
  const plotW = W - P.l - P.r, plotH = H - P.t - P.b

  const dataA = historyA.map(h => ({ d: (h.sprint_start || '').slice(0, 7), v: Math.round(h.casi_score || 0) }))
  const dataB = historyB.map(h => ({ d: (h.sprint_start || '').slice(0, 7), v: Math.round(h.casi_score || 0) }))

  const allDates = [...new Set([...dataA, ...dataB].map(p => p.d))].sort()
  const total = Math.max(allDates.length, 2)

  const xC = (date) => P.l + (allDates.indexOf(date) / (total - 1)) * plotW
  const yC = (v)    => P.t + plotH - (v / 999) * plotH

  const linePath = (data) =>
    data.length < 1 ? '' : data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xC(d.d)} ${yC(d.v)}`).join(' ')

  const grid = theme === 'dark' ? '#1c2742' : '#e5e7eb'
  const tDim = '#64748b'
  const dot  = theme === 'dark' ? '#0a0f1e' : '#ffffff'

  if (!allDates.length) return (
    <div className="flex h-40 items-center justify-center text-[13px]" style={{ color: 'var(--text-dim)' }}>No sprint history</div>
  )

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0, 200, 400, 600, 800, 999].map(v => (
        <g key={v}>
          <line x1={P.l} y1={yC(v)} x2={W-P.r} y2={yC(v)} stroke={grid} strokeDasharray="2 4"/>
          <text x={P.l-6} y={yC(v)} textAnchor="end" dominantBaseline="middle" fontFamily="JetBrains Mono" fontSize="9" fill={tDim}>{v}</text>
        </g>
      ))}
      <line x1={P.l} y1={yC(700)} x2={W-P.r} y2={yC(700)} stroke="#10b981" strokeOpacity="0.3" strokeDasharray="4 4"/>
      <line x1={P.l} y1={yC(400)} x2={W-P.r} y2={yC(400)} stroke="#f59e0b" strokeOpacity="0.3" strokeDasharray="4 4"/>
      {dataB.length > 1 && <path d={linePath(dataB)} fill="none" stroke={COLOR_B} strokeWidth="2" strokeDasharray="5 3"/>}
      {dataA.length > 1 && <path d={linePath(dataA)} fill="none" stroke={COLOR_A} strokeWidth="2.25"/>}
      {dataA.map((d, i) => <circle key={i} cx={xC(d.d)} cy={yC(d.v)} r="3.5" fill={COLOR_A} stroke={dot} strokeWidth="2"/>)}
      {dataB.map((d, i) => <circle key={i} cx={xC(d.d)} cy={yC(d.v)} r="3"   fill={COLOR_B} stroke={dot} strokeWidth="1.5"/>)}
      {allDates.map((d, i) => (
        <text key={i} x={xC(d)} y={H-P.b+13} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fill={tDim}>{d.slice(5)}</text>
      ))}
    </svg>
  )
}

// ── Head-to-head metric row ───────────────────────────────────────────────────
function MetricRow({ label, valA, valB, maxVal = 999, lowerIsBetter = false, isGate = false }) {
  const gateRank = (g) => g === 'Green' ? 3 : g === 'Yellow' ? 2 : g === 'Red' ? 1 : 0

  let numA, numB, max
  if (isGate) {
    numA = gateRank(valA); numB = gateRank(valB); max = 3
  } else {
    numA = typeof valA === 'number' ? valA : 0
    numB = typeof valB === 'number' ? valB : 0
    max  = maxVal || Math.max(numA, numB, 1)
  }

  const pA = Math.min(100, max > 0 ? (numA / max) * 100 : 0)
  const pB = Math.min(100, max > 0 ? (numB / max) * 100 : 0)
  const aWins = lowerIsBetter ? numA <= numB : numA >= numB
  const tied  = numA === numB

  const colA = tied ? 'var(--text-muted)' : aWins ? COLOR_A : 'var(--text-dim)'
  const colB = tied ? 'var(--text-muted)' : !aWins ? COLOR_B : 'var(--text-dim)'

  const displayA = isGate ? valA : valA
  const displayB = isGate ? valB : valB

  return (
    <div className="grid items-center gap-3 border-b py-3 last:border-0" style={{ gridTemplateColumns: '80px 1fr 140px 1fr 80px', borderColor: 'var(--line)' }}>
      {/* Score A */}
      <div className="flex items-center justify-end gap-1.5">
        {!tied && aWins && <span style={{ color: COLOR_A, fontSize: 10 }}>✓</span>}
        <span className="font-mono text-[15px] font-semibold" style={{ color: colA }}>{displayA}</span>
      </div>
      {/* Bar A — right-aligned, grows leftward */}
      <div className="flex justify-end">
        <div className="h-2 rounded-l-full" style={{ width: `${pA}%`, background: aWins ? COLOR_A : `${COLOR_A}44` }}/>
      </div>
      {/* Metric label */}
      <div className="text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
        {label}
      </div>
      {/* Bar B — left-aligned, grows rightward */}
      <div>
        <div className="h-2 rounded-r-full" style={{ width: `${pB}%`, background: !aWins && !tied ? COLOR_B : `${COLOR_B}44` }}/>
      </div>
      {/* Score B */}
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[15px] font-semibold" style={{ color: colB }}>{displayB}</span>
        {!tied && !aWins && <span style={{ color: COLOR_B, fontSize: 10 }}>✓</span>}
      </div>
    </div>
  )
}

// ── Component breakdown row ───────────────────────────────────────────────────
function ComponentRow({ id, idx, compsA, compsB }) {
  const nA = normComp(compsA, id)
  const nB = normComp(compsB, id)
  const aWins = nA >= nB
  const tied  = Math.round(nA) === Math.round(nB)
  const diff  = Math.abs(Math.round(nA - nB))
  const MAX_W = 130

  return (
    <div className="flex items-center gap-3 border-b py-3 last:border-0" style={{ borderColor: 'var(--line)' }}>
      {/* ID badge */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-bold"
        style={{ background: 'var(--card2)', color: 'var(--text-muted)' }}>{idx}</div>
      {/* Label */}
      <div className="w-32 shrink-0 text-[12px]" style={{ color: 'var(--text)' }}>{compLabel(compsA, id) || compLabel(compsB, id)}</div>
      {/* A bar (right-aligned) */}
      <div className="flex flex-1 items-center justify-end gap-2">
        <span className="w-8 text-right font-mono text-[12px] font-semibold" style={{ color: aWins || tied ? COLOR_A : 'var(--text-dim)' }}>
          {Math.round(nA)}
        </span>
        <div style={{ width: Math.round((nA / 100) * MAX_W), height: 6, background: aWins || tied ? COLOR_A : `${COLOR_A}44`, borderRadius: '4px 0 0 4px' }}/>
      </div>
      {/* Separator */}
      <div className="h-4 w-px shrink-0" style={{ background: 'var(--line2)' }}/>
      {/* B bar */}
      <div className="flex flex-1 items-center gap-2">
        <div style={{ width: Math.round((nB / 100) * MAX_W), height: 6, background: !aWins || tied ? COLOR_B : `${COLOR_B}44`, borderRadius: '0 4px 4px 0' }}/>
        <span className="w-8 font-mono text-[12px] font-semibold" style={{ color: !aWins || tied ? COLOR_B : 'var(--text-dim)' }}>
          {Math.round(nB)}
        </span>
      </div>
      {/* Winner badge */}
      <div className="w-16 shrink-0 text-right">
        {tied ? (
          <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>Tied</span>
        ) : (
          <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
            style={{ background: aWins ? `${COLOR_A}22` : `${COLOR_B}22`, color: aWins ? COLOR_A : COLOR_B }}>
            {aWins ? 'A' : 'B'} +{diff}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Module comparison table ───────────────────────────────────────────────────
function ModuleTable({ resultA, resultB, labelA, labelB }) {
  const histA = resultA?.sprint_history || []
  const histB = resultB?.sprint_history || []
  const modsA = histA.length ? (histA[histA.length - 1]?.modules || {}) : {}
  const modsB = histB.length ? (histB[histB.length - 1]?.modules || {}) : {}
  const shared = Object.keys(modsA).filter(m => modsB[m])

  if (!shared.length) return (
    <div className="px-6 py-10 text-center text-[13px]" style={{ color: 'var(--text-dim)' }}>
      No matching modules between these two projects
    </div>
  )

  const rows = shared.map(m => ({
    name: m,
    cA: modsA[m].casi || 0,
    cB: modsB[m].casi || 0,
    delta: (modsA[m].casi || 0) - (modsB[m].casi || 0),
  })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  const scoreColor = (v) => v >= 700 ? '#10b981' : v >= 400 ? '#f59e0b' : '#ef4444'

  return (
    <>
      <div className="grid gap-2 border-b px-6 py-2.5 text-[10px] font-semibold uppercase tracking-wider"
        style={{ gridTemplateColumns: '1fr 90px 90px 90px 56px', borderColor: 'var(--line)', color: 'var(--text-dim)' }}>
        <span>Module</span>
        <span className="text-center" style={{ color: COLOR_A }}>{labelA}</span>
        <span className="text-center" style={{ color: COLOR_B }}>{labelB}</span>
        <span className="text-center">Winner</span>
        <span className="text-right">Δ</span>
      </div>
      {rows.map(r => {
        const aWins = r.delta >= 0
        const tied  = r.delta === 0
        return (
          <div key={r.name} className="grid items-center gap-2 border-b px-6 py-3 transition last:border-0 hover:bg-[var(--card2)]"
            style={{ gridTemplateColumns: '1fr 90px 90px 90px 56px', borderColor: 'var(--line)' }}>
            <span className="text-[13px] font-medium" style={{ color: 'var(--text-strong)' }}>{r.name}</span>
            <span className="text-center font-mono text-[13px] font-semibold" style={{ color: scoreColor(r.cA) }}>{r.cA}</span>
            <span className="text-center font-mono text-[13px] font-semibold" style={{ color: scoreColor(r.cB) }}>{r.cB}</span>
            <div className="flex justify-center">
              {tied ? (
                <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>Tied</span>
              ) : (
                <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ background: aWins ? `${COLOR_A}22` : `${COLOR_B}22`, color: aWins ? COLOR_A : COLOR_B }}>
                  {aWins ? labelA : labelB}
                </span>
              )}
            </div>
            <span className="text-right font-mono text-[12px] font-semibold" style={{ color: tied ? 'var(--text-dim)' : aWins ? COLOR_A : COLOR_B }}>
              {r.delta > 0 ? '+' : ''}{r.delta}
            </span>
          </div>
        )
      })}
    </>
  )
}

// ── Project dropdown ──────────────────────────────────────────────────────────
function ProjectSelect({ projects, selected, exclude, onChange, accentColor }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-3 w-3 rounded-full shrink-0" style={{ background: accentColor }}/>
      <select
        value={selected || ''}
        onChange={e => onChange(e.target.value)}
        className="rounded-lg border px-3 py-2 text-[13px] font-semibold outline-none cursor-pointer"
        style={{ borderColor: selected ? accentColor + '88' : 'var(--line2)', color: 'var(--text-strong)', background: 'var(--card)', minWidth: 200 }}
      >
        <option value="">Select a project…</option>
        {projects.map(p => {
          const sc = parseScores(p)
          return (
            <option key={p.id} value={p.id} disabled={p.id === exclude}>
              {p.name}{sc.casi_gate ? ` · ${sc.casi_gate}` : ''}
            </option>
          )
        })}
      </select>
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function Skeleton({ h = 120 }) {
  return <div className="animate-pulse rounded-2xl" style={{ height: h, background: 'var(--card2)' }}/>
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CompareProjectsPage({ theme }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const idA = searchParams.get('a') || ''
  const idB = searchParams.get('b') || ''

  const [allProjects, setAllProjects] = useState([])
  const [sideA, setSideA]     = useState(null)   // { project, result }
  const [sideB, setSideB]     = useState(null)
  const [loadingA, setLoadingA] = useState(false)
  const [loadingB, setLoadingB] = useState(false)

  // Load project list for dropdowns
  useEffect(() => {
    apiFetch('/api/projects').then(r => r.json()).then(d => setAllProjects(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  // Fetch one side's data
  const fetchSide = async (id, setSide, setLoading) => {
    if (!id) { setSide(null); return }
    setLoading(true)
    try {
      const [pRes, rRes] = await Promise.all([
        apiFetch(`/api/projects/${id}`),
        apiFetch(`/api/projects/${id}/runs/latest`),
      ])
      const project = pRes.ok ? await pRes.json() : null
      const run     = rRes.ok ? await rRes.json() : null
      const result  = run?.result ? { ...run.result, run_id: run.id, filename: run.filename } : null
      setSide(project ? { project, result } : null)
    } catch { setSide(null) }
    setLoading(false)
  }

  useEffect(() => { fetchSide(idA, setSideA, setLoadingA) }, [idA]) // eslint-disable-line
  useEffect(() => { fetchSide(idB, setSideB, setLoadingB) }, [idB]) // eslint-disable-line

  const setA = (id) => setSearchParams(id ? { a: id, ...(idB ? { b: idB } : {}) } : { ...(idB ? { b: idB } : {}) })
  const setB = (id) => setSearchParams(id ? { b: id, ...(idA ? { a: idA } : {}) } : { ...(idA ? { a: idA } : {}) })
  const swap = () => { if (idA && idB) setSearchParams({ a: idB, b: idA }) }

  const scoresA  = sideA?.result?.scores || {}
  const scoresB  = sideB?.result?.scores || {}
  const casiA    = Math.round(scoresA.casi_score || 0)
  const casiB    = Math.round(scoresB.casi_score || 0)
  const asiA     = Math.round(scoresA.asi_score  || 0)
  const asiB     = Math.round(scoresB.asi_score  || 0)
  const gateA    = scoresA.casi_gate || '—'
  const gateB    = scoresB.casi_gate || '—'
  const labelA   = sideA?.project?.name || 'Project A'
  const labelB   = sideB?.project?.name || 'Project B'
  const diff     = casiA - casiB
  const bothReady = sideA?.result && sideB?.result && !loadingA && !loadingB

  // Winner banner config
  const absDiff = Math.abs(diff)
  const winnerLabel = absDiff < 20 ? 'Neck and neck' : diff > 0 ? `${labelA} leads` : `${labelB} leads`
  const winnerSub   = absDiff < 20 ? 'Scores are within 20 points' : `by ${absDiff} CASI points · ${gateA} vs ${gateB}`
  const bannerColor = diff > 50 ? COLOR_A : diff < -50 ? COLOR_B : '#64748b'

  return (
    <div className={`theme-${theme} flex h-screen w-full flex-col`} style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ── Header ── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-6"
        style={{ borderColor: 'var(--line)', background: 'var(--bg2)' }}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/projects')}
            className="flex items-center gap-2 text-[12px] transition hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Projects
          </button>
          <div className="h-5 w-px" style={{ background: 'var(--line)' }}/>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>Compare Projects</span>
        </div>
        <button onClick={() => window.print()}
          className="rounded-md border px-3 py-1.5 text-[11px] transition hover:bg-[var(--card2)]"
          style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}>
          Export PDF
        </button>
      </header>

      {/* ── Project selector bar ── */}
      <div className="flex shrink-0 items-center justify-center gap-3 border-b px-6 py-3"
        style={{ borderColor: 'var(--line)', background: 'var(--bg2)' }}>
        <ProjectSelect projects={allProjects} selected={idA} exclude={idB} onChange={setA} accentColor={COLOR_A}/>
        <button onClick={swap} disabled={!idA || !idB}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition hover:bg-[var(--card2)] disabled:opacity-30"
          style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
          title="Swap projects">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M7 16V4m0 0L3 8m4-4 4 4"/><path d="M17 8v12m0 0 4-4m-4 4-4-4"/>
          </svg>
        </button>
        <ProjectSelect projects={allProjects} selected={idB} exclude={idA} onChange={setB} accentColor={COLOR_B}/>
      </div>

      {/* ── Content ── */}
      <main className="scrollbar-thin flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-5 p-6">

          {/* Empty state */}
          {!idA && !idB && (
            <div className="flex flex-col items-center justify-center py-28 text-center">
              <div className="relative mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: `${COLOR_A}22` }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={COLOR_A} strokeWidth="1.5" strokeLinecap="round">
                    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                </div>
                <div className="absolute -right-2 -bottom-2 flex h-7 w-7 items-center justify-center rounded-xl" style={{ background: `${COLOR_B}22` }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLOR_B} strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                </div>
              </div>
              <p className="text-[16px] font-semibold" style={{ color: 'var(--text-strong)' }}>Select two projects to compare</p>
              <p className="mt-1 text-[13px]" style={{ color: 'var(--text-dim)' }}>Use the dropdowns above to pick any two projects side by side</p>
            </div>
          )}

          {/* Loading */}
          {(idA || idB) && (loadingA || loadingB) && (
            <div className="space-y-4">
              <Skeleton h={120}/>
              <Skeleton h={260}/>
              <div className="grid grid-cols-2 gap-4"><Skeleton h={300}/><Skeleton h={300}/></div>
            </div>
          )}

          {/* One project missing */}
          {idA && idB && !loadingA && !loadingB && sideA && !sideB?.result && (
            <div className="rounded-2xl border border-dashed px-6 py-10 text-center" style={{ borderColor: 'var(--line2)' }}>
              <p className="text-[14px] font-semibold" style={{ color: 'var(--text-strong)' }}>
                {!sideB ? 'Project not found' : `${labelB} has no runs yet`}
              </p>
              <p className="mt-1 text-[13px]" style={{ color: 'var(--text-dim)' }}>Upload a test suite to {labelB} to include it in the comparison</p>
            </div>
          )}

          {/* ── Full comparison ── */}
          {bothReady && (
            <>
              {/* Winner banner */}
              <div className="relative overflow-hidden rounded-2xl p-6"
                style={{ background: `linear-gradient(135deg, ${bannerColor}20, ${bannerColor}08)`, border: `1px solid ${bannerColor}40` }}>
                <div className="flex items-center justify-between gap-6">
                  {/* Left: verdict */}
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `${bannerColor}22` }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={bannerColor} strokeWidth="2" strokeLinecap="round">
                        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-strong)' }}>{winnerLabel}</div>
                      <div className="mt-0.5 text-[12px]" style={{ color: 'var(--text-dim)' }}>{winnerSub}</div>
                      <div className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        CASI scores are context-adapted — each project's weights reflect its own failure patterns,
                        so this comparison is apples-to-apples.
                        {Math.abs(casiA - casiB) < 20 && ' The gap is small — component health differences matter more than the overall score here.'}
                      </div>
                    </div>
                  </div>
                  {/* Right: both scores */}
                  <div className="flex items-center gap-8 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: COLOR_A }}>{labelA}</div>
                      <div className="font-mono text-4xl font-bold leading-none" style={{ color: gateColor(gateA) }}>{casiA}</div>
                      <div className="mt-1 text-[11px]" style={{ color: 'var(--text-dim)' }}>{gateA} gate</div>
                    </div>
                    <div className="text-2xl font-light" style={{ color: 'var(--line2)' }}>vs</div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: COLOR_B }}>{labelB}</div>
                      <div className="font-mono text-4xl font-bold leading-none" style={{ color: gateColor(gateB) }}>{casiB}</div>
                      <div className="mt-1 text-[11px]" style={{ color: 'var(--text-dim)' }}>{gateB} gate</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Head-to-head */}
              <Panel title="Head-to-Head" subtitle="Key metrics side by side — bars grow outward from centre, longer = stronger. ✓ marks the winner." padded={false}>
                {/* Column headers */}
                <div className="grid gap-3 border-b px-6 py-2 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ gridTemplateColumns: '80px 1fr 140px 1fr 80px', borderColor: 'var(--line)' }}>
                  <div className="text-right" style={{ color: COLOR_A }}>{labelA}</div>
                  <div/>
                  <div className="text-center" style={{ color: 'var(--text-dim)' }}>Metric</div>
                  <div/>
                  <div style={{ color: COLOR_B }}>{labelB}</div>
                </div>
                <div className="px-6">
                  <MetricRow label="CASI Score"    valA={casiA} valB={casiB} maxVal={999}/>
                  <MetricRow label="ASI Score"     valA={asiA}  valB={asiB}  maxVal={999}/>
                  <MetricRow label="Gate"          valA={gateA} valB={gateB} isGate/>
                  <MetricRow label="Open Failures" valA={sideA.result?.open_failures?.length || 0}
                                                   valB={sideB.result?.open_failures?.length || 0}
                                                   maxVal={Math.max(sideA.result?.open_failures?.length || 0, sideB.result?.open_failures?.length || 0, 1)}
                                                   lowerIsBetter/>
                  <MetricRow label="Test Cases"    valA={sideA.result?.dataset?.tc_count || 0}
                                                   valB={sideB.result?.dataset?.tc_count || 0}
                                                   maxVal={Math.max(sideA.result?.dataset?.tc_count || 0, sideB.result?.dataset?.tc_count || 0, 1)}/>
                  <MetricRow label="Sprints"       valA={sideA.result?.dataset?.sprint_count || 0}
                                                   valB={sideB.result?.dataset?.sprint_count || 0}
                                                   maxVal={Math.max(sideA.result?.dataset?.sprint_count || 0, sideB.result?.dataset?.sprint_count || 0, 1)}/>
                </div>
              </Panel>

              {/* Charts */}
              <div className="grid grid-cols-2 gap-4">
                <Panel title="Component Radar" subtitle={`Each axis is a quality dimension. ${labelA} solid · ${labelB} dashed. Where A's polygon is larger, it's stronger in that dimension — and CASI gives it more weight there.`}>
                  <CompareRadar compsA={sideA.result?.components || {}} compsB={sideB.result?.components || {}} theme={theme}/>
                </Panel>
                <Panel title="CASI Score Trend" subtitle={`Historical CASI scores per sprint. Crossing the green line (700) means Green gate. Both projects are on the same scale so the slopes are directly comparable.`}>
                  <div className="mb-3 flex items-center gap-5 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-0.5 w-5 rounded" style={{ background: COLOR_A }}/>
                      <span style={{ color: 'var(--text-muted)' }}>{labelA}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg width="20" height="2"><line x1="0" y1="1" x2="20" y2="1" stroke={COLOR_B} strokeWidth="1.5" strokeDasharray="5 3"/></svg>
                      <span style={{ color: 'var(--text-muted)' }}>{labelB}</span>
                    </span>
                  </div>
                  <CompareTrend historyA={sideA.result?.sprint_history || []} historyB={sideB.result?.sprint_history || []} theme={theme}/>
                </Panel>
              </div>

              {/* Component breakdown */}
              <Panel title="Component Breakdown" subtitle="Health score per quality dimension (0=worst · 100=perfect). The winner badge shows which project is healthier in each dimension — look for patterns: if one project consistently wins on multiple components, that's where the real gap is." padded={false}>
                <div className="border-b px-6 py-2" style={{ borderColor: 'var(--line)' }}>
                  <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                    <div className="w-7"/>
                    <div className="w-28">Component</div>
                    <div className="flex-1 text-right pr-2" style={{ color: COLOR_A }}>{labelA} →</div>
                    <div className="w-px h-3" style={{ background: 'var(--line2)' }}/>
                    <div className="flex-1 pl-2" style={{ color: COLOR_B }}>← {labelB}</div>
                    <div className="w-16 text-right">Winner</div>
                  </div>
                </div>
                <div className="px-6">
                  {mergeKeys(sideA.result?.components, sideB.result?.components).map((id, i) => (
                    <ComponentRow key={id} id={id} idx={i + 1} compsA={sideA.result?.components || {}} compsB={sideB.result?.components || {}}/>
                  ))}
                </div>
              </Panel>

              {/* Module table */}
              <Panel title="Module Comparison" subtitle="CASI score per shared module — sorted by largest gap first. A module with a big gap is where the two projects diverge most: one team has resolved failures the other hasn't." padded={false}>
                <ModuleTable resultA={sideA.result} resultB={sideB.result} labelA={labelA} labelB={labelB}/>
              </Panel>
            </>
          )}

        </div>
      </main>
    </div>
  )
}
