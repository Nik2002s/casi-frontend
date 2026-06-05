import { useState } from 'react'

// CASI TrendChart — SVG line chart with forecast band, ported from design

export function TrendLegend() {
  return (
    <div className="flex items-center gap-4 text-[11px]">
      <div className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-accent inline-block"/><span style={{ color:'var(--text)' }}>CASI</span></div>
      <div className="flex items-center gap-1.5"><svg width="16" height="2"><line x1="0" y1="1" x2="16" y2="1" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 3"/></svg><span style={{ color:'var(--text-muted)' }}>ASI</span></div>
      <div className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm inline-block" style={{ background:'var(--accent-bg)', border:'1px solid var(--accent)' }}/><span style={{ color:'var(--text-muted)' }}>Forecast</span></div>
    </div>
  )
}

export function TrendInsight({ history = [] }) {
  if (history.length < 2) return null
  const scores = history.map(h => Math.round(h.casi_score || 0))
  const first = scores[0], last = scores[scores.length - 1]
  const delta = last - first
  const recent = scores[scores.length - 1] - scores[Math.max(0, scores.length - 2)]
  const peak  = Math.max(...scores)
  const isPeak = last === peak

  let icon, color, msg
  if (recent > 20) {
    icon = '↑'; color = '#10b981'
    msg = `Up ${recent} pts last sprint — momentum is building. If this continues, ${700 - last > 0 ? `you're ${700 - last} pts from Green` : 'you\'re already in Green territory'}.`
  } else if (recent < -20) {
    icon = '↓'; color = '#ef4444'
    msg = `Down ${Math.abs(recent)} pts last sprint. Check which components regressed in the Sprint Table to find the root cause.`
  } else {
    icon = '→'; color = '#f59e0b'
    msg = `Score stable over the last sprint (${recent >= 0 ? '+' : ''}${recent} pts). ${delta > 0 ? `Overall trend is +${delta} pts since the first run.` : delta < 0 ? `Overall trend is ${delta} pts — longer-term drift needs attention.` : 'No net change since the first run.'}`
  }

  return (
    <div className="mx-1 mb-1 flex items-start gap-2 rounded-lg px-3 py-2 text-[11px] leading-relaxed" style={{ background: 'var(--card2)', color: 'var(--text-muted)' }}>
      <span className="shrink-0 font-bold text-[13px]" style={{ color }}>{icon}</span>
      <span><span className="font-semibold" style={{ color }}>Trend · </span>{msg}</span>
    </div>
  )
}

const WINDOW = 10  // max sprints visible at once in the chart

export default function TrendChart({ history = [], theme = 'dark' }) {
  const W = 680, H = 260, P = { t: 20, r: 100, b: 38, l: 44 }
  const plotW = W - P.l - P.r, plotH = H - P.t - P.b

  // Full sprint dataset
  const allData = history.map(h => ({
    date: (h.sprint_start || '').slice(5, 10),
    asi:  Math.round(h.asi_score  || 0),
    casi: Math.round(h.casi_score || 0),
  }))

  // Slider — shows most-recent WINDOW sprints; user scrolls back through history
  const needsSlider  = allData.length > WINDOW
  const maxStart     = Math.max(0, allData.length - WINDOW)
  const [startIdx, setStartIdx] = useState(maxStart)
  const clampedStart = Math.min(startIdx, maxStart)
  const canPrev      = clampedStart > 0
  const canNext      = clampedStart < maxStart
  const goTo         = (n) => setStartIdx(Math.max(0, Math.min(n, maxStart)))
  const data         = needsSlider ? allData.slice(clampedStart, clampedStart + WINDOW) : allData

  // Simple 2-sprint linear forecast
  const forecast = []
  if (data.length >= 2) {
    const last  = data[data.length - 1]
    const prev  = data[data.length - 2]
    const delta = last.casi - prev.casi
    for (let i = 1; i <= 2; i++) {
      const mid = Math.max(0, Math.min(999, last.casi + delta * i))
      forecast.push({ date: `F+${i}`, lo: Math.max(0, mid - 30), hi: Math.min(999, mid + 30), mid })
    }
  }

  const total = data.length + forecast.length || 1
  const xCoord = (i) => P.l + (i / (total - 1)) * plotW
  const yCoord = (v) => P.t + plotH - (v / 999) * plotH

  const dxs = data.map((_, i) => xCoord(i))
  const fxs = forecast.map((_, i) => xCoord(data.length + i))

  const linePath = (arr, xs, key) =>
    arr.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xs[i]} ${yCoord(d[key])}`).join(' ')

  const bandTop = [[dxs[dxs.length - 1], yCoord(data[data.length - 1]?.casi || 0)], ...forecast.map((f, i) => [fxs[i], yCoord(f.hi)])]
  const bandBot = [...forecast.map((f, i) => [fxs[i], yCoord(f.lo)]).reverse(), [dxs[dxs.length - 1], yCoord(data[data.length - 1]?.casi || 0)]]
  const bandPath = [...bandTop, ...bandBot].map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ') + ' Z'
  const flLine = [[dxs[dxs.length - 1], yCoord(data[data.length - 1]?.casi || 0)], ...forecast.map((f, i) => [fxs[i], yCoord(f.mid)])].map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')

  const grid   = theme === 'dark' ? '#1c2742' : '#e5e7eb'
  const tDim   = '#64748b'
  const tMuted = theme === 'dark' ? '#475569' : '#cbd5e1'
  const tStrong = theme === 'dark' ? '#e2e8f0' : '#0f172a'
  const asiL   = theme === 'dark' ? '#64748b' : '#94a3b8'
  const div    = theme === 'dark' ? '#475569' : '#cbd5e1'
  const dot    = theme === 'dark' ? '#0a0f1e' : '#ffffff'

  if (allData.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-[13px]" style={{ color: 'var(--text-dim)' }}>
        No sprint history yet
      </div>
    )
  }

  return (
    <>
      <svg key={clampedStart} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ animation: 'casi-fade-in 0.22s ease' }}>
      <defs>
        <linearGradient id="casiArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity={theme === 'dark' ? 0.25 : 0.18}/>
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
        </linearGradient>
        <pattern id="forecastPat" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="var(--accent)" fillOpacity={theme === 'dark' ? 0.06 : 0.08}/>
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="1"/>
        </pattern>
      </defs>

      {/* Y-axis grid */}
      {[0, 200, 400, 600, 800, 999].map(v => (
        <g key={v}>
          <line x1={P.l} y1={yCoord(v)} x2={W - P.r} y2={yCoord(v)} stroke={grid} strokeDasharray="2 4"/>
          <text x={P.l - 8} y={yCoord(v)} textAnchor="end" dominantBaseline="middle" fontFamily="JetBrains Mono" fontSize="10" fill={tDim}>{v}</text>
        </g>
      ))}

      {/* Gate threshold lines */}
      <line x1={P.l} y1={yCoord(700)} x2={W - P.r} y2={yCoord(700)} stroke="#10b981" strokeOpacity="0.35" strokeDasharray="4 4"/>
      <line x1={P.l} y1={yCoord(400)} x2={W - P.r} y2={yCoord(400)} stroke="#f59e0b" strokeOpacity="0.35" strokeDasharray="4 4"/>
      <g><rect x={W-P.r+6} y={yCoord(700)-9} width="88" height="18" rx="4" fill="#10b981" fillOpacity="0.1" stroke="#10b981" strokeOpacity="0.3"/><text x={W-P.r+50} y={yCoord(700)} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="600" fill="#10b981">Green ≥ 700</text></g>
      <g><rect x={W-P.r+6} y={yCoord(400)-9} width="88" height="18" rx="4" fill="#f59e0b" fillOpacity="0.1" stroke="#f59e0b" strokeOpacity="0.3"/><text x={W-P.r+50} y={yCoord(400)} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="600" fill="#f59e0b">Yellow ≥ 400</text></g>

      {/* Forecast band */}
      {forecast.length > 0 && (
        <>
          <path d={bandPath} fill="url(#forecastPat)"/>
          <line x1={dxs[dxs.length-1]} y1={P.t} x2={dxs[dxs.length-1]} y2={P.t+plotH} stroke={div} strokeDasharray="3 3" strokeOpacity="0.5"/>
          <text x={dxs[dxs.length-1]+4} y={P.t+10} fontSize="9" fontWeight="600" fill={tDim}>Forecast →</text>
        </>
      )}

      {/* ASI line */}
      <path d={linePath(data, dxs, 'asi')} fill="none" stroke={asiL} strokeWidth="1.5" strokeDasharray="4 3"/>

      {/* CASI area + line */}
      <path d={`M ${dxs[0]} ${yCoord(0)} ${data.map((d, i) => `L ${dxs[i]} ${yCoord(d.casi)}`).join(' ')} L ${dxs[dxs.length-1]} ${yCoord(0)} Z`} fill="url(#casiArea)"/>
      <path d={linePath(data, dxs, 'casi')} fill="none" stroke="var(--accent)" strokeWidth="2.25"/>

      {/* Forecast line */}
      {forecast.length > 0 && <path d={flLine} fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 3" strokeOpacity="0.7"/>}

      {/* Data point dots */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={dxs[i]} cy={yCoord(d.asi)}  r="2.5" fill={dot} stroke={asiL} strokeWidth="1.5"/>
          <circle cx={dxs[i]} cy={yCoord(d.casi)} r="3.5" fill="var(--accent)" stroke={dot} strokeWidth="2"/>
        </g>
      ))}
      {forecast.map((f, i) => <circle key={i} cx={fxs[i]} cy={yCoord(f.mid)} r="3" fill={dot} stroke="var(--accent)" strokeWidth="1.5"/>)}

      {/* Score callout on last real data point */}
      {data.length > 0 && (
        <text x={dxs[dxs.length-1]} y={yCoord(data[data.length-1].casi) - 12} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="11" fontWeight="600" fill={tStrong}>{data[data.length-1].casi}</text>
      )}

      {/* X-axis labels */}
      {data.map((d, i) => <text key={i} x={dxs[i]} y={H - P.b + 16} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="10" fill={tDim}>{d.date}</text>)}
      {forecast.map((f, i) => <text key={i} x={fxs[i]} y={H - P.b + 16} textAnchor="middle" fontFamily="JetBrains Mono" fontSize="10" fill={tMuted}>{f.date}</text>)}
    </svg>

    {needsSlider && (
      <div className="mt-2 mx-1 flex items-center justify-between rounded-xl border px-4 py-2" style={{ borderColor: 'var(--line)', background: 'var(--card2)' }}>
        {/* Prev group */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => goTo(0)}
            disabled={!canPrev}
            className="rounded-md border px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-30 hover:bg-[var(--bg2)]"
            style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
          >← First</button>
          <button
            onClick={() => goTo(clampedStart - 1)}
            disabled={!canPrev}
            className="flex h-7 w-7 items-center justify-center rounded-md border transition disabled:opacity-30 hover:bg-[var(--bg2)]"
            style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        </div>

        {/* Centre label */}
        <div className="text-center">
          <div className="text-[12px] font-medium" style={{ color: 'var(--text-strong)' }}>
            {data[0]?.date} &nbsp;→&nbsp; {data[data.length - 1]?.date}
          </div>
          <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
            {clampedStart + 1}–{Math.min(clampedStart + WINDOW, allData.length)} of {allData.length} sprints
          </div>
        </div>

        {/* Next group */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => goTo(clampedStart + 1)}
            disabled={!canNext}
            className="flex h-7 w-7 items-center justify-center rounded-md border transition disabled:opacity-30 hover:bg-[var(--bg2)]"
            style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button
            onClick={() => goTo(maxStart)}
            disabled={!canNext}
            className="rounded-md border px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-30 hover:bg-[var(--bg2)]"
            style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
          >Latest →</button>
        </div>
      </div>
    )}
    </>
  )
}
