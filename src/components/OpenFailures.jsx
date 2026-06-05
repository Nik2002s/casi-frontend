import { useState } from 'react'
import { Chip } from './primitives'

const PAGE = 10

export default function OpenFailures({ failures = [] }) {
  const [expanded, setExpanded] = useState(false)

  const tone = (p) => p === 'Critical' ? 'red' : p === 'High' ? 'amber' : 'slate'
  const rail = (p) => p === 'Critical' ? '#ef4444' : p === 'High' ? '#f59e0b' : '#94a3b8'

  const crit = failures.filter(f => f.priority === 'Critical').length
  const high = failures.filter(f => f.priority === 'High').length
  const med  = failures.filter(f => !['Critical','High'].includes(f.priority)).length

  const insightMsg = failures.length === 0
    ? null
    : crit > 0
      ? `${crit} critical failure${crit > 1 ? 's are' : ' is'} actively blocking your Green gate. Resolving them has the highest score impact.`
      : high > 0
        ? `No critical failures — good. The ${high} high-priority item${high > 1 ? 's' : ''} are the next biggest drag on your score.`
        : `All open items are medium priority. Your gate is limited by other factors — check the Diagnostic for the biggest levers.`

  const visible = expanded ? failures : failures.slice(0, PAGE)
  const hasMore = failures.length > PAGE

  return (
    <div className="flex flex-col">
      {insightMsg && (
        <div className="mb-3 rounded-lg px-3 py-2 text-[11px] leading-relaxed" style={{ background:'var(--card2)', color:'var(--text-muted)', borderLeft:`3px solid ${crit > 0 ? '#ef4444' : high > 0 ? '#f59e0b' : '#94a3b8'}` }}>
          <span className="font-semibold" style={{ color: crit > 0 ? '#ef4444' : high > 0 ? '#f59e0b' : 'var(--text-muted)' }}>Score impact · </span>
          {insightMsg}
        </div>
      )}

      {/* Summary bar */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xl font-semibold" style={{ color:'var(--text-strong)' }}>{failures.length}</span>
          <span className="text-[11px]" style={{ color:'var(--text-muted)' }}>open</span>
        </div>
        <div className="h-3 w-px" style={{ background:'var(--line)' }}/>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-red-500"/><span className="font-mono" style={{ color:'var(--text)' }}>{crit}</span><span style={{ color:'var(--text-dim)' }}>crit</span></span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-500"/><span className="font-mono" style={{ color:'var(--text)' }}>{high}</span><span style={{ color:'var(--text-dim)' }}>high</span></span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-slate-400"/><span className="font-mono" style={{ color:'var(--text)' }}>{med}</span><span style={{ color:'var(--text-dim)' }}>med</span></span>
        </div>
      </div>

      {/* Failure rows */}
      <div className="space-y-0.5">
        {failures.length === 0 && (
          <div className="flex items-center justify-center py-8 text-[13px]" style={{ color:'var(--text-dim)' }}>No open failures 🎉</div>
        )}
        {visible.map((f, i) => (
          <div key={i} className="group flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-[var(--card2)]">
            <div className="mt-1 h-10 w-0.5 shrink-0 rounded-full" style={{ background: rail(f.priority) }}/>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px]" style={{ color:'var(--text-dim)' }}>{f.tc_id}</span>
                <span className="text-[10px]" style={{ color:'var(--text-faint)' }}>·</span>
                <span className="text-[10px]" style={{ color:'var(--text-dim)' }}>{f.module}</span>
              </div>
              <div className="mt-0.5 truncate text-[13px] font-medium" style={{ color:'var(--text)' }}>{f.name}</div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Chip tone={tone(f.priority)}>{f.priority}</Chip>
              <span className="font-mono text-[10px]" style={{ color:'var(--text-dim)' }}>{f.days_open}d open</span>
            </div>
          </div>
        ))}
      </div>

      {/* See more / collapse */}
      {hasMore && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border py-2 text-[12px] font-medium transition hover:bg-[var(--card2)]"
          style={{ borderColor:'var(--line)', color:'var(--accent)' }}
        >
          {expanded ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
              Show less
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              See {failures.length - PAGE} more failure{failures.length - PAGE !== 1 ? 's' : ''}
            </>
          )}
        </button>
      )}
    </div>
  )
}
