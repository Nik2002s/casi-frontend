// CASI RadarChart — dual polygon (default/adapted), ported from design
import { FALLBACK_COMPONENT_LABELS } from './primitives'

export default function RadarChart({ components = {}, theme = 'dark' }) {
  // Keys come from actual data so the chart works with any number of components
  const COMPONENTS = Object.keys(components).length > 0 ? Object.keys(components) : ['A','B','C','D','E','F']
  const cx = 140, cy = 140, rMax = 95, axes = COMPONENTS.length
  const polar = (i, r) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / axes
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  }
  const ringPath = (r) =>
    COMPONENTS.map((_, i) => polar(i, rMax * r)).map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'

  // Normalise component values to 0-1 range from norm values (0-100)
  const norm = (key) => {
    const v = components[key]
    if (!v) return 0.5
    return Math.max(0, Math.min(1, (v.norm ?? 50) / 100))
  }

  const shapePath = (fn) =>
    COMPONENTS.map((k, i) => polar(i, rMax * fn(k))).map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'

  const grid     = theme === 'dark' ? '#1c2742' : '#e5e7eb'
  const dStroke  = theme === 'dark' ? '#64748b' : '#94a3b8'
  const dFill    = theme === 'dark' ? 'rgba(100,116,139,0.08)' : 'rgba(148,163,184,0.12)'
  const labelId  = theme === 'dark' ? '#cbd5e1' : '#1e293b'
  const dotStroke = theme === 'dark' ? '#0f1629' : '#ffffff'

  // Delphi weights as "default" polygon (fixed, not adaptive)
  const delphiNorm = { A: 0.65, B: 0.55, C: 0.70, D: 0.68, E: 0.52, F: 0.62 }

  return (
    <svg viewBox="0 0 280 280" className="w-full">
      {[0.25, 0.5, 0.75, 1].map(r => <path key={r} d={ringPath(r)} fill="none" stroke={grid} strokeWidth="1"/>)}
      {COMPONENTS.map((_, i) => { const p = polar(i, rMax); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={grid} strokeWidth="1"/> })}
      {/* Default (dashed) */}
      <path d={shapePath(k => delphiNorm[k] || 0.5)} fill={dFill} stroke={dStroke} strokeWidth="1.25" strokeDasharray="3 3"/>
      {/* Adapted (solid accent) */}
      <path d={shapePath(norm)} fill="var(--accent)" fillOpacity={theme === 'dark' ? 0.2 : 0.18} stroke="var(--accent)" strokeWidth="1.75"/>
      {COMPONENTS.map((k, i) => {
        const p = polar(i, rMax * norm(k)), lp = polar(i, rMax + 18)
        const label = components[k]?.label || FALLBACK_COMPONENT_LABELS[k] || k
        const words = label.split(' ')
        const isTwoLine = words.length > 1
        return (
          <g key={k}>
            <circle cx={p.x} cy={p.y} r="3" fill="var(--accent)" stroke={dotStroke} strokeWidth="1.5"/>
            {isTwoLine ? (
              <>
                <text x={lp.x} y={lp.y - 4}  textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="600" fill={labelId}>{words[0]}</text>
                <text x={lp.x} y={lp.y + 7}  textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="600" fill={labelId}>{words.slice(1).join(' ')}</text>
              </>
            ) : (
              <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="600" fill={labelId}>{label}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export function RadarLegend({ theme = 'dark' }) {
  const border = theme === 'dark' ? '#64748b' : '#94a3b8'
  const fill   = theme === 'dark' ? 'rgba(100,116,139,0.2)' : 'rgba(148,163,184,0.2)'
  return (
    <div className="flex items-center gap-4 text-[11px]">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-3 rounded-sm border" style={{ borderColor: border, background: fill }}/>
        <span style={{ color: 'var(--text-muted)' }}>Default</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-3 rounded-sm" style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)' }}/>
        <span style={{ color: 'var(--text)' }}>Adapted</span>
      </div>
    </div>
  )
}
