import { useState, useMemo } from 'react'

const SIDE_TABS = ['Weights', 'Gates', 'Team', 'Integrations', 'Template', 'Billing']

// Build the weight-defs list from actual result data so labels are always current.
// Falls back gracefully when result is null (no run yet).
function buildWeightDefs(result) {
  const comps = result?.components || result?.scores?.components || {}
  const keys = Object.keys(comps)
  if (keys.length === 0) return []
  return keys.map(id => {
    const c = comps[id] || {}
    return {
      id,
      label:   c.label   || id,
      def:     c.weight_delphi  ?? (1 / keys.length),
      adapted: c.weight_adapted ?? (1 / keys.length),
    }
  })
}

function WeightRow({ w, value, onChange }) {
  const pct = (value * 100).toFixed(0)
  return (
    <div className="panel-inner rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md font-mono text-[11px] font-bold"
            style={{ background: 'var(--bg2)', color: 'var(--text-muted)', border: '1px solid var(--line)' }}
          >{w.id}</span>
          <div>
            <div className="text-[13px] font-medium" style={{ color: 'var(--text-strong)' }}>{w.label}</div>
            <div className="font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>
              default {w.def.toFixed(2)} · adapted {w.adapted.toFixed(2)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number" min="0" max="1" step="0.01"
            value={value.toFixed(2)}
            onChange={e => onChange(parseFloat(e.target.value) || 0)}
            className="w-16 rounded-md border bg-transparent px-2 py-1 text-right font-mono text-[12px]"
            style={{ borderColor: 'var(--line)', color: 'var(--text)' }}
          />
          <span className="font-mono text-[11px]" style={{ color: 'var(--text-dim)' }}>= {pct}%</span>
        </div>
      </div>
      <div className="relative mt-3">
        <input
          type="range" min="0" max="1" step="0.01"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="w-full"
          style={{ accentColor: 'var(--accent)' }}
        />
        <div className="pointer-events-none absolute left-0 right-0 top-1/2 flex -translate-y-1/2 justify-between px-1">
          {[0.25, 0.5, 0.75].map(t => (
            <div key={t} className="h-2 w-px" style={{ background: 'var(--line2)', opacity: 0.6 }}/>
          ))}
        </div>
      </div>
    </div>
  )
}

function ComingSoon({ tab }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'var(--card2)' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <p className="mt-4 text-[15px] font-semibold" style={{ color: 'var(--text-strong)' }}>{tab}</p>
      <p className="mt-1 text-[13px]" style={{ color: 'var(--text-dim)' }}>Coming soon</p>
    </div>
  )
}

export default function SettingsPage({ project, result, onBack }) {
  const [tab, setTab]   = useState('Weights')

  // Derive weight defs from real result data
  const weightDefs = useMemo(() => buildWeightDefs(result), [result])
  const [vals, setVals] = useState(() => weightDefs.map(w => w.adapted))

  // Keep vals in sync if result changes (e.g. first load)
  useMemo(() => {
    if (weightDefs.length > 0) setVals(weightDefs.map(w => w.adapted))
  }, [weightDefs.length])  // only when component count changes, not every render

  const sum = vals.reduce((a, b) => a + b, 0)
  const ok  = Math.abs(sum - 1) < 0.001

  const casi = result ? Math.round((result.scores?.casi_score ?? result.casi_score ?? 0)) : null

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex shrink-0 items-center justify-between border-b px-6 py-3" style={{ borderColor: 'var(--line)' }}>
        <div>
          <h1 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-strong)' }}>
            Settings
          </h1>
          {project && (
            <span className="text-[12px]" style={{ color: 'var(--text-dim)' }}>{project.name}</span>
          )}
        </div>
        {onBack && (
          <button onClick={onBack} className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            ← Back to Dashboard
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Side nav */}
        <aside className="w-56 shrink-0 border-r p-4" style={{ borderColor: 'var(--line)', background: 'var(--bg2)' }}>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Project</div>
          <nav className="mt-2 space-y-0.5">
            {SIDE_TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[12px] font-medium transition ${tab === t ? 'bg-[var(--accent-bg)] text-accent' : 'hover:bg-[var(--card2)]'}`}
                style={{ color: tab === t ? undefined : 'var(--text-muted)' }}
              >
                {t}
                {tab === t && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                )}
              </button>
            ))}
          </nav>

        </aside>

        {/* Main content */}
        <main className="scrollbar-thin flex-1 overflow-y-auto p-8">
          {tab === 'Weights' ? (
            <div className="mx-auto max-w-3xl">
              {weightDefs.length === 0 && (
                <div className="rounded-xl border border-dashed p-6 text-center text-[13px]" style={{ borderColor: 'var(--line)', color: 'var(--text-dim)' }}>
                  Upload a test suite to see component weights.
                </div>
              )}
              {weightDefs.length > 0 && (<>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text-strong)' }}>Component weights</h2>
                    <p className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>
                      Adjust how each sub-component contributes to CASI. Weights must sum to 1.00.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setVals(weightDefs.map(w => w.def))}
                      className="rounded-md border px-3 py-1.5 text-[11px]"
                      style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
                    >Reset to default</button>
                    <button
                      onClick={() => setVals(weightDefs.map(w => w.adapted))}
                      className="rounded-md border px-3 py-1.5 text-[11px]"
                      style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}
                    >Reset to adapted</button>
                  </div>
                </div>

                {/* Sum indicator */}
                <div
                  className="mt-4 flex items-center justify-between rounded-xl border p-3"
                  style={{ borderColor: ok ? 'var(--line)' : '#f59e0b', background: 'var(--card2)', boxShadow: ok ? 'none' : '0 0 0 2px rgba(245,158,11,0.2)' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: ok ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)' }}>
                      {ok ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      )}
                    </div>
                    <span className="text-[12px]" style={{ color: 'var(--text)' }}>Total weight</span>
                    {!ok && <span className="text-[11px]" style={{ color: '#f59e0b' }}>— must equal 1.00</span>}
                  </div>
                  <span className="font-mono text-sm font-semibold" style={{ color: ok ? '#10b981' : '#f59e0b' }}>
                    {sum.toFixed(2)} / 1.00
                  </span>
                </div>

                {/* Sliders */}
                <div className="mt-4 space-y-2.5">
                  {weightDefs.map((w, i) => (
                    <WeightRow
                      key={w.id}
                      w={w}
                      value={vals[i] ?? w.adapted}
                      onChange={v => setVals(vv => vv.map((x, j) => j === i ? v : x))}
                    />
                  ))}
                </div>

                {/* Preview */}
                <div className="mt-5 flex items-center justify-between rounded-xl border p-4" style={{ borderColor: 'var(--accent-ring)', background: 'var(--accent-bg)' }}>
                  <div>
                    <div className="text-[11px] font-semibold" style={{ color: 'var(--text-strong)' }}>Preview impact</div>
                    <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {ok ? 'Re-upload to recompute CASI with new weights' : 'Fix totals to enable preview'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>CASI</span>
                    <span className="font-mono text-xl font-semibold" style={{ color: ok && casi ? '#f59e0b' : 'var(--text-dim)' }}>
                      {ok && casi ? casi : '—'}
                    </span>
                  </div>
                </div>

                {/* Read-only notice */}
                <div className="mt-6 flex items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-[12px]" style={{ borderColor: 'var(--line2)', color: 'var(--text-muted)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Weights are managed by the adaptive engine and reflect your project&apos;s actual failure patterns.
                </div>
              </>)}
            </div>
          ) : (
            <ComingSoon tab={tab}/>
          )}
        </main>
      </div>
    </div>
  )
}
