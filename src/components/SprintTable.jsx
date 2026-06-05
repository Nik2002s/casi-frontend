import { useState, useEffect, useRef, useCallback } from 'react'
import { Sparkline } from './primitives'
import ModuleDrawer from './ModuleDrawer'

// ── helpers ───────────────────────────────────────────────────────────────────
const cellColor = (v) =>
  v >= 700 ? { bg: 'rgba(16,185,129,0.14)', fg: '#10b981', bar: '#10b981' }
  : v >= 400 ? { bg: 'rgba(245,158,11,0.14)', fg: '#f59e0b', bar: '#f59e0b' }
  : { bg: 'rgba(239,68,68,0.14)', fg: '#ef4444', bar: '#ef4444' }

// Delphi baseline weights (normalised, sum = 1.0) — A B C D E F
const DELPHI_W    = [0.22, 0.18, 0.17, 0.16, 0.14, 0.13]
const COMP_LABELS = ['A','B','C','D','E','F']
const COMP_NAMES  = ['Broken Index','Avg Fix Time','Downtime','Fail Ratio','Suite Fail','Variances']

// Extract shared adapted weights for a sprint (all modules use the same vector).
const sprintWeights = (h) => {
  if (!h?.is_adapted) return null
  const mods = Object.values(h?.modules || {})
  return mods.find(m => m?.weights_adapted)?.weights_adapted ?? null
}

// Per-component weight direction vs Delphi baseline.
// Returns array of 6 objects: { dir: 'up'|'down'|'same', diff: number, label, name }
// 'up'   = weight increased ≥ 1.5 pp from Delphi → component under more scrutiny
// 'down' = weight decreased ≥ 1.5 pp from Delphi → component doing well, de-weighted
// 'same' = within ±1.5 pp of Delphi
const compDrifts = (history, idx) => {
  const w = sprintWeights(history[idx])
  if (!w) return null
  return DELPHI_W.map((dw, i) => {
    const diff = w[i] - dw
    return {
      dir:   diff >  0.015 ? 'up' : diff < -0.015 ? 'down' : 'same',
      diff,
      label: COMP_LABELS[i],
      name:  COMP_NAMES[i],
    }
  })
}

const ICONS = {
  lock:   <path d="M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4"/>,
  grid:   <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
  doc:    <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
  code:   <><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></>,
  shield: <path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6z"/>,
  bell:   <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></>,
}

const iconFor = (name = '') => {
  const n = name.toLowerCase()
  if (n.includes('login') || n.includes('auth')) return 'lock'
  if (n.includes('form'))    return 'doc'
  if (n.includes('api'))     return 'code'
  if (n.includes('security')) return 'shield'
  if (n.includes('ui') || n.includes('control')) return 'grid'
  if (n.includes('notif') || n.includes('bell')) return 'bell'
  return 'code'
}

// ── sub-components ────────────────────────────────────────────────────────────
function SprintCell({ v, asi, prev, isAdapted, drifts, onClick, tcCount, nFail }) {
  const c     = cellColor(v)
  const delta = prev != null ? v - prev : null

  // Summarise drifts for the tooltip
  const upCount   = drifts?.filter(d => d.dir === 'up').length   ?? 0
  const downCount = drifts?.filter(d => d.dir === 'down').length ?? 0
  const driftTip  = drifts
    ? drifts.map(d =>
        `${d.label} (${d.name}): ${d.dir === 'same' ? '≈ Delphi' : (d.diff > 0 ? '+' : '') + (d.diff * 100).toFixed(1) + ' pp'}`
      ).join('\n')
    : ''

  return (
    <button
      onClick={onClick}
      className="group relative flex w-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg transition hover:scale-[1.03]"
      style={{
        background:   c.bg,
        borderTop:    isAdapted ? '2px solid #0d9488' : `1px solid ${c.bar}22`,
        borderRight:  `1px solid ${c.bar}22`,
        borderBottom: `1px solid ${c.bar}22`,
        borderLeft:   `1px solid ${c.bar}22`,
        paddingTop:    isAdapted ? 18 : 16,
        paddingBottom: isAdapted ? 12 : 16,
        minHeight: 72,
      }}
    >
      {/* ── Adapted pill (teal) ───────────────────────────────────────── */}
      {isAdapted && (
        <span
          className="absolute top-0 left-0 right-0 flex items-center justify-center gap-0.5 py-[2px] text-[8px] font-bold uppercase tracking-wide leading-none"
          style={{ background: 'rgba(13,148,136,0.12)', color: '#0d9488' }}
          title={`Adaptive weights active.\n${upCount} component(s) weighted higher than Delphi baseline, ${downCount} lower.\nClick for full breakdown.`}
        >
          ⚡ adapted
        </span>
      )}

      {/* CASI score */}
      <span className="font-mono text-[14px] font-semibold leading-none" style={{ color: c.fg }}>{v}</span>
      {/* ASI baseline */}
      {asi != null && (
        <span className="font-mono text-[9px] leading-none" style={{ color: 'var(--text-dim)' }}>
          ASI {asi}
        </span>
      )}
      {/* Sprint delta */}
      {delta != null && (
        <span className="font-mono text-[9px] leading-none" style={{
          color: delta > 0 ? '#059669' : delta < 0 ? '#dc2626' : 'var(--text-dim)'
        }}>
          {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'}{delta !== 0 && ` ${Math.abs(delta)}`}
        </span>
      )}
      {/* Pass / Fail counts */}
      {tcCount != null && (
        <span className="font-mono text-[8px] leading-none flex items-center gap-1.5">
          <span style={{ color: '#10b981' }}>✓{tcCount - (nFail ?? 0)}</span>
          <span style={{ color: '#ef4444' }}>✗{nFail ?? 0}</span>
        </span>
      )}

      {/* ── Component weight-direction dots ───────────────────────────── */}
      {isAdapted && drifts ? (
        <div
          className="absolute bottom-1.5 flex items-center gap-[3px]"
          title={`Weight shifts vs Delphi baseline:\n${driftTip}\n\nOrange = weight ↑ (more scrutiny)  Teal = weight ↓ (doing well)  Grey = unchanged`}
        >
          {drifts.map((d) => (
            <span
              key={d.label}
              className="h-[5px] w-[5px] rounded-full"
              style={{
                background:
                  d.dir === 'up'   ? '#f97316' :   // orange — weight increased
                  d.dir === 'down' ? '#0d9488' :   // teal   — weight decreased
                                     'var(--line2)', // grey  — no change
                opacity: d.dir === 'same' ? 0.5 : 1,
              }}
            />
          ))}
        </div>
      ) : (
        <span className="absolute bottom-1 left-1 right-1 h-0.5 rounded-full" style={{ background: c.bar, opacity: 0.35 }}/>
      )}
    </button>
  )
}

function TrendCell({ values }) {
  if (!values || values.length < 2) return null
  const last = values[values.length - 1]
  const first = values[0]
  const trend = last > first ? '#10b981' : last < first ? '#ef4444' : '#94a3b8'
  return (
    <div className="flex items-center justify-center gap-2">
      <Sparkline values={values} stroke={trend} width={80} height={28}/>
      <span className="font-mono text-[11px]" style={{ color: trend }}>
        {last > first ? '+' : ''}{last - first}
      </span>
    </div>
  )
}

// ── CSV export helper ─────────────────────────────────────────────────────────
function downloadCSV(moduleRows, totals, sprintLabels) {
  const header = ['Module', ...sprintLabels, 'Trend (Δ)']
  const trend  = (arr) => arr.length > 1 ? `${arr[arr.length - 1] - arr[0] >= 0 ? '+' : ''}${arr[arr.length - 1] - arr[0]}` : '—'

  const rows = [
    header,
    ...moduleRows.map(r => [r.name, ...r.sprints, trend(r.sprints)]),
    ['Project CASI', ...totals, trend(totals)],
  ]

  const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: 'casi-sprint-heatmap.csv' })
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── main component ────────────────────────────────────────────────────────────
export default function SprintTable({ history = [], onNavigate, components = {} }) {
  const [drawer, setDrawer]         = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [offset, setOffset]         = useState(Infinity)  // clamps to maxOffset → shows latest
  const [visibleCount, setVisibleCount] = useState(8)
  const containerRef = useRef(null)

  const hasData = history.length > 0

  // Derive sprint labels — use "Mon YY" normally, but if any two sprints share
  // the same month+year (e.g. Jan 1 and Jan 16 both → "Jan 25") switch to
  // "Mon D" format so duplicates are never shown.
  const sprintLabels = (() => {
    const raw = history.map((h, i) => {
      if (!h.sprint_start) return { short: h.sprint || `S${i + 1}`, full: h.sprint || `S${i + 1}` }
      const d = new Date(h.sprint_start)
      const mon = d.toLocaleString('default', { month: 'short' })
      const yr  = d.getFullYear().toString().slice(2)
      const day = d.getDate()
      return { short: `${mon} ${yr}`, full: `${mon} ${day} '${yr}` }
    })
    // If any short label appears more than once, use the full (day-level) label for ALL
    const seen = {}
    raw.forEach(r => { seen[r.short] = (seen[r.short] || 0) + 1 })
    const hasDups = raw.some(r => seen[r.short] > 1)
    return raw.map(r => hasDups ? r.full : r.short)
  })()

  const moduleNames = hasData
    ? [...new Set(history.flatMap(h => Object.keys(h.modules || {})))]
    : []

  const moduleRows = moduleNames.map(name => {
    const sprints = history.map(h => {
      const m = (h.modules || {})[name] || {}
      return Math.round(m.casi ?? m.score ?? 0)
    })
    const asiSprints = history.map(h => {
      const m = (h.modules || {})[name] || {}
      return m.asi != null ? Math.round(m.asi) : null
    })
    return { name, sprints, asiSprints, cases: history[0]?.modules?.[name]?.tc_count ?? null }
  })

  const totals = sprintLabels.map((_, i) => {
    const vals = moduleRows.map(r => r.sprints[i]).filter(Boolean)
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
  })

  // Project-level ASI comes directly from the engine's averaged asi_score per sprint
  const asiTotals = history.map(h => h.asi_score != null ? Math.round(h.asi_score) : null)

  const numSprints = sprintLabels.length

  // ── Responsive windowing ──────────────────────────────────────────────────
  // Recalculate visible sprint count whenever the container resizes.
  // Available width = total - module col (240) - trend col (140) - padding (~48)
  // Each sprint cell targets ~88px minimum.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const calc = (w) => {
      const available = w - 240 - 140 - 48
      return Math.max(2, Math.floor(available / 88))
    }
    const obs = new ResizeObserver(([entry]) => {
      setVisibleCount(calc(entry.contentRect.width))
    })
    obs.observe(el)
    setVisibleCount(calc(el.offsetWidth))
    return () => obs.disconnect()
  }, [])

  const maxOffset    = Math.max(0, numSprints - visibleCount)
  const safeOffset   = Math.min(offset, maxOffset)
  const canPrev      = safeOffset > 0
  const canNext      = safeOffset < maxOffset

  const goTo = useCallback((n) => setOffset(Math.max(0, Math.min(n, maxOffset))), [maxOffset])

  // Sliced windows
  const winLabels    = sprintLabels.slice(safeOffset, safeOffset + visibleCount)
  const winHistory   = history.slice(safeOffset, safeOffset + visibleCount)
  const winModuleRows = moduleRows.map(r => ({
    ...r,
    sprints:    r.sprints.slice(safeOffset, safeOffset + visibleCount),
    asiSprints: r.asiSprints?.slice(safeOffset, safeOffset + visibleCount),
  }))
  const winTotals    = totals.slice(safeOffset, safeOffset + visibleCount)
  const winAsiTotals = asiTotals.slice(safeOffset, safeOffset + visibleCount)

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'var(--card2)' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
          </svg>
        </div>
        <p className="mt-4 text-[15px] font-semibold" style={{ color: 'var(--text-strong)' }}>No sprint history yet</p>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--text-dim)' }}>Upload multiple test suites to see the sprint heatmap</p>
      </div>
    )
  }

  // "Project CASI" is a virtual row over the totals array
  const totalsRow = { name: 'Project CASI', sprints: totals }
  const drawerModule = drawer
    ? (drawer.moduleName === 'Project CASI' ? totalsRow : moduleRows.find(r => r.name === drawer.moduleName))
    : null

  return (
    <div className="relative flex h-full flex-col">
      {/* Sub-header */}
      <div className="flex shrink-0 items-center justify-between border-b px-6 py-3" style={{ borderColor: 'var(--line)' }}>
        <div>
          <h1 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-strong)' }}>Sprint Heatmap</h1>
          <span className="text-[12px]" style={{ color: 'var(--text-dim)' }}>
            {moduleRows.length} module{moduleRows.length !== 1 ? 's' : ''} × {numSprints} sprint{numSprints !== 1 ? 's' : ''} · CASI score (large) + ASI baseline (grey) per cell · click any cell to drill in
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
            {[
              { color: '#10b981', label: 'Green ≥700' },
              { color: '#f59e0b', label: 'Yellow 400–699' },
              { color: '#ef4444', label: 'Red <400' },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="h-2.5 w-4 rounded-sm" style={{ background: `${color}40`, border: `1px solid ${color}55` }}/>
                {label}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-sm" style={{ background: 'rgba(13,148,136,0.12)', borderTop: '2px solid #0d9488', borderLeft: '1px solid rgba(13,148,136,0.25)', borderRight: '1px solid rgba(13,148,136,0.25)', borderBottom: '1px solid rgba(13,148,136,0.25)' }}/>
              ⚡ Adapted
            </span>
          </div>
          <div className="h-5 w-px" style={{ background: 'var(--line)' }}/>
          <button
            onClick={() => downloadCSV(moduleRows, totals, sprintLabels)}
            className="rounded-md border px-3 py-1.5 text-[11px] transition hover:bg-[var(--card2)]"
            style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Context banner */}
      <div className="mx-6 mt-4 rounded-xl border px-4 py-2.5 text-[11px] leading-relaxed" style={{ borderColor:'var(--line)', background:'var(--card2)', color:'var(--text-muted)' }}>
        <span className="font-semibold" style={{ color:'var(--text-strong)' }}>How to read this · </span>
        Each cell shows the <span className="font-semibold" style={{ color:'var(--text)' }}>CASI score</span> (large, coloured) and the <span className="font-semibold" style={{ color:'var(--text)' }}>ASI baseline</span> (small grey).
        <span style={{ color:'#10b981' }}> Green ≥700</span> · <span style={{ color:'#f59e0b' }}>Yellow</span> · <span style={{ color:'#ef4444' }}>Red</span>.
        The ▲/▼ is the CASI change from the previous sprint. · Cells with a <span className="font-semibold" style={{ color:'#0d9488' }}>⚡ adapted</span> banner (teal top border) use weights calibrated to your failure patterns. The 6 dots at the bottom show per-component weight shifts vs Delphi — <span style={{ color:'#f97316' }}>●</span> orange = weight up (more scrutiny), <span style={{ color:'#0d9488' }}>●</span> teal = weight down (doing well), grey = unchanged. Click any cell for the full breakdown.
      </div>

      {/* Heatmap */}
      <div className="flex-1 overflow-hidden flex flex-col p-6 gap-3" ref={containerRef}>

        {/* Navigation bar — only shown when sprints exceed the window */}
        {numSprints > visibleCount && (
          <div className="flex shrink-0 items-center justify-between rounded-xl border px-4 py-2" style={{ borderColor: 'var(--line)', background: 'var(--card2)' }}>
            {/* Prev group */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => goTo(0)}
                disabled={!canPrev}
                className="rounded-md border px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-30 hover:bg-[var(--bg2)]"
                style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
                title="Jump to earliest"
              >← First</button>
              <button
                onClick={() => goTo(safeOffset - 1)}
                disabled={!canPrev}
                className="flex h-7 w-7 items-center justify-center rounded-md border transition disabled:opacity-30 hover:bg-[var(--bg2)]"
                style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
                title="Previous sprint"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
            </div>

            {/* Centre label */}
            <div className="text-center">
              <div className="text-[12px] font-medium" style={{ color: 'var(--text-strong)' }}>
                {winLabels[0]} &nbsp;→&nbsp; {winLabels[winLabels.length - 1]}
              </div>
              <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
                {safeOffset + 1}–{Math.min(safeOffset + visibleCount, numSprints)} of {numSprints} sprints
              </div>
            </div>

            {/* Next group */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => goTo(safeOffset + 1)}
                disabled={!canNext}
                className="flex h-7 w-7 items-center justify-center rounded-md border transition disabled:opacity-30 hover:bg-[var(--bg2)]"
                style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
                title="Next sprint"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <button
                onClick={() => goTo(maxOffset)}
                disabled={!canNext}
                className="rounded-md border px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-30 hover:bg-[var(--bg2)]"
                style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
                title="Jump to latest"
              >Latest →</button>
            </div>
          </div>
        )}

        <div className="panel rounded-2xl p-4 overflow-hidden">
          <div className="grid gap-2" style={{ gridTemplateColumns: `240px repeat(${winLabels.length}, 1fr) 140px` }}>
            {/* Header row */}
            <div className="flex items-end px-2 pb-2 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Module</div>
            {winLabels.map((s, i) => (
              <div key={i} className="flex flex-col items-center pb-2">
                <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{s}</div>
              </div>
            ))}
            <div className="flex items-end justify-center pb-2 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Trend</div>

            {/* Data rows — use full sprints for Trend sparkline, windowed for cells */}
            {winModuleRows.map((m, mi) => {
              const fullRow = moduleRows[mi]
              return (
                <div key={m.name} className="contents">
                  <div className="flex items-center gap-3 rounded-lg px-2 py-2" style={{ background: 'var(--card2)' }}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md" style={{ background: 'var(--bg2)', border: '1px solid var(--line)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        {ICONS[iconFor(m.name)] ?? ICONS.code}
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium" style={{ color: 'var(--text-strong)' }}>{m.name}</div>
                      {m.cases && <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{m.cases} test cases</div>}
                    </div>
                  </div>
                  {m.sprints.map((v, i) => {
                    const modData = winHistory[i]?.modules?.[m.name]
                    return (
                      <SprintCell
                        key={i}
                        v={v}
                        asi={m.asiSprints?.[i] ?? null}
                        prev={i > 0 ? m.sprints[i - 1] : (safeOffset > 0 ? fullRow.sprints[safeOffset - 1] : null)}
                        isAdapted={winHistory[i]?.is_adapted ?? false}
                        drifts={compDrifts(winHistory, i)}
                        onClick={() => { setDrawer({ moduleName: m.name, sprintIdx: safeOffset + i }); setDrawerOpen(true) }}
                        tcCount={modData?.tc_count ?? null}
                        nFail={modData?.n_fail ?? null}
                      />
                    )
                  })}
                  <div className="flex items-center justify-center">
                    <TrendCell values={fullRow.sprints}/>
                  </div>
                </div>
              )
            })}

            {/* Totals row */}
            <div className="mt-1 flex items-center gap-3 rounded-lg px-2 py-2" style={{ background: 'var(--bg2)', borderTop: '1px dashed var(--line2)' }}>
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent">
                <span className="font-mono text-[10px] font-bold" style={{ color: 'var(--accent-fg)' }}>Σ</span>
              </div>
              <div>
                <div className="text-[13px] font-semibold" style={{ color: 'var(--text-strong)' }}>Project CASI</div>
                <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>avg across modules</div>
              </div>
            </div>
            {winTotals.map((t, i) => {
              const mods = winHistory[i]?.modules ?? {}
              const totalTc   = Object.values(mods).reduce((s, m) => s + (m.tc_count ?? 0), 0)
              const totalFail = winHistory[i]?.n_fail ?? null
              return (
                <div key={i} className="mt-1">
                  <SprintCell
                    v={t}
                    asi={winAsiTotals[i] ?? null}
                    prev={i > 0 ? winTotals[i - 1] : (safeOffset > 0 ? totals[safeOffset - 1] : null)}
                    isAdapted={winHistory[i]?.is_adapted ?? false}
                    drifts={compDrifts(winHistory, i)}
                    onClick={() => { setDrawer({ moduleName: 'Project CASI', sprintIdx: safeOffset + i }); setDrawerOpen(true) }}
                    tcCount={totalTc || null}
                    nFail={totalFail}
                  />
                </div>
              )
            })}
            <div className="mt-1 flex items-center justify-center">
              <TrendCell values={totals}/>
            </div>
          </div>
        </div>
      </div>

      {/* Module Drawer */}
      <ModuleDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        moduleName={drawerModule?.name}
        sprintValues={drawerModule?.sprints}
        asiValues={drawerModule?.asiSprints}
        sprintIdx={drawer?.sprintIdx}
        sprintLabel={drawer?.sprintIdx != null ? sprintLabels[drawer.sprintIdx] : null}
        sprintCount={sprintLabels.length}
        moduleData={
          drawer && drawer.moduleName !== 'Project CASI'
            ? (history[drawer.sprintIdx]?.modules?.[drawer.moduleName] || null)
            : {
                casi:       totals[drawer?.sprintIdx] ?? null,
                asi:        asiTotals[drawer?.sprintIdx] ?? null,
                is_adapted: history[drawer?.sprintIdx]?.is_adapted ?? false,
                weights_adapted: history[drawer?.sprintIdx]?.modules
                  ? Object.values(history[drawer?.sprintIdx].modules)[0]?.weights_adapted ?? null
                  : null,
                // Average norm_scores across all modules for this sprint
                norm_scores: (() => {
                  const mods = history[drawer?.sprintIdx]?.modules
                  if (!mods) return null
                  const modVals = Object.values(mods).filter(m => m.norm_scores)
                  if (!modVals.length) return null
                  return Object.fromEntries(
                    ['A','B','C','D','E','F'].map(k => [
                      k,
                      Math.round(modVals.reduce((s, m) => s + (m.norm_scores[k] ?? 50), 0) / modVals.length)
                    ])
                  )
                })(),
              }
        }
        result={{ components }}
        onExplain={(prompt) => {
          setDrawerOpen(false)
          onNavigate?.('chat', { initialPrompt: prompt })
        }}
      />
    </div>
  )
}
