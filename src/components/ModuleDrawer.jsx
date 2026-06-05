import { useEffect } from 'react'
import { Chip, Sparkline, compLabel } from './primitives'

// ── constants ─────────────────────────────────────────────────────────────────
const COMP_KEYS   = ['A', 'B', 'C', 'D', 'E', 'F']
const COMP_NAMES  = {
  A: 'Broken Index',
  B: 'Avg Fix Time',
  C: 'Downtime',
  D: 'Fail Ratio',
  E: 'Suite Fail',
  F: 'Variances',
}
// Delphi weights (un-normalised sum = 1.00 exactly)
const DELPHI_W    = { A: 0.22, B: 0.18, C: 0.17, D: 0.16, E: 0.14, F: 0.13 }

// ── helpers ───────────────────────────────────────────────────────────────────
const scoreColor = (v) =>
  v >= 700 ? '#10b981' : v >= 400 ? '#f59e0b' : '#ef4444'

const healthColor = (v) =>
  v >= 70 ? '#10b981' : v >= 50 ? '#f59e0b' : '#ef4444'

const pct = (v) => `${(v * 100).toFixed(1)}%`

// Derive plain-English takeaway from available data
function buildTakeaway(casi, asi, delta, isAdapted, normScores, weightsAdapted) {
  const lines = []

  if (casi == null) return ['Upload more sprints to see trend analysis here.']

  // Score level
  if (casi >= 700) {
    lines.push('✅ This module is healthy and ready to release.')
  } else if (casi >= 400) {
    lines.push('⚠️ This module is in the caution zone — release with care.')
  } else {
    lines.push('🚨 This module is blocking a Green gate. Prioritise fixing it before release.')
  }

  // Trend
  if (delta != null) {
    if (delta >= 50)  lines.push(`📈 Score improved significantly (+${delta} pts) since last sprint — keep it up.`)
    else if (delta > 0)  lines.push(`📈 Score is trending up (+${delta} pts vs last sprint).`)
    else if (delta <= -50) lines.push(`📉 Score dropped sharply (${delta} pts) — investigate what changed this sprint.`)
    else if (delta < 0)  lines.push(`📉 Score declined (${delta} pts vs last sprint) — monitor closely.`)
    else lines.push('➡️ Score is stable compared to last sprint.')
  }

  // Adaptive weights insight
  if (isAdapted && weightsAdapted && normScores) {
    const worst = COMP_KEYS.reduce((a, b) =>
      (normScores[b] ?? 50) < (normScores[a] ?? 50) ? b : a
    )
    const wAdapted = weightsAdapted[COMP_KEYS.indexOf(worst)]
    const wDelphi  = DELPHI_W[worst]
    if (wAdapted > wDelphi + 0.02) {
      lines.push(`⚡ Adaptive weights have increased the ${COMP_NAMES[worst]} weight from ${pct(wDelphi)} → ${pct(wAdapted)} because it's your worst-performing component (health: ${Math.round(normScores[worst] ?? 50)}). Fixing it will have an outsized impact on your score.`)
    } else {
      lines.push(`⚡ Adaptive weights are active. Components are weighted by your actual failure patterns, not a fixed baseline.`)
    }
  }

  // CASI vs ASI gap
  if (casi != null && asi != null) {
    const gap = casi - asi
    if (Math.abs(gap) >= 30) {
      lines.push(gap > 0
        ? `💡 CASI (${casi}) is ${gap} pts above ASI (${asi}) — your failure pattern boosts well-performing components.`
        : `💡 CASI (${casi}) is ${Math.abs(gap)} pts below ASI (${asi}) — adaptive weights are penalising your weakest components harder than the baseline.`
      )
    }
  }

  // Worst component action
  if (normScores) {
    const worst = COMP_KEYS.reduce((a, b) =>
      (normScores[b] ?? 50) < (normScores[a] ?? 50) ? b : a
    )
    if ((normScores[worst] ?? 50) < 50) {
      lines.push(`🎯 Fastest win: improve ${COMP_NAMES[worst]} (health ${Math.round(normScores[worst])} / 100) — it's dragging the score down the most.`)
    }
  }

  return lines
}

// ── main component ────────────────────────────────────────────────────────────
export default function ModuleDrawer({
  open, onClose,
  moduleName, sprintValues, asiValues, sprintIdx, sprintLabel, sprintCount,
  moduleData, onExplain, result,
}) {
  // Close on Esc
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const effectiveIdx  = sprintIdx != null ? sprintIdx : (sprintValues ? sprintValues.length - 1 : 0)
  const casi          = moduleData?.casi ?? (sprintValues ? sprintValues[effectiveIdx] : null)
  const asi           = moduleData?.asi  ?? (asiValues   ? asiValues[effectiveIdx]   : null)
  const prev          = effectiveIdx > 0 && sprintValues ? sprintValues[effectiveIdx - 1] : null
  const delta         = casi != null && prev != null ? casi - prev : null
  const isAdapted     = moduleData?.is_adapted ?? false
  const weightsAdapted= moduleData?.weights_adapted ?? null   // list[6] | null
  const normScores    = moduleData?.norm_scores ?? null        // {A..F: 0-100} | null
  const displayValues = sprintValues ? sprintValues.slice(0, effectiveIdx + 1) : []
  const displayAsi    = asiValues    ? asiValues.slice(0, effectiveIdx + 1)    : []

  // ── Fallbacks from global result.components (always present after upload) ──
  // Used when per-module sprint data is absent (runs uploaded before engine update).
  const globalComps = result?.components ?? null
  const derivedNormScores = normScores ?? (
    globalComps
      ? Object.fromEntries(COMP_KEYS.map(k => [k, globalComps[k]?.normalized ?? 50]))
      : null
  )
  const derivedWeightsAdapted = weightsAdapted ?? (
    globalComps
      ? COMP_KEYS.map(k => globalComps[k]?.weight_adapted ?? DELPHI_W[k])
      : null
  )
  // Flag so we can show a note when displaying global averages instead of module-specific data
  const usingGlobalFallback = !normScores && !!derivedNormScores

  const takeaway = buildTakeaway(casi, asi, delta, isAdapted, derivedNormScores, derivedWeightsAdapted)

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(2,6,16,0.55)', backdropFilter: 'blur(2px)' }}
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        className={`panel fixed top-0 right-0 bottom-0 z-50 flex w-[540px] flex-col rounded-none border-l shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ borderColor: 'var(--line)', boxShadow: '-12px 0 40px rgba(0,0,0,0.5)' }}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--line)' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'var(--accent-bg)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
                  {moduleName || '—'}
                </h3>
                {casi != null && (
                  <Chip tone={casi >= 700 ? 'green' : casi >= 400 ? 'amber' : 'red'}>
                    {casi >= 700 ? 'Green' : casi >= 400 ? 'Watch' : 'Critical'}
                  </Chip>
                )}
                {isAdapted && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: 'rgba(13,148,136,0.12)', color: '#0d9488' }}>
                    ⚡ Adaptive
                  </span>
                )}
              </div>
              <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
                {sprintLabel ? `Sprint: ${sprintLabel}` : 'Module'}
                {sprintCount != null && ` · sprint ${effectiveIdx + 1} of ${sprintCount}`}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--card2)]" style={{ color: 'var(--text-muted)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </header>

        {/* Scrollable content */}
        <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5">

          {/* ── 1. Score comparison ───────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            {/* CASI */}
            <div className="panel-inner rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>CASI Score</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-3xl font-semibold" style={{ color: scoreColor(casi ?? 0) }}>
                  {casi ?? '—'}
                </span>
                {delta != null && (
                  <span className="font-mono text-[12px] font-medium" style={{ color: delta > 0 ? '#059669' : delta < 0 ? '#dc2626' : 'var(--text-dim)' }}>
                    {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} {Math.abs(delta)}
                  </span>
                )}
              </div>
              <div className="mt-1 text-[11px]" style={{ color: 'var(--text-dim)' }}>
                {delta != null ? `vs ${sprintValues?.[effectiveIdx - 1] ?? '—'} last sprint` : 'First sprint'}
              </div>
            </div>

            {/* ASI */}
            <div className="panel-inner rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>ASI Baseline</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-3xl font-semibold" style={{ color: 'var(--text-muted)' }}>
                  {asi ?? '—'}
                </span>
                {casi != null && asi != null && (
                  <span className="font-mono text-[11px]" style={{ color: (casi - asi) >= 0 ? '#059669' : '#dc2626' }}>
                    {casi - asi >= 0 ? '+' : ''}{casi - asi} vs CASI
                  </span>
                )}
              </div>
              <div className="mt-1 text-[11px]" style={{ color: 'var(--text-dim)' }}>
                Fixed Delphi weights · no adaptation
              </div>
            </div>
          </div>

          {/* ── 2. Sprint trend ───────────────────────────────────────────── */}
          <div className="panel-inner rounded-xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[11px] font-semibold" style={{ color: 'var(--text-strong)' }}>Score History</div>
              <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text-dim)' }}>
                <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-4 rounded-full" style={{ background: scoreColor(casi ?? 0) }}/> CASI</span>
                <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 rounded-full" style={{ background: 'var(--text-dim)' }}/> ASI</span>
              </div>
            </div>
            {displayValues.length > 1 ? (
              <div className="relative">
                <Sparkline values={displayValues} stroke={scoreColor(casi ?? 0)} width={460} height={48}/>
                {/* ASI overlay sparkline */}
                {displayAsi.length > 1 && (
                  <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.5 }}>
                    <Sparkline values={displayAsi} stroke="var(--text-dim)" width={460} height={48}/>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-[12px]" style={{ color: 'var(--text-dim)' }}>First sprint — no trend yet</span>
            )}
            {/* Sprint-by-sprint values */}
            {displayValues.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                {displayValues.map((v, i) => (
                  <div key={i} className="text-[10px]" style={{ color: i === effectiveIdx ? 'var(--text-strong)' : 'var(--text-dim)' }}>
                    <span className="font-mono font-semibold" style={{ color: i === effectiveIdx ? scoreColor(v) : undefined }}>{v}</span>
                    {displayAsi[i] != null && <span className="ml-1 opacity-60">/ {displayAsi[i]}</span>}
                    {i === effectiveIdx && <span className="ml-1 font-medium"> ← now</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── 3. Adaptive weights breakdown ─────────────────────────────── */}
          <div className="panel-inner rounded-xl p-4">
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold" style={{ color: 'var(--text-strong)' }}>
                {isAdapted ? '⚡ Adaptive Weight Breakdown' : 'Component Breakdown (Delphi weights)'}
              </span>
              {isAdapted && (
                <span className="rounded-full px-2 py-0.5 text-[10px]"
                  style={{ background: 'rgba(13,148,136,0.10)', color: '#0d9488' }}>
                  calibrated from your data
                </span>
              )}
              {usingGlobalFallback && (
                <span className="rounded-full px-2 py-0.5 text-[10px]"
                  style={{ background: 'rgba(245,158,11,0.10)', color: '#d97706' }}>
                  ⚠ global avg · re-upload for module-level detail
                </span>
              )}
            </div>

            {derivedNormScores ? (
              <>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr style={{ color: 'var(--text-dim)' }}>
                      <th className="pb-1.5 text-left font-medium">Component</th>
                      <th className="pb-1.5 text-right font-medium">Health</th>
                      <th className="pb-1.5 text-right font-medium">Delphi Wt</th>
                      {isAdapted && derivedWeightsAdapted && <th className="pb-1.5 text-right font-medium">Adapted Wt</th>}
                      {isAdapted && derivedWeightsAdapted && <th className="pb-1.5 text-right font-medium">Shift</th>}
                      <th className="pb-1.5 text-right font-medium">Contribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMP_KEYS.map((k, i) => {
                      const health   = derivedNormScores[k] ?? 50
                      const delphi   = DELPHI_W[k]
                      const adapted  = (isAdapted && derivedWeightsAdapted) ? derivedWeightsAdapted[i] : delphi
                      const shift    = adapted - delphi
                      const contrib  = adapted * health
                      const isWorst  = COMP_KEYS.every(x => (derivedNormScores[x] ?? 50) >= (derivedNormScores[k] ?? 50))
                      return (
                        <tr key={k} style={{
                          background: isWorst && health < 50 ? 'rgba(239,68,68,0.05)' : undefined,
                          borderTop: '1px solid var(--line)',
                        }}>
                          <td className="py-1.5 font-medium" style={{ color: 'var(--text)' }}>
                            <span className="font-mono text-[10px] mr-1.5" style={{ color: 'var(--text-dim)' }}>{k}</span>
                            {COMP_NAMES[k]}
                          </td>
                          <td className="py-1.5 text-right font-mono font-semibold" style={{ color: healthColor(health) }}>
                            {Math.round(health)}
                          </td>
                          <td className="py-1.5 text-right font-mono" style={{ color: 'var(--text-muted)' }}>
                            {pct(delphi)}
                          </td>
                          {isAdapted && derivedWeightsAdapted && (
                            <td className="py-1.5 text-right font-mono font-semibold" style={{ color: adapted > delphi + 0.015 ? '#f59e0b' : adapted < delphi - 0.015 ? '#10b981' : 'var(--text-muted)' }}>
                              {pct(adapted)}
                            </td>
                          )}
                          {isAdapted && derivedWeightsAdapted && (
                            <td className="py-1.5 text-right font-mono text-[10px]" style={{ color: shift > 0.015 ? '#ef4444' : shift < -0.015 ? '#10b981' : 'var(--text-dim)' }}>
                              {shift > 0.001 ? `+${pct(shift)}` : shift < -0.001 ? pct(shift) : '≈'}
                            </td>
                          )}
                          <td className="py-1.5 text-right font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {Math.round(contrib)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                <div className="mt-2 text-[10px] leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                  {isAdapted && derivedWeightsAdapted
                    ? 'Adapted Wt = weight CASI actually used · Shift = change from Delphi baseline · Contribution = weight × health'
                    : 'Delphi Wt = fixed expert-consensus weights · Contribution = weight × health · Scores < 50 are at risk'}
                </div>
              </>
            ) : (
              <p className="text-[12px]" style={{ color: 'var(--text-dim)' }}>
                No component data available. Upload your Excel file to see the full breakdown.
              </p>
            )}
          </div>

          {/* ── 4. Pass / Fail counts + Score Formula ────────────────────── */}
          {(moduleData?.tc_count != null || derivedNormScores) && (
            <div className="panel-inner rounded-xl p-4 space-y-3">
              <div className="text-[11px] font-semibold" style={{ color: 'var(--text-strong)' }}>Score Formula — this sprint</div>

              {/* Pass/fail bar */}
              {moduleData?.tc_count != null && (() => {
                const total = moduleData.tc_count
                const fail  = moduleData.n_fail ?? 0
                const pass  = total - fail
                const passPct = total > 0 ? Math.round((pass / total) * 100) : 0
                const failPct = 100 - passPct
                return (
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[10px]" style={{ color: 'var(--text-dim)' }}>
                      <span>Test case results</span>
                      <span className="font-mono">{total} total</span>
                    </div>
                    <div className="flex h-5 overflow-hidden rounded-md">
                      <div className="flex items-center justify-center text-[9px] font-bold text-white transition-all"
                        style={{ width: `${passPct}%`, background: '#10b981', minWidth: pass > 0 ? 24 : 0 }}>
                        {pass > 0 && `✓ ${pass}`}
                      </div>
                      <div className="flex items-center justify-center text-[9px] font-bold text-white transition-all"
                        style={{ width: `${failPct}%`, background: '#ef4444', minWidth: fail > 0 ? 24 : 0 }}>
                        {fail > 0 && `✗ ${fail}`}
                      </div>
                    </div>
                    <div className="mt-1 flex gap-4 text-[10px]" style={{ color: 'var(--text-dim)' }}>
                      <span><span style={{ color: '#10b981' }}>✓</span> {pass} pass ({passPct}%)</span>
                      <span><span style={{ color: '#ef4444' }}>✗</span> {fail} fail ({failPct}%)</span>
                    </div>
                  </div>
                )
              })()}

              {/* CASI formula step-by-step */}
              {derivedNormScores && derivedWeightsAdapted && (() => {
                const weights = derivedWeightsAdapted
                const totalContrib = COMP_KEYS.reduce((s, k, i) => s + (derivedNormScores[k] ?? 50) * weights[i], 0)
                const formulaCasi  = Math.round(totalContrib * 9.99)
                return (
                  <div className="rounded-lg px-3 py-2.5 text-[10px] font-mono space-y-0.5"
                    style={{ background: 'var(--bg2)', border: '1px solid var(--line)', color: 'var(--text-dim)' }}>
                    <div className="mb-1.5 text-[10px] font-sans font-semibold" style={{ color: 'var(--text-strong)' }}>
                      CASI = Σ(health × weight) × 9.99
                    </div>
                    {COMP_KEYS.map((k, i) => {
                      const h = derivedNormScores[k] ?? 50
                      const w = weights[i]
                      const c = h * w
                      return (
                        <div key={k} className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                          <span style={{ color: 'var(--text-dim)', minWidth: 14 }}>{k}</span>
                          <span>{h.toFixed(1)}</span>
                          <span style={{ opacity: 0.5 }}>×</span>
                          <span>{(w * 100).toFixed(1)}%</span>
                          <span style={{ opacity: 0.5 }}>=</span>
                          <span style={{ color: 'var(--text)' }}>{c.toFixed(1)}</span>
                        </div>
                      )
                    })}
                    <div className="mt-1.5 border-t pt-1.5" style={{ borderColor: 'var(--line)' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Σ = {totalContrib.toFixed(1)}</span>
                      <span style={{ opacity: 0.5 }}> × 9.99 = </span>
                      <span className="font-semibold" style={{ color: casi != null ? (casi >= 700 ? '#10b981' : casi >= 400 ? '#f59e0b' : '#ef4444') : 'var(--text)' }}>
                        {formulaCasi}
                      </span>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* ── 5. Takeaway ───────────────────────────────────────────────── */}
          <div className="rounded-xl border p-4" style={{ borderColor: 'var(--line)', background: 'var(--card2)' }}>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-strong)' }}>
              Takeaway
            </div>
            <ul className="space-y-1.5">
              {takeaway.map((line, i) => (
                <li key={i} className="text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{line}</li>
              ))}
            </ul>
          </div>

        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between border-t px-5 py-3" style={{ borderColor: 'var(--line)' }}>
          <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
            {isAdapted ? '⚡ Adaptive weights active' : `Warm-up: ${effectiveIdx + 1} / 5 sprints`}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-md border px-3 py-1.5 text-[11px] font-medium" style={{ borderColor: 'var(--line)', color: 'var(--text-muted)' }}>
              Close
            </button>
            <button
              onClick={() => {
                const trend = displayValues.length > 1
                  ? `trending ${displayValues[displayValues.length - 1] > displayValues[0] ? 'up' : 'down'} from ${displayValues[0]} to ${displayValues[displayValues.length - 1]}`
                  : `at ${casi}`
                const adaptedNote = isAdapted ? ' Adaptive weights are active.' : ' Still in warm-up (Delphi weights used).'
                const prompt = `Analyse the CASI score of ${casi} (ASI baseline: ${asi}) for the "${moduleName}" module in ${sprintLabel || 'this sprint'}. The score is ${trend}.${adaptedNote} What is causing this score and what should the team prioritise fixing?`
                onExplain?.(prompt)
              }}
              className="rounded-md bg-accent px-3 py-1.5 text-[11px] font-semibold"
              style={{ color: 'var(--accent-fg)' }}
            >
              Explain with AI
            </button>
          </div>
        </footer>
      </aside>
    </>
  )
}
