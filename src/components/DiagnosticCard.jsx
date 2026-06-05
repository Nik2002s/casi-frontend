import { useState } from 'react'
import { Panel, Chip, FALLBACK_COMPONENT_LABELS } from './primitives'

// ── Gate thresholds ───────────────────────────────────────────────────────────
const GATE_NEXT = {
  Red:    { label: 'Yellow', target: 400 },
  Yellow: { label: 'Green',  target: 700 },
}

// ── Plain-English descriptions per component ──────────────────────────────────
function actionDescription(comp) {
  const { id, raw, norm } = comp
  const ok = norm >= 70
  switch (id) {
    case 'A': return ok
      ? 'Low regression rate — your suite is stable, TCs stay green between sprints'
      : `${raw != null ? (raw * 100).toFixed(1) + '% regression rate' : 'High regression rate'} — TCs that were passing have started failing`
    case 'B': return ok
      ? 'Good remediation speed — failures are being resolved quickly'
      : `Average fix time is ${raw != null ? raw.toFixed(0) + ' days' : 'too long'} — failing TCs are staying open too long`
    case 'C': return ok
      ? 'Low cumulative failure exposure — no persistent failures dragging the score'
      : 'Failures are persisting across multiple sprints, accumulating test downtime'
    case 'D': return ok
      ? 'Healthy pass rate — the majority of your test cases are passing'
      : `${raw != null ? raw.toFixed(0) + '%' : 'Too many'} of your test cases are currently failing`
    case 'E': return ok
      ? 'All suites are healthy — no module-level failures detected'
      : 'One or more suites have active failures — no fully green module'
    case 'F': return ok
      ? `${raw != null ? raw.toFixed(0) + '% of failures' : 'Failures'} have active variance waivers — well managed`
      : 'Low variance coverage — some failing TCs lack active waivers'
    default:  return ok ? 'Healthy' : 'Needs attention'
  }
}

function actionVerb(id) {
  return (
    { A: 'Reduce regressions', B: 'Speed up remediation', C: 'Close persistent failures',
      D: 'Fix failing test cases', E: 'Restore suite health', F: 'Add variance waivers' }[id]
    || 'Improve component'
  )
}

// ── Score Banner ──────────────────────────────────────────────────────────────
function ScoreBanner({ casi, asi, gate, history }) {
  const next      = GATE_NEXT[gate]
  const ptsNeeded = next ? next.target - Math.round(casi) : 0
  const last      = history[history.length - 1]
  const prev      = history[history.length - 2]
  const delta     = (last?.casi_score != null && prev?.casi_score != null)
    ? Math.round(last.casi_score - prev.casi_score) : null
  const gateColor = gate === 'Green' ? '#10b981' : gate === 'Yellow' ? '#f59e0b' : '#ef4444'
  const gateBg    = gate === 'Green' ? 'rgba(16,185,129,0.1)' : gate === 'Yellow' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--line)' }}>
      <div className="grid grid-cols-3 divide-x" style={{ borderColor: 'var(--line)' }}>
        {/* CASI score */}
        <div className="px-6 py-5">
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>CASI Score</div>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-5xl font-bold tracking-tight" style={{ color: 'var(--text-strong)' }}>{Math.round(casi)}</span>
            <span className="text-[12px]" style={{ color: 'var(--text-dim)' }}>/ 999</span>
          </div>
          <div className="mt-2 text-[11px]" style={{ color: 'var(--text-dim)' }}>
            ASI baseline:&nbsp;
            <span className="font-mono font-semibold" style={{ color: 'var(--text-muted)' }}>{Math.round(asi)}</span>
            <span className="ml-2 font-mono font-semibold" style={{ color: casi >= asi ? '#10b981' : '#ef4444' }}>
              {casi >= asi ? '+' : ''}{Math.round(casi - asi)} vs fixed weights
            </span>
          </div>
        </div>

        {/* Gate + target */}
        <div className="px-6 py-5">
          <div className="text-[10px] uppercase tracking-wider mb-3" style={{ color: 'var(--text-dim)' }}>Release Gate</div>
          <span className="rounded-full px-3 py-1 text-sm font-bold" style={{ background: gateBg, color: gateColor }}>{gate}</span>
          {next ? (
            <div className="mt-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
              <span className="font-mono font-semibold" style={{ color: gateColor }}>+{ptsNeeded} pts</span>
              {' '}needed to reach <span className="font-semibold">{next.label}</span> gate
            </div>
          ) : (
            <div className="mt-3 text-[12px] font-semibold" style={{ color: '#10b981' }}>Safe to release ✓</div>
          )}
        </div>

        {/* Sprint delta */}
        <div className="px-6 py-5">
          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>vs Previous Sprint</div>
          {delta != null ? (
            <>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-mono text-3xl font-bold tracking-tight" style={{ color: delta >= 0 ? '#10b981' : '#ef4444' }}>
                  {delta >= 0 ? '+' : ''}{delta}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>pts</span>
              </div>
              <div className="mt-1 text-[11px]" style={{ color: 'var(--text-dim)' }}>
                {delta >= 15 ? 'Strong improvement'
                  : delta > 0 ? 'Slight improvement'
                  : delta === 0 ? 'No change this sprint'
                  : delta > -15 ? 'Slight decline'
                  : 'Significant decline — act now'}
              </div>
            </>
          ) : (
            <div className="mt-3 text-[12px]" style={{ color: 'var(--text-dim)' }}>First run — no prior sprint to compare</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Action Plan ───────────────────────────────────────────────────────────────
function ActionPlan({ components, openFails, gate }) {
  const next      = GATE_NEXT[gate]
  const casiScore = components.reduce((s, c) => s + 9.99 * c.norm * c.wAdp, 0)
  const ptsNeeded = next ? next.target - Math.round(casiScore) : 0

  const needsWork = components
    .filter(c => c.norm < 70)
    .sort((a, b) => (9.99 * (100 - b.norm) * b.wAdp) - (9.99 * (100 - a.norm) * a.wAdp))

  const healthy   = components.filter(c => c.norm >= 70)
  const totalPot  = Math.round(needsWork.reduce((s, c) => s + 9.99 * (100 - c.norm) * c.wAdp, 0))

  if (needsWork.length === 0) {
    return (
      <div className="rounded-xl border px-5 py-4" style={{ borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' }}>
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span className="text-[13px] font-semibold" style={{ color: '#10b981' }}>All components are healthy — {gate} gate</span>
        </div>
        <p className="mt-1 text-[12px]" style={{ color: 'var(--text-dim)' }}>
          Continue current testing practices. Focus on maintaining coverage and addressing any new failures quickly.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <h2 className="text-[13px] font-semibold" style={{ color: 'var(--text-strong)' }}>
          {next
            ? `${needsWork.length} thing${needsWork.length !== 1 ? 's' : ''} blocking ${next.label} gate`
            : `${needsWork.length} improvement${needsWork.length !== 1 ? 's' : ''} available`}
        </h2>
        <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-dim)' }}>
          Fixing all {needsWork.length} would unlock up to&nbsp;
          <span className="font-mono font-semibold" style={{ color: 'var(--accent)' }}>+{totalPot} pts</span>
          {next && totalPot >= ptsNeeded
            ? <span style={{ color: '#10b981' }}> — enough to reach {next.label}</span>
            : next
              ? <span> — you still need +{Math.max(0, ptsNeeded - totalPot)} more pts for {next.label}</span>
              : null}
        </p>
      </div>

      {/* Action items */}
      {needsWork.map((comp, i) => {
        const critical = comp.norm < 50
        const color  = critical ? '#ef4444' : '#f59e0b'
        const bg     = critical ? 'rgba(239,68,68,0.05)' : 'rgba(245,158,11,0.05)'
        const border = critical ? 'rgba(239,68,68,0.22)' : 'rgba(245,158,11,0.22)'
        const potPts = Math.round(9.99 * (100 - comp.norm) * comp.wAdp)
        const relFails = ['B', 'C', 'D', 'E'].includes(comp.id) ? openFails.slice(0, 3) : []

        return (
          <div key={comp.id} className="rounded-xl border overflow-hidden" style={{ borderColor: border, background: bg }}>
            <div className="flex items-start gap-4 px-5 py-4">
              {/* Rank badge */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold mt-0.5"
                style={{ background: color, color: '#fff' }}>
                {i + 1}
              </div>

              <div className="flex-1 min-w-0">
                {/* Title row */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[14px]" style={{ color: 'var(--text-strong)' }}>{actionVerb(comp.id)}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'var(--card2)', color: 'var(--text-dim)' }}>{comp.label}</span>
                    {critical && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>Critical</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-[12px] shrink-0">
                    <span style={{ color: 'var(--text-dim)' }}>
                      Health:&nbsp;<span className="font-mono font-semibold" style={{ color }}>{comp.norm.toFixed(0)}%</span>
                    </span>
                    <span style={{ color: 'var(--text-dim)' }}>
                      Fix gain:&nbsp;<span className="font-mono font-semibold" style={{ color: 'var(--accent)' }}>+{potPts} pts</span>
                    </span>
                  </div>
                </div>

                {/* Health bar */}
                <div className="mt-2 h-1 rounded-full" style={{ background: 'var(--line)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, comp.norm)}%`, background: color }}/>
                </div>

                {/* Description */}
                <p className="mt-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>{actionDescription(comp)}</p>

                {/* Relevant failures */}
                {relFails.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>Top open failures:</span>
                    {relFails.map((f, fi) => (
                      <span key={fi} className="rounded px-2 py-0.5 text-[10px] font-mono"
                        style={{ background: 'var(--card2)', color: 'var(--text-dim)' }}>
                        {f.tc_id}&nbsp;·&nbsp;{f.days_open}d
                      </span>
                    ))}
                    {openFails.length > 3 && (
                      <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>+{openFails.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {/* Healthy summary */}
      {healthy.length > 0 && (
        <div className="rounded-xl border px-4 py-3 flex items-center gap-2"
          style={{ borderColor: 'rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.04)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span className="text-[12px] font-semibold" style={{ color: '#10b981' }}>
            {healthy.length} component{healthy.length !== 1 ? 's' : ''} already healthy —&nbsp;
          </span>
          <span className="text-[12px]" style={{ color: 'var(--text-dim)' }}>{healthy.map(c => c.label).join(', ')}</span>
        </div>
      )}
    </div>
  )
}

// ── Component Health Grid ─────────────────────────────────────────────────────
function HealthGrid({ components }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {components.map(comp => {
        const pct   = Math.min(100, Math.max(0, comp.norm))
        const color = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'
        const isUp  = comp.wAdp > comp.wDef + 0.005
        const isDn  = comp.wAdp < comp.wDef - 0.005
        return (
          <div key={comp.id} className="rounded-xl border px-4 py-4"
            style={{ borderColor: 'var(--line)', background: 'var(--card2)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold" style={{ color: 'var(--text-strong)' }}>{comp.label}</span>
              <span className="font-mono text-[13px] font-bold" style={{ color }}>{pct.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 rounded-full mb-3" style={{ background: 'var(--line)' }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }}/>
            </div>
            <p className="text-[11px] leading-snug" style={{ color: 'var(--text-dim)' }}>{actionDescription(comp)}</p>
            <div className="mt-2.5 flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-faint)' }}>
              <span>Weight:&nbsp;<span className="font-mono">{(comp.wAdp * 100).toFixed(1)}%</span></span>
              {isUp && <span className="font-semibold" style={{ color: '#f97316' }}>↑ emphasised</span>}
              {isDn && <span className="font-semibold" style={{ color: '#0d9488' }}>↓ de-emphasised</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Waterfall chart (kept in Advanced) ───────────────────────────────────────
function Waterfall({ asi, casi, components }) {
  const start = Math.round(asi)
  const end   = Math.round(casi)
  const steps = [
    { label: 'ASI', v: start, type: 'start' },
    ...components.map(c => ({ label: c.label, v: c.contrib, type: c.contrib >= 0 ? 'pos' : 'neg' })),
    { label: 'CASI', v: end, type: 'end' },
  ]
  let cum = start
  const pos = steps.map((s) => {
    if (s.type === 'start') return { top: start, bottom: 0, s }
    if (s.type === 'end')   return { top: end,   bottom: 0, s }
    const prev = cum; cum += s.v
    return { top: Math.max(prev, cum), bottom: Math.min(prev, cum), s }
  })
  const W = 720, H = 300, P = { t: 24, r: 20, b: 52, l: 48 }
  const plotW = W - P.l - P.r, plotH = H - P.t - P.b
  const scoreMin = Math.min(start, end) - 60, scoreMax = Math.max(start, end) + 60
  const yMin = Math.floor(scoreMin / 50) * 50, yMax = Math.ceil(scoreMax / 50) * 50
  const y    = (v) => P.t + plotH - ((v - yMin) / (yMax - yMin)) * plotH
  const barW = (plotW / steps.length) * 0.6
  const stepX = (i) => P.l + (plotW / steps.length) * (i + 0.5)
  const gridLines = []
  for (let v = yMin; v <= yMax; v += 50) gridLines.push(v)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {gridLines.map(v => (
        <g key={v}>
          <line x1={P.l} y1={y(v)} x2={W-P.r} y2={y(v)} stroke="var(--line)" strokeDasharray="2 4"/>
          <text x={P.l-8} y={y(v)} textAnchor="end" dominantBaseline="middle" fontFamily="JetBrains Mono" fontSize="10" fill="#64748b">{v}</text>
        </g>
      ))}
      {yMin < 400 && yMax > 400 && (
        <line x1={P.l} y1={y(400)} x2={W-P.r} y2={y(400)} stroke="#f59e0b" strokeOpacity="0.4" strokeDasharray="4 4"/>
      )}
      {pos.map((p, i) => {
        const { s } = p; const cx = stepX(i); const x = cx - barW / 2
        if (s.type === 'start' || s.type === 'end') {
          const color = s.type === 'start' ? '#94a3b8' : (s.v >= 700 ? '#10b981' : s.v >= 400 ? '#f59e0b' : '#ef4444')
          const yBar = y(s.v)
          return (
            <g key={i}>
              <rect x={x} y={yBar} width={barW} height={y(yMin)-yBar} rx="3" fill={color} fillOpacity="0.18" stroke={color} strokeWidth="1.5"/>
              <text x={cx} y={yBar-8} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="13" fontWeight="700" fill={color}>{s.v}</text>
              <text x={cx} y={H-P.b+16} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--text-muted)">{s.label}</text>
            </g>
          )
        }
        const color = s.v >= 0 ? '#10b981' : '#ef4444'
        const yTop = y(p.top), yBot = y(p.bottom)
        const lw = (s.label || '').split(' ')
        return (
          <g key={i}>
            <rect x={x} y={yTop} width={barW} height={yBot-yTop} rx="2" fill={color} fillOpacity="0.22" stroke={color} strokeWidth="1"/>
            <text x={cx} y={yTop-6} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="11" fontWeight="600" fill={color}>{s.v >= 0 ? '+' : ''}{s.v}</text>
            <text x={cx} y={H-P.b+16} textAnchor="middle" fontSize="9" fill="var(--text-dim)">{lw[0]}</text>
            {lw.length > 1 && <text x={cx} y={H-P.b+28} textAnchor="middle" fontSize="9" fill="var(--text-faint)">{lw.slice(1).join(' ')}</text>}
          </g>
        )
      })}
      {pos.slice(0,-1).map((p,i) => {
        const nxt = pos[i+1]
        const y1 = i === 0 ? y(start) : y(nxt.s.v >= 0 ? p.top : p.bottom)
        const y2 = nxt.s.type === 'end' ? y(end) : y(nxt.s.v >= 0 ? nxt.bottom : nxt.top)
        return <line key={`c${i}`} x1={stepX(i)+barW/2} y1={y1} x2={stepX(i+1)-barW/2} y2={y2} stroke="var(--text-faint)" strokeDasharray="2 3"/>
      })}
    </svg>
  )
}

// ── Component formula detail (kept in Advanced) ───────────────────────────────
function ComponentDetail({ comp }) {
  if (!comp) return null
  const contribAbs = Math.abs(comp.contrib ?? 0)
  const contribDir = (comp.contrib ?? 0) >= 0 ? 'boosted' : 'dragged down'
  const wShift     = (comp.wAdp ?? comp.wDef ?? 0) - (comp.wDef ?? 0)
  const weightDir  = wShift > 0.01  ? 'CASI weights this component more than the Delphi fixed weight'
    : wShift < -0.01 ? 'CASI weights this component less than the Delphi fixed weight'
    : 'CASI uses the same weight as the Delphi fixed weight for this component'
  return (
    <div className="space-y-3">
      <div className="rounded-lg px-3 py-2 text-[11px] leading-relaxed"
        style={{ background: 'var(--card2)', color: 'var(--text-muted)', borderLeft: '3px solid var(--accent)' }}>
        <span className="font-semibold" style={{ color: 'var(--text-strong)' }}>How CASI uses this · </span>
        Your {comp.label} raw signal was <span className="font-mono font-semibold" style={{ color: 'var(--text)' }}>{(comp.raw ?? 0).toFixed(3)}</span>,
        which normalises to a health score of <span className="font-mono font-semibold" style={{ color: 'var(--text)' }}>{(comp.norm ?? 0).toFixed(1)}%</span>.
        {' '}{weightDir} ({(comp.wAdp ?? 0).toFixed(3)} vs {(comp.wDef ?? 0).toFixed(3)}).
        Compared to the ASI baseline, this weight shift {contribDir} CASI by <span className="font-mono font-semibold" style={{ color: (comp.contrib ?? 0) >= 0 ? '#10b981' : '#ef4444' }}>{contribAbs} pts</span>.
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Raw signal',     value: (comp.raw  ?? 0).toFixed(3),  caption: 'Measured directly from test data' },
          { label: 'Health %',       value: (comp.norm ?? 0).toFixed(1) + '%', caption: '0 = worst · 100 = perfect' },
          { label: 'Adapted weight', value: (comp.wAdp ?? comp.wDef ?? 0).toFixed(3), caption: `Delphi default: ${(comp.wDef ?? 0).toFixed(3)}` },
        ].map(k => (
          <div key={k.label} className="panel-inner rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{k.label}</div>
            <div className="mt-1 font-mono text-2xl font-semibold" style={{ color: 'var(--text-strong)' }}>{k.value}</div>
            <div className="mt-0.5 text-[11px]" style={{ color: 'var(--text-dim)' }}>{k.caption}</div>
          </div>
        ))}
      </div>
      <div className="panel-inner rounded-xl p-4">
        <div className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>How this component moves CASI vs ASI</div>
        <div className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>weight-shift adjustment = 9.99 × health% × (adapted weight − default weight)</div>
        <div className="mt-2 font-mono text-[13px]" style={{ color: 'var(--text)' }}>
          <span style={{ color: 'var(--text-dim)' }}>= 9.99 × </span>
          <span>{(comp.norm ?? 0).toFixed(1)}</span>
          <span style={{ color: 'var(--text-dim)' }}> × ({(comp.wAdp ?? 0).toFixed(3)} − {(comp.wDef ?? 0).toFixed(3)}) = </span>
          <span className="text-lg font-semibold" style={{ color: (comp.contrib ?? 0) >= 0 ? '#10b981' : '#ef4444' }}>
            {(comp.contrib ?? 0) >= 0 ? '+' : ''}{comp.contrib ?? 0} pts vs ASI
          </span>
        </div>
        <div className="mt-2 text-[10px]" style={{ color: 'var(--text-dim)' }}>
          Absolute CASI contribution = 9.99 × {(comp.norm ?? 0).toFixed(1)} × {(comp.wAdp ?? 0).toFixed(3)} = {Math.round(9.99 * (comp.norm ?? 0) * (comp.wAdp ?? 0))} pts
        </div>
      </div>
    </div>
  )
}

// ── Main DiagnosticCard ───────────────────────────────────────────────────────
export default function DiagnosticCard({ result, onNavigate }) {
  const [advOpen, setAdvOpen] = useState(false)
  const [sel, setSel]         = useState(null)

  if (!result) return null

  const scores    = result.scores || result
  const asi       = scores.asi_score  ?? result.asi_score  ?? 0
  const casi      = scores.casi_score ?? result.casi_score ?? 0
  const gate      = scores.casi_gate  ?? 'Red'
  const compsRaw  = result.components || scores.components || {}
  const history   = result.sprint_history || []
  const openFails = result.open_failures  || []

  const compKeys = Object.keys(compsRaw).length > 0 ? Object.keys(compsRaw) : ['A','B','C','D','E','F']
  const DELPHI_W_DEFAULT = 1 / compKeys.length

  const components = compKeys.map(id => {
    const c    = compsRaw[id] || {}
    const wDef = c.weight_delphi  ?? DELPHI_W_DEFAULT
    const wAdp = c.weight_adapted ?? wDef
    const norm = c.normalized ?? c.norm ?? 0
    const raw  = c.raw ?? norm
    const contrib = Math.round(9.99 * norm * (wAdp - wDef))
    return { id, label: c.label || FALLBACK_COMPONENT_LABELS[id] || id, raw, norm, wDef, wAdp, contrib }
  })

  const activeSel = sel ?? (compKeys[0] || 'A')
  const selected  = components.find(c => c.id === activeSel)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-strong)' }}>Diagnostic</h1>
          <span className="text-[12px]" style={{ color: 'var(--text-dim)' }}>What to fix, and why — ranked by score impact</span>
        </div>
        <button
          onClick={() => {
            const prompt = `Explain my CASI diagnostic: ASI is ${Math.round(asi)} (fixed weights) and CASI is ${Math.round(casi)} (adapted weights), a difference of ${Math.round(casi - asi) >= 0 ? '+' : ''}${Math.round(casi - asi)}. The biggest component contributions are: ${components.slice().sort((a,b)=>Math.abs(b.contrib)-Math.abs(a.contrib)).slice(0,3).map(c=>`${c.label} (${c.contrib>=0?'+':''}${c.contrib} pts)`).join(', ')}. What does this mean and how do I improve the score?`
            onNavigate?.('chat', { state: { initialPrompt: prompt } })
          }}
          className="rounded-md bg-accent px-3 py-1.5 text-[11px] font-semibold"
          style={{ color: 'var(--accent-fg)' }}
        >Explain with AI →</button>
      </div>

      <ScoreBanner casi={casi} asi={asi} gate={gate} history={history}/>
      <ActionPlan components={components} openFails={openFails} gate={gate}/>

      <Panel title="Component Health" subtitle="All 6 quality dimensions — 100% is perfect, below 70% needs attention.">
        <HealthGrid components={components}/>
      </Panel>

      {/* Advanced (collapsible) */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--line)' }}>
        <button
          onClick={() => setAdvOpen(o => !o)}
          className="flex w-full items-center justify-between px-5 py-3 transition hover:bg-[var(--card2)]"
        >
          <div className="flex items-center gap-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
            <span className="text-[12px] font-semibold" style={{ color: 'var(--text-strong)' }}>Advanced — score decomposition &amp; formula detail</span>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            style={{ color: 'var(--text-dim)', transform: advOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {advOpen && (
          <div className="border-t p-5 space-y-6" style={{ borderColor: 'var(--line)' }}>
            <div>
              <div className="mb-1 text-[12px] font-semibold" style={{ color: 'var(--text-strong)' }}>
                Score decomposition — ASI {Math.round(asi)} → CASI {Math.round(casi)}
              </div>
              <p className="mb-3 text-[11px]" style={{ color: 'var(--text-dim)' }}>
                Green bars = the component's adapted weight boosted CASI above ASI. Red = it dragged it down. Sum of all bars = CASI − ASI.
              </p>
              <Waterfall asi={asi} casi={casi} components={components}/>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Panel title="Components" subtitle="Click to drill in" padded={false}>
                <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
                  {components.map((c, idx) => (
                    <button key={c.id} onClick={() => setSel(c.id)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${activeSel === c.id ? 'bg-[var(--accent-bg)]' : 'hover:bg-[var(--card2)]'}`}>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-bold"
                        style={{ background: activeSel === c.id ? 'var(--accent)' : 'var(--card2)', color: activeSel === c.id ? 'var(--accent-fg)' : 'var(--text-muted)' }}>
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>{c.label}</div>
                        <div className="font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>weight {c.wDef.toFixed(2)} → {c.wAdp.toFixed(2)}</div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-mono text-[12px] font-semibold" style={{ color: c.contrib >= 0 ? '#10b981' : '#ef4444' }}>
                          {c.contrib >= 0 ? '+' : ''}{c.contrib}
                        </span>
                        <span className="text-[9px]" style={{ color: 'var(--text-faint)' }}>pts vs ASI</span>
                      </div>
                    </button>
                  ))}
                </div>
              </Panel>
              <Panel title={selected?.label || ''} subtitle="Formula and weight detail" className="col-span-2">
                <ComponentDetail comp={selected}/>
              </Panel>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
