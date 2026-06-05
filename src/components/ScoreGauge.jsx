// Derive a one-line contextual insight from the score and delta
function scoreInsight(score, gate, delta) {
  if (gate === 'Green') {
    if (delta > 50) return `CASI lifted your score ${delta} pts above the industry baseline — your strongest components are weighted exactly where they matter.`
    if (delta < -20) return `You're Green despite a lower adapted score — focus on the dragging components to extend the lead.`
    return `Above the 700 Green threshold. Keep improving to build a safety buffer for future sprints.`
  }
  if (gate === 'Yellow') {
    const gap = 700 - score
    return `${gap} points from Green. Fix the highest-weighted failing components first — that's the fastest path to release.`
  }
  const gap = 400 - score
  return gap > 0
    ? `${gap} points below even Yellow. Critical and high failures need triage before the gate can improve.`
    : `Just inside Red. Closing the open Critical failures could push the gate to Yellow this sprint.`
}

export default function ScoreGauge({ score = 0, asiScore = 0, gate = 'Red', theme = 'dark' }) {
  const cx = 180, cy = 180, r = 130
  const scoreToAngle = (s) => 180 + (s / 999) * 180
  const polar = (a, rad = r) => ({ x: cx + rad * Math.cos((a * Math.PI) / 180), y: cy + rad * Math.sin((a * Math.PI) / 180) })
  const arcPath = (s, e, rad) => { const p1 = polar(s, rad), p2 = polar(e, rad); return `M ${p1.x} ${p1.y} A ${rad} ${rad} 0 ${e - s > 180 ? 1 : 0} 1 ${p2.x} ${p2.y}` }

  const redEnd   = scoreToAngle(400)
  const amberEnd = scoreToAngle(700)
  const endFull  = scoreToAngle(999)
  const angle    = scoreToAngle(Math.min(score, 999))
  const tip = polar(angle, r - 6), b1 = polar(angle + 90, 9), b2 = polar(angle - 90, 9)

  const gColor    = gate === 'Green' ? '#10b981' : gate === 'Yellow' ? '#f59e0b' : '#ef4444'
  const track     = theme === 'dark' ? '#1c2742' : '#e5e7eb'
  const tickC     = theme === 'dark' ? '#475569' : '#cbd5e1'
  const divider   = theme === 'dark' ? '#0a0f1e' : '#ffffff'
  const needleFill = theme === 'dark' ? '#f8fafc' : '#0f172a'
  const hubBg     = theme === 'dark' ? '#0f1629' : '#ffffff'

  const delta = score - asiScore
  const deltaTxt = `${delta >= 0 ? '+' : ''}${delta}`
  const deltaColor = delta >= 0 ? '#10b981' : '#ef4444'

  const gateBg  = gate === 'Green'  ? 'rgba(16,185,129,0.12)'  : gate === 'Yellow' ? 'rgba(245,158,11,0.12)'  : 'rgba(239,68,68,0.12)'
  const gateRing = gate === 'Green' ? 'rgba(16,185,129,0.4)'   : gate === 'Yellow' ? 'rgba(245,158,11,0.4)'   : 'rgba(239,68,68,0.4)'

  return (
    <div className="flex flex-col">
      {/* ── Score header row — score at top-left, ASI at top-right ── */}
      <div className="flex items-start justify-between px-2 pb-2">
        {/* CASI score + gate */}
        <div>
          {/* Label + info icon */}
          <div className="flex items-center gap-1">
            <div className="text-[9px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--text-dim)' }}>CASI</div>
            <div className="group relative">
              <svg className="cursor-help opacity-40 hover:opacity-80 transition" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              <div className="pointer-events-none absolute left-0 top-5 z-50 hidden w-72 rounded-xl border p-3.5 shadow-2xl group-hover:block"
                style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
                <div className="mb-1.5 text-[11px] font-bold" style={{ color: 'var(--text-strong)' }}>CASI — Composite Automated Stability Index</div>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  A 0–999 score that blends six engineering health components using <strong style={{ color: 'var(--text)' }}>adaptive weights</strong> calibrated to your team's actual failure patterns. Higher is always healthier.
                </p>
                <div className="mt-2.5 rounded-lg px-2.5 py-2 text-[10px] font-mono leading-relaxed" style={{ background: 'var(--card2)', color: 'var(--text-dim)' }}>
                  CASI = Σ(component_health × adapted_weight) × 999
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]" style={{ color: 'var(--text-dim)' }}>
                  {[['≥ 700','Green','Ship'],['400–699','Yellow','Caution'],['< 400','Red','Block']].map(([r, g, a]) => (
                    <div key={r} className="rounded px-1.5 py-1 text-center" style={{ background: 'var(--bg2)' }}>
                      <div className="font-mono font-semibold" style={{ color: g === 'Green' ? '#10b981' : g === 'Yellow' ? '#f59e0b' : '#ef4444' }}>{r}</div>
                      <div>{g} · {a}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="font-mono text-[52px] font-bold leading-none tracking-tight" style={{ color: gColor }}>{score}</div>
          <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset"
            style={{ background: gateBg, color: gColor, '--tw-ring-color': gateRing }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: gColor }}/>
            {gate}
          </div>
        </div>
        {/* ASI comparison */}
        <div className="text-right pt-1">
          {/* Label + info icon */}
          <div className="flex items-center justify-end gap-1">
            <div className="group relative">
              <svg className="cursor-help opacity-40 hover:opacity-80 transition" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              <div className="pointer-events-none absolute right-0 top-5 z-50 hidden w-72 rounded-xl border p-3.5 shadow-2xl group-hover:block"
                style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
                <div className="mb-1.5 text-[11px] font-bold" style={{ color: 'var(--text-strong)' }}>ASI — Automated Stability Index</div>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  The same six components as CASI but scored with <strong style={{ color: 'var(--text)' }}>fixed Delphi expert weights</strong> — the standard industry baseline. It does not adapt to your failure patterns.
                </p>
                <div className="mt-2.5 rounded-lg px-2.5 py-2 text-[10px] font-mono leading-relaxed" style={{ background: 'var(--card2)', color: 'var(--text-dim)' }}>
                  ASI = Σ(component_health × fixed_delphi_weight) × 999
                </div>
                <p className="mt-2 text-[10px] leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                  <strong style={{ color: 'var(--text)' }}>CASI − ASI gap:</strong> positive means adaptive weights are boosting your strong components; negative means they're penalising your weak ones harder.
                </p>
              </div>
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--text-dim)' }}>ASI baseline</div>
          </div>
          <div className="font-mono text-[28px] font-semibold leading-none" style={{ color: 'var(--text-muted)' }}>{asiScore}</div>
          <div className="mt-1 font-mono text-[11px] font-semibold" style={{ color: deltaColor }}>
            {deltaTxt} vs fixed weights
          </div>
        </div>
      </div>

      {/* ── Zone legend ── */}
      <div className="flex items-center justify-center gap-4 px-2 pb-1 text-[10px]">
        {[['Red','#ef4444','< 400'],['Yellow','#f59e0b','400–699'],['Green','#10b981','≥ 700']].map(([label, color, range]) => (
          <span key={label} className="flex items-center gap-1">
            <span className="h-1.5 w-3 rounded-full" style={{ background: color }}/>
            <span style={{ color: 'var(--text-dim)' }}>{label}</span>
            <span className="font-mono" style={{ color: 'var(--text-faint)', fontSize: 9 }}>{range}</span>
          </span>
        ))}
      </div>

      {/* ── Gauge SVG — arcs + needle only, no score text ── */}
      <svg viewBox="0 0 360 195" className="w-full -mt-1">
        <defs>
          <linearGradient id="redG"   x1="0" x2="1"><stop offset="0%" stopColor="#ef4444"/><stop offset="100%" stopColor="#f97316"/></linearGradient>
          <linearGradient id="amberG" x1="0" x2="1"><stop offset="0%" stopColor="#f97316"/><stop offset="100%" stopColor="#f59e0b"/></linearGradient>
          <linearGradient id="greenG" x1="0" x2="1"><stop offset="0%" stopColor="#10b981"/><stop offset="100%" stopColor="#22c55e"/></linearGradient>
          <filter id="ndShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2"/><feOffset dx="0" dy="1"/>
            <feComponentTransfer><feFuncA type="linear" slope="0.4"/></feComponentTransfer>
            <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Track */}
        <path d={arcPath(180, endFull, r)} fill="none" stroke={track} strokeWidth="18" strokeLinecap="round"/>
        {/* Coloured zones */}
        <path d={arcPath(180, redEnd,   r)} fill="none" stroke="url(#redG)"   strokeWidth="14"/>
        <path d={arcPath(redEnd, amberEnd, r)} fill="none" stroke="url(#amberG)" strokeWidth="14"/>
        <path d={arcPath(amberEnd, endFull, r)} fill="none" stroke="url(#greenG)" strokeWidth="14"/>

        {/* Tick marks */}
        {[0, 200, 400, 600, 800, 999].map(t => {
          const a = scoreToAngle(t), p1 = polar(a, r + 10), p2 = polar(a, r + 18), pL = polar(a, r + 30)
          return (
            <g key={t}>
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={tickC} strokeWidth="1.5"/>
              <text x={pL.x} y={pL.y} textAnchor="middle" dominantBaseline="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#64748b">{t}</text>
            </g>
          )
        })}

        {/* Zone dividers */}
        {[400, 700].map(v => {
          const a = scoreToAngle(v), p1 = polar(a, r - 14), p2 = polar(a, r + 8)
          return <line key={v} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={divider} strokeWidth="3"/>
        })}

        {/* Needle — drawn last so it's always on top */}
        <g filter="url(#ndShadow)">
          <polygon points={`${b1.x},${b1.y} ${tip.x},${tip.y} ${b2.x},${b2.y}`} fill={needleFill}/>
          <circle cx={cx} cy={cy} r="13" fill={hubBg} stroke={needleFill} strokeWidth="2.5"/>
          <circle cx={cx} cy={cy} r="4.5" fill={needleFill}/>
        </g>
      </svg>

      {/* ── Contextual insight ── */}
      <div className="mx-2 mt-1 rounded-lg px-3 py-2 text-[11px] leading-relaxed" style={{ background: 'var(--card2)', color: 'var(--text-muted)', borderLeft: `3px solid ${gColor}` }}>
        <span className="font-semibold" style={{ color: gColor }}>What this means · </span>
        {scoreInsight(score, gate, delta)}
      </div>
    </div>
  )
}
