import { useState, useEffect } from 'react'
import { Chip, FALLBACK_COMPONENT_LABELS } from './primitives'

// Per-component metadata: formula, unit, direction, bounds
const COMP_META = {
  A: {
    unit: 'ratio',
    name: 'Broken Index',
    formula: 'pass→fail transitions ÷ total test cases',
    detail: 'Counts how many test cases flipped from PASS to FAIL in this sprint. A score of 0 means no new breaks were introduced; 1 means every TC transitioned to failure.',
    bounds: '0 (perfect) → 1 (all broken)',
    dir: 'lower raw = healthier',
    normalise: 'health = (1 − raw) × 100',
  },
  B: {
    unit: 'days',
    name: 'Avg Fix Time',
    formula: 'mean days open for currently-failing test cases',
    detail: 'Calculates the average number of days that each failing TC has been in a FAIL state. Long-open failures drag this metric down.',
    bounds: '0 days (all fixed same day) → 180 days (cap)',
    dir: 'lower raw = healthier',
    normalise: 'health = (1 − raw/180) × 100',
  },
  C: {
    unit: 'days/TC',
    name: 'Downtime',
    formula: 'total failing-days across all TCs ÷ TC count',
    detail: 'Sums up every day each TC has been in a failing state and divides by the total number of test cases. Reflects overall "broken time" accumulated by the suite.',
    bounds: '0 → 180 days/TC (cap)',
    dir: 'lower raw = healthier',
    normalise: 'health = (1 − raw/180) × 100',
  },
  D: {
    unit: '%',
    name: 'Fail Ratio',
    formula: 'failing TCs ÷ total TCs × 100',
    detail: 'The percentage of test cases currently in a failing state. If 7 of 65 TCs are failing, Fail Ratio = 10.8%.',
    bounds: '0% (all pass) → 100% (all fail)',
    dir: 'lower raw = healthier',
    normalise: 'health = (1 − raw/100) × 100',
  },
  E: {
    unit: 'avg score',
    name: 'Suite Fail',
    formula: 'avg(0 per passing suite · 100 per failing suite)',
    detail: 'Each test suite scores 0 if fully green or 100 if any TC inside it fails. The raw value is the average of those per-suite scores across all suites — so 28.6 means roughly 28.6% of suites had at least one failure.',
    bounds: '0 (all suites pass) → 100 (all suites fail)',
    dir: 'lower raw = healthier',
    normalise: 'health = (1 − raw/100) × 100',
  },
  F: {
    unit: '%',
    name: 'Variances',
    formula: 'variance-covered failures ÷ all failures × 100',
    detail: 'The proportion of failing TCs that are covered by an active variance (waiver). Higher means more failures have a formal acknowledgement. Note: this is the only component where higher raw is healthier.',
    bounds: '0% (no waivers) → 100% (all failures waiverred)',
    dir: 'higher raw = healthier',
    normalise: 'health = raw (directly)',
  },
}

// ── Component detail drawer ──────────────────────────────────────────────────
function ComponentDetailDrawer({ open, onClose, compKey, comp }) {
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!compKey) return null
  const meta  = COMP_META[compKey] || { name: compKey, formula: '—', detail: '—', unit: 'raw', bounds: '—', dir: '—', normalise: '—' }
  const c     = comp || {}
  const val   = c.norm ?? c.normalized ?? 50
  const raw   = c.raw ?? 0
  const dw    = c.weight_delphi  != null ? (c.weight_delphi  * 100).toFixed(1)  : '—'
  const aw    = c.weight_adapted != null ? (c.weight_adapted * 100).toFixed(1)  : dw
  const awNum = c.weight_adapted ?? c.weight_delphi ?? 0
  const dwNum = c.weight_delphi ?? 0
  const shift = awNum - dwNum
  const barColor = val >= 70 ? '#10b981' : val >= 50 ? '#f59e0b' : '#ef4444'
  const tone  = val >= 70 ? 'green' : val >= 50 ? 'amber' : 'red'
  const label = tone === 'green' ? 'OK' : tone === 'amber' ? 'WATCH' : 'RISK'

  // Contribution to CASI score
  const contrib = awNum * val   // weight × health (pre-scaling)
  const casiContrib = Math.round(contrib * 9.99)

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40" style={{ background: 'rgba(2,6,16,0.55)', backdropFilter: 'blur(2px)' }} onClick={onClose}/>
      )}
      <aside
        className={`panel fixed top-0 right-0 bottom-0 z-50 flex w-[480px] flex-col rounded-none border-l shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ borderColor: 'var(--line)', boxShadow: '-12px 0 40px rgba(0,0,0,0.5)' }}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--line)' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg font-mono text-sm font-bold"
              style={{ background: `${barColor}22`, color: barColor }}>
              {compKey}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>{meta.name}</h3>
                <Chip tone={tone}>{label}</Chip>
              </div>
              <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>Component {compKey} · health {val.toFixed(1)} / 100</div>
            </div>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--card2)]" style={{ color: 'var(--text-muted)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </header>

        {/* Content */}
        <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5">

          {/* Health bar */}
          <div className="panel-inner rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold" style={{ color: 'var(--text-strong)' }}>Health Score</span>
              <span className="font-mono text-2xl font-bold" style={{ color: barColor }}>{val.toFixed(1)}<span className="text-sm font-normal">/100</span></span>
            </div>
            <div className="h-3 overflow-hidden rounded-full" style={{ background: 'var(--line)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${val}%`, background: barColor }}/>
            </div>
            <div className="mt-1.5 text-[10px]" style={{ color: 'var(--text-dim)' }}>OK ≥70 · Watch 50–69 · Risk &lt;50</div>
          </div>

          {/* What it measures */}
          <div className="panel-inner rounded-xl p-4 space-y-2">
            <div className="text-[11px] font-semibold" style={{ color: 'var(--text-strong)' }}>What it measures</div>
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{meta.detail}</p>
          </div>

          {/* Formula */}
          <div className="panel-inner rounded-xl p-4 space-y-3">
            <div className="text-[11px] font-semibold" style={{ color: 'var(--text-strong)' }}>Formula &amp; Calculation</div>
            <div className="rounded-lg px-3 py-2 text-[11px] font-mono" style={{ background: 'var(--bg2)', border: '1px solid var(--line)', color: 'var(--text-muted)' }}>
              {meta.formula}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg px-3 py-2.5" style={{ background: 'var(--card2)' }}>
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Raw value</div>
                <div className="font-mono font-semibold" style={{ color: 'var(--text-strong)' }}>{raw.toFixed(3)} <span className="font-normal text-[10px]" style={{ color: 'var(--text-dim)' }}>{meta.unit}</span></div>
                <div className="mt-0.5 text-[10px]" style={{ color: 'var(--text-dim)' }}>{meta.bounds}</div>
              </div>
              <div className="rounded-lg px-3 py-2.5" style={{ background: 'var(--card2)' }}>
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Normalised</div>
                <div className="font-mono font-semibold" style={{ color: barColor }}>{val.toFixed(1)} / 100</div>
                <div className="mt-0.5 text-[10px] font-mono" style={{ color: 'var(--text-dim)' }}>{meta.normalise}</div>
              </div>
            </div>
            <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>Direction: {meta.dir}</div>
          </div>

          {/* Weight in score */}
          <div className="panel-inner rounded-xl p-4 space-y-2">
            <div className="text-[11px] font-semibold" style={{ color: 'var(--text-strong)' }}>Weight in CASI Score</div>
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              {[
                { label: 'Delphi (fixed)', value: `${dw}%`, color: 'var(--text-muted)' },
                { label: 'Adapted (this run)', value: `${aw}%`, color: shift > 0.005 ? '#f97316' : shift < -0.005 ? '#0d9488' : 'var(--text-muted)' },
                { label: 'Shift', value: shift !== 0 ? `${shift > 0 ? '+' : ''}${(shift * 100).toFixed(1)}pp` : '≈ same', color: shift > 0.005 ? '#f97316' : shift < -0.005 ? '#0d9488' : 'var(--text-dim)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg px-2 py-2.5" style={{ background: 'var(--card2)' }}>
                  <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>{label}</div>
                  <div className="font-mono font-semibold" style={{ color }}>{value}</div>
                </div>
              ))}
            </div>
            <div className="rounded-lg px-3 py-2.5 text-[11px]" style={{ background: 'var(--card2)' }}>
              <div className="text-[10px] mb-0.5" style={{ color: 'var(--text-dim)' }}>CASI contribution (this component)</div>
              <div className="font-mono" style={{ color: 'var(--text-strong)' }}>
                {val.toFixed(1)} × {aw}% = <span style={{ color: barColor }}>{Math.round(val * awNum).toFixed(1)}</span>
                <span className="ml-2 text-[10px]" style={{ color: 'var(--text-dim)' }}>× 9.99 ≈ +{casiContrib} pts</span>
              </div>
            </div>
            {shift > 0.005 && (
              <p className="text-[10px]" style={{ color: '#f97316' }}>↑ Weight increased vs Delphi — this component is under more scrutiny because it's performing worse than baseline.</p>
            )}
            {shift < -0.005 && (
              <p className="text-[10px]" style={{ color: '#0d9488' }}>↓ Weight decreased vs Delphi — this component is doing well so adaptive weighting de-prioritises it.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t px-5 py-3 flex justify-end" style={{ borderColor: 'var(--line)' }}>
          <button onClick={onClose} className="rounded-md border px-4 py-1.5 text-[12px] font-medium" style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}>
            Close
          </button>
        </footer>
      </aside>
    </>
  )
}

// ── Main HealthTiles ─────────────────────────────────────────────────────────
export default function HealthTiles({ components = {} }) {
  const [drawerKey, setDrawerKey] = useState(null)

  const keys = Object.keys(components).length > 0 ? Object.keys(components) : ['A','B','C','D','E','F']

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {keys.map(k => {
          const c    = components[k] || {}
          const val  = c.norm ?? c.normalized ?? 50
          const tone = val >= 70 ? 'green' : val >= 50 ? 'amber' : 'red'
          const bar  = val >= 70 ? '#10b981' : val >= 50 ? '#f59e0b' : '#ef4444'
          const label = tone === 'green' ? 'OK' : tone === 'amber' ? 'WATCH' : 'RISK'
          const meta  = COMP_META[k] || { unit: 'raw', formula: '—', name: k }

          return (
            <div key={k} className="panel-inner rounded-lg p-3 cursor-pointer group hover:ring-1 transition"
              style={{ '--tw-ring-color': 'var(--accent-ring)' }}
              onClick={() => setDrawerKey(k)}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold" style={{ color:'var(--text)' }}>
                  {c.label || FALLBACK_COMPONENT_LABELS[k] || k}
                </span>
                <Chip tone={tone}>{label}</Chip>
              </div>

              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-mono text-lg font-semibold" style={{ color:'var(--text-strong)' }}>
                  {val.toFixed(1)}%
                </span>
                <span className="font-mono text-[10px]" style={{ color:'var(--text-dim)' }}>
                  {(c.raw ?? 0).toFixed(1)} <span style={{ opacity: 0.7 }}>{meta.unit}</span>
                </span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background:'var(--line)' }}>
                <div className="h-full rounded-full transition-all" style={{ width:`${val}%`, background: bar }}/>
              </div>

              <div className="mt-2 text-[10px] opacity-0 group-hover:opacity-100 transition" style={{ color: 'var(--accent)' }}>
                Details →
              </div>
            </div>
          )
        })}
      </div>

      <ComponentDetailDrawer
        open={drawerKey != null}
        onClose={() => setDrawerKey(null)}
        compKey={drawerKey}
        comp={drawerKey ? components[drawerKey] : null}
      />
    </>
  )
}
