import { useState } from 'react'
import { Chip, gateColor, gateTone, Panel, FALLBACK_COMPONENT_LABELS } from '../components/primitives'
import ScoreGauge from '../components/ScoreGauge'
import RadarChart, { RadarLegend } from '../components/RadarChart'
import TrendChart, { TrendLegend, TrendInsight } from '../components/TrendChart'
import HealthTiles from '../components/HealthTiles'
import OpenFailures from '../components/OpenFailures'

// Delphi baseline weights (A–F)
const DELPHI_W = { A: 0.22, B: 0.18, C: 0.17, D: 0.16, E: 0.14, F: 0.13 }
const COMP_FULL = {
  A: { name: 'Broken Index',  formula: 'pass→fail transitions / total TCs',  dir: 'lower is better' },
  B: { name: 'Avg Fix Time',  formula: 'mean days open for failing TCs',      dir: 'lower is better' },
  C: { name: 'Downtime',      formula: 'total failing-days / TC count',        dir: 'lower is better' },
  D: { name: 'Fail Ratio',    formula: 'failing TCs / total TCs × 100%',      dir: 'lower is better' },
  E: { name: 'Suite Fail',    formula: '0 if all pass, 100 if any fail',       dir: 'lower is better' },
  F: { name: 'Variances',     formula: 'variance-covered fails / all fails × 100%', dir: 'higher is better' },
}

// ── Collapsible formula card ──────────────────────────────────────────────────
function FormulaCard({ components }) {
  const [open, setOpen] = useState(false)
  const keys = Object.keys(components).length ? Object.keys(components) : Object.keys(COMP_FULL)

  return (
    <div className="border-t" style={{ borderColor: 'var(--line)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-5 py-3 text-left transition hover:bg-[var(--card2)]"
      >
        <div className="flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
          <span className="text-[12px] font-semibold" style={{ color: 'var(--text-strong)' }}>How CASI &amp; ASI are computed</span>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          style={{ color: 'var(--text-dim)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          {/* Top formula */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'CASI', color: 'var(--accent)', formula: 'Σ ( component_health × adaptive_weight ) × 999', note: 'Weights shift each sprint based on your actual failure patterns.' },
              { label: 'ASI',  color: 'var(--text-muted)', formula: 'Σ ( component_health × delphi_weight ) × 999', note: 'Fixed expert baseline — never changes. Use as a benchmark.' },
            ].map(({ label, color, formula, note }) => (
              <div key={label} className="rounded-xl border px-4 py-3" style={{ borderColor: 'var(--line)', background: 'var(--card2)' }}>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</div>
                <div className="font-mono text-[11px]" style={{ color: 'var(--text-strong)' }}>{formula}</div>
                <div className="mt-1.5 text-[10px]" style={{ color: 'var(--text-dim)' }}>{note}</div>
              </div>
            ))}
          </div>

          {/* Per-component table */}
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
              Component breakdown — this run
            </div>
            <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--line)' }}>
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ background: 'var(--card2)', borderBottom: '1px solid var(--line)' }}>
                    {['Component', 'What it measures', 'Raw → Health', 'Delphi wt', 'Adapted wt', 'Direction'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k, i) => {
                    const c    = components[k] || {}
                    const meta = COMP_FULL[k] || { name: k, formula: '—', dir: '—' }
                    const dw   = DELPHI_W[k] != null ? `${(DELPHI_W[k] * 100).toFixed(0)}%` : '—'
                    const aw   = c.weight_adapted != null ? `${(c.weight_adapted * 100).toFixed(1)}%` : dw
                    const norm = c.norm ?? c.normalized
                    const raw  = c.raw
                    const bar  = norm >= 70 ? '#10b981' : norm >= 50 ? '#f59e0b' : '#ef4444'
                    return (
                      <tr key={k} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--card2)', borderTop: '1px solid var(--line)' }}>
                        <td className="px-3 py-2 font-semibold" style={{ color: 'var(--text-strong)' }}>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded mr-1" style={{ background: 'var(--bg2)', color: 'var(--text-dim)' }}>{k}</span>
                          {c.label || meta.name}
                        </td>
                        <td className="px-3 py-2" style={{ color: 'var(--text-dim)' }}>{meta.formula}</td>
                        <td className="px-3 py-2 font-mono">
                          {raw != null ? (
                            <span>
                              <span style={{ color: 'var(--text-dim)' }}>{raw.toFixed(2)} → </span>
                              <span style={{ color: bar }}>{norm != null ? norm.toFixed(1) : '—'}/100</span>
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-dim)' }}>{dw}</td>
                        <td className="px-3 py-2 font-mono">
                          <span style={{ color: c.weight_adapted > DELPHI_W[k] ? '#f97316' : c.weight_adapted < DELPHI_W[k] ? '#0d9488' : 'var(--text-dim)' }}>
                            {aw}
                            {c.weight_adapted > DELPHI_W[k] + 0.005 ? ' ↑' : c.weight_adapted < DELPHI_W[k] - 0.005 ? ' ↓' : ''}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[10px]" style={{ color: 'var(--text-dim)' }}>{meta.dir}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[10px]" style={{ color: 'var(--text-dim)' }}>
              ↑ orange = weight increased vs Delphi (more scrutiny) · ↓ teal = weight decreased (component doing well) · Component health 0–100 (higher = healthier)
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function KpiRow({ result }) {
  const scores  = result?.scores   || {}
  const dataset = result?.dataset  || {}
  const history = result?.sprint_history || []
  const fails   = result?.open_failures  || []
  const last    = history[history.length - 1] || {}

  const critCount = fails.filter(f => f.priority === 'Critical').length
  const kpis = [
    {
      label: 'Gate',
      value: scores.casi_gate || '—',
      sub: scores.casi_gate === 'Green' ? 'Safe to release' : scores.casi_gate === 'Yellow' ? 'Release with caution' : 'Block release',
      tip: 'Red <400 · Yellow 400–699 · Green ≥700. Gates directly map to your CASI score zone.',
      badge: true,
      tone: gateTone(scores.casi_gate || 'Red'),
    },
    {
      label: 'Open Failures',
      value: String(fails.length),
      sub: critCount > 0 ? `${critCount} critical blocking Green` : 'No critical failures',
      tip: 'Every open failure reduces your score. Critical failures carry the most weight. Closing them is the fastest way to improve.',
    },
    {
      label: 'Test Cases',
      value: String(dataset.tc_count || 0),
      sub: `across ${dataset.sprint_count || 0} sprints`,
      tip: 'Total test cases CASI analysed. More test history = more reliable adaptive weight calibration.',
    },
    {
      label: 'Modules',
      value: String((dataset.modules || []).length),
      sub: (dataset.modules || []).slice(0,2).join(', ') + ((dataset.modules || []).length > 2 ? '…' : ''),
      tip: 'Test suite modules (sheets). CASI scores each module independently and rolls them up.',
    },
    {
      label: 'Sprints Tracked',
      value: String(history.length),
      sub: history.length >= 3 ? 'weights fully calibrated' : history.length >= 1 ? `${3 - history.length} more for full calibration` : 'upload first run',
      tip: 'CASI needs ≥3 sprints to fully calibrate adaptive weights. More history = smarter scoring.',
    },
  ]

  return (
    <div className="grid grid-cols-5 gap-3">
      {kpis.map(k => (
        <div key={k.label} className="panel group relative rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider" style={{ color:'var(--text-dim)' }}>{k.label}</span>
            {k.tip && (
              <span className="relative">
                <svg className="cursor-help opacity-30 group-hover:opacity-70 transition" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                <span className="pointer-events-none absolute right-0 top-5 z-50 hidden w-52 rounded-lg border p-2.5 text-[11px] leading-relaxed shadow-lg group-hover:block"
                  style={{ background:'var(--card)', borderColor:'var(--line)', color:'var(--text-muted)' }}>
                  {k.tip}
                </span>
              </span>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {k.badge
              ? <Chip tone={k.tone}>{k.value}</Chip>
              : <span className="font-mono text-2xl font-semibold tracking-tight" style={{ color:'var(--text-strong)' }}>{k.value}</span>
            }
          </div>
          <div className="mt-1.5 text-[11px]" style={{ color:'var(--text-dim)' }}>{k.sub}</div>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage({ result, theme, onNavigate }) {
  const setView = onNavigate  // alias for backward compat
  const scores   = result?.scores          || {}
  const history  = result?.sprint_history  || []
  const failures = result?.open_failures   || []
  const comps    = result?.components      || {}
  const filename = result?.filename        || result?.session_id || 'latest run'
  const computedAt = result?.computed_at   || ''
  const timeAgo = computedAt ? `${Math.round((Date.now() - new Date(computedAt)) / 60000)}m ago` : ''

  return (
    <>
      {/* Sub-header — pinned above scroll (matches design 06) */}
      <div className="flex shrink-0 items-center justify-between border-b px-6 py-3" style={{ borderColor:'var(--line)' }}>
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-semibold tracking-tight" style={{ color:'var(--text-strong)' }}>CASI Dashboard</h1>
          <span className="text-[12px]" style={{ color:'var(--text-dim)' }}>
            {result?.dataset?.tc_count || 0} test cases · {history.length} sprints{timeAgo ? ` · computed ${timeAgo}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="rounded-md border px-3 py-1.5 text-[11px] font-medium transition hover:bg-[var(--card2)]" style={{ borderColor:'var(--line)', color:'var(--text-muted)' }}>Export PDF</button>
          <button
            onClick={() => {
              const casi   = Math.round(scores.casi_score || 0)
              const asi    = Math.round(scores.asi_score  || 0)
              const gate   = scores.casi_gate || 'Unknown'
              const last   = history[history.length - 1] || {}
              const prev   = history[history.length - 2] || {}
              const delta  = last.casi_score != null && prev.casi_score != null
                ? Math.round(last.casi_score - prev.casi_score) : null
              const topFails = failures.slice(0, 5).map(f =>
                `  - ${f.tc_id}: ${f.name} (${f.priority}, ${f.days_open}d open, module: ${f.module})`
              ).join('\n')
              const compLines = Object.entries(comps).map(([k, c]) =>
                `  ${k} ${c.label}: health=${c.normalized ?? 50}/100, raw=${c.raw}, delphi_wt=${c.weight_delphi}, adapted_wt=${c.weight_adapted}`
              ).join('\n')
              const sprintLine = last.sprint_start
                ? `Latest sprint: ${last.sprint_start} → ${last.sprint_end || '?'} | fails: ${last.n_fail}`
                : 'No sprint data'
              const prompt = [
                `CASI Dashboard Overview — please analyse and advise.`,
                ``,
                `Scores: CASI=${casi} (${gate}), ASI=${asi}${delta != null ? `, Δ${delta >= 0 ? '+' : ''}${delta} vs prev sprint` : ''}`,
                `Dataset: ${result?.dataset?.tc_count || 0} TCs across ${(result?.dataset?.modules || []).length} modules, ${history.length} sprints tracked`,
                `Date range: ${result?.dataset?.date_range || 'unknown'}`,
                `${sprintLine}`,
                ``,
                `Component health (0–100, higher = healthier):`,
                compLines || '  (no component data)',
                ``,
                `Top open failures (${failures.length} total):`,
                topFails || '  None',
                ``,
                `Questions: What is the most important issue to fix? Which components and modules need the most attention? Should the team release?`,
              ].join('\n')
              setView('chat', { initialPrompt: prompt, source: 'explain' })
            }}
            className="rounded-md border px-3 py-1.5 text-[11px] font-medium"
            style={{ borderColor:'var(--line)', color:'var(--text-muted)' }}
          >Explain with AI</button>
          <button onClick={() => setView('upload')} className="rounded-md bg-accent px-3 py-1.5 text-[11px] font-semibold" style={{ color:'var(--accent-fg)' }}>+ New Run</button>
        </div>
      </div>

      <main className="scrollbar-thin flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[1440px] space-y-4 p-6">

        <KpiRow result={result}/>

        {/* How CASI & ASI are computed — collapsible */}
        <FormulaCard components={comps}/>

        {/* CASI Score card — full width */}
        <Panel
          title="CASI Score"
          className="overflow-hidden"
          right={<Chip tone="blue">Adapted</Chip>}
          padded={false}
        >
          {/* Row 1: Gauge + Trend */}
          <div className="grid grid-cols-2 gap-0 border-b" style={{ borderColor:'var(--line)', minHeight: 300 }}>
            <div className="border-r px-5 py-4" style={{ borderColor:'var(--line)' }}>
              <ScoreGauge
                score={Math.round(scores.casi_score || 0)}
                asiScore={Math.round(scores.asi_score || 0)}
                gate={scores.casi_gate || 'Red'}
                theme={theme}
              />
            </div>
            <div className="flex flex-col px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color:'var(--text-dim)' }}>Score history</div>
                  <div className="text-[11px]" style={{ color:'var(--text-muted)' }}>CASI (solid) vs ASI baseline (dashed) · 2-sprint forecast shaded</div>
                </div>
                <TrendLegend/>
              </div>
              <div className="flex-1 min-h-0">
                <TrendChart history={history} theme={theme}/>
              </div>
              <TrendInsight history={history}/>
            </div>
          </div>

          {/* Row 2: Radar + Health tiles */}
          <div className="grid grid-cols-3 gap-0">
            <div className="border-r px-4 py-4" style={{ borderColor:'var(--line)' }}>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider" style={{ color:'var(--text-dim)' }}>Component Radar</div>
                <RadarLegend theme={theme}/>
              </div>
              <RadarChart components={comps} theme={theme}/>
            </div>
            <div className="col-span-2 px-5 py-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider" style={{ color:'var(--text-dim)' }}>Component Health</div>
                <button className="text-[11px] text-accent" onClick={() => setView('diagnostic')}>See weight breakdown →</button>
              </div>
              <HealthTiles components={comps}/>
              <div className="mt-3 flex items-center justify-between rounded-lg px-3 py-2" style={{ background:'var(--card2)' }}>
                <span className="text-[11px]" style={{ color:'var(--text-dim)' }}>
                  {Object.entries(comps).map(([k, c]) => (c.label || FALLBACK_COMPONENT_LABELS[k] || k)).join(' · ')}
                </span>
                <span className="text-[11px]" style={{ color:'var(--text-dim)' }}>OK ≥70 · Watch 50–69 · Risk &lt;50</span>
              </div>
            </div>
          </div>

        </Panel>

        {/* Open Failures card — below CASI Score, full width */}
        <Panel title="Open Failures" subtitle="Each failure costs points — fix Critical first" right={<button className="text-[11px] text-accent" onClick={() => setView('sprints')}>View by sprint →</button>}>
          <OpenFailures failures={failures}/>
        </Panel>

      </div>
    </main>
    </>
  )
}
