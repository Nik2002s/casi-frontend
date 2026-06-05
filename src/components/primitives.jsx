// CASI shared primitive components — ported from design handoff

// Built-in fallback labels for the original 6 CASI components.
// Used when reading historical runs that were stored before the backend
// started emitting `label` on each component (older `result` JSON has only
// {raw, normalized, weight_*}).  New runs override these via the data.
export const FALLBACK_COMPONENT_LABELS = {
  A: 'Broken Index',
  B: 'Avg Fix Time',
  C: 'Downtime',
  D: 'Fail Ratio',
  E: 'Suite Fail',
  F: 'Variances',
}

/**
 * Resolve a human-readable label for component key (A-F).
 * Reads from result.components[key].label — set by the backend engine.
 * Falls back to the built-in label map, then to the key itself.
 *
 * Usage:  compLabel(result, 'A')  →  "Broken Index"
 */
export const compLabel = (result, key) =>
  result?.components?.[key]?.label ?? FALLBACK_COMPONENT_LABELS[key] ?? key

/**
 * Build a full { key → label } map from a result object.
 * Useful when you need to iterate all components.
 *
 * Usage:  const labels = compLabels(result)  →  { A: 'Broken Index', … }
 */
export const compLabels = (result) => {
  const comps = result?.components || {}
  const out = {}
  for (const k of Object.keys(comps)) {
    out[k] = comps[k]?.label ?? FALLBACK_COMPONENT_LABELS[k] ?? k
  }
  return out
}

export const gateColor = (g) =>
  g === 'Green' ? '#10B981' : g === 'Yellow' ? '#F59E0B' : '#EF4444'

export const gateTone = (g) =>
  g === 'Green' ? 'green' : g === 'Yellow' ? 'amber' : 'red'

export const Chip = ({ tone = 'slate', children, className = '' }) => {
  // Use slightly darker shades that read well on BOTH dark cards and white backgrounds
  const tones = {
    slate:  { cls: 'bg-slate-500/10 ring-slate-500/20', color: 'var(--text-muted)' },
    green:  { cls: 'bg-emerald-500/10 ring-emerald-500/25', color: '#059669' },
    amber:  { cls: 'bg-amber-500/10 ring-amber-500/25', color: '#d97706' },
    red:    { cls: 'bg-red-500/10 ring-red-500/25', color: '#dc2626' },
    blue:   { cls: 'ring-[var(--accent-ring)]', color: 'var(--accent)', bg: 'var(--accent-bg)' },
  }
  const t = tones[tone] ?? tones.slate
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset ${t.cls} ${className}`}
      style={{ color: t.color, background: t.bg }}
    >
      {children}
    </span>
  )
}

export const Panel = ({ title, subtitle, right, children, className = '', padded = true }) => (
  <div className={`panel rounded-2xl ${className}`}>
    {(title || right) && (
      <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--line)' }}>
        <div>
          <h3 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-strong)' }}>{title}</h3>
          {subtitle && <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-dim)' }}>{subtitle}</p>}
        </div>
        {right}
      </div>
    )}
    <div className={padded ? 'p-6' : ''}>{children}</div>
  </div>
)

export const ThemeToggleBtn = ({ theme, onToggle }) => (
  <button
    onClick={onToggle}
    className="flex h-7 w-7 items-center justify-center rounded-md border"
    style={{ borderColor: 'var(--line)', background: 'var(--card)', color: 'var(--text-muted)' }}
  >
    {theme === 'dark' ? (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
      </svg>
    ) : (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    )}
  </button>
)

export const Sparkline = ({ values = [], stroke, width = 80, height = 22 }) => {
  if (!values || values.length < 2) return null
  const min = Math.min(...values), max = Math.max(...values)
  const range = max - min || 1
  const step = width / (values.length - 1)
  const points = values.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(' ')
  return (
    <svg width={width} height={height} className="overflow-visible" style={{ color: stroke || 'var(--accent)' }}>
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  )
}
