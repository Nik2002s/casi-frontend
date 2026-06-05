import { useState, useMemo } from 'react'
import { gateColor } from '../components/primitives'

// ── Gate pill ─────────────────────────────────────────────────────────────────
function GatePill({ gate }) {
  const color = gateColor(gate)
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{ background: `${color}20`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }}/>
      {gate || '—'}
    </span>
  )
}

// ── Per-row delete button with confirm step ──────────────────────────────────
function DeleteButton({ onConfirm, label = 'Delete' }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleClick = async (e) => {
    e.stopPropagation()
    if (!confirming) { setConfirming(true); return }
    setBusy(true)
    await onConfirm()
    setBusy(false)
    setConfirming(false)
  }

  return (
    <button
      onClick={handleClick}
      onBlur={() => setConfirming(false)}
      disabled={busy}
      className="flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition disabled:opacity-40"
      style={{
        borderColor: confirming ? '#ef4444' : 'var(--line)',
        color: confirming ? '#ef4444' : 'var(--text-muted)',
        background: confirming ? 'rgba(239,68,68,0.08)' : 'transparent',
      }}
      title={label}
    >
      {busy ? (
        <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      ) : (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/>
        </svg>
      )}
      {confirming ? 'Confirm' : label}
    </button>
  )
}

// ── Main RunsPage ─────────────────────────────────────────────────────────────
export default function RunsPage({
  runs = [],
  uploads = [],
  loading = false,
  currentRunId,
  project,
  onLoadRun,
  onNewUpload,
  onDeleteUpload,
  onRecompute,
  onDeleteRun,
}) {
  const [search, setSearch] = useState('')
  const [recomputing, setRecomputing] = useState(false)

  // ── Build a unified activity feed ─────────────────────────────────────────
  // When a run's upload_id matches an upload (i.e. they were created together),
  // merge them into a single 'combined' row. Manual recomputes (no upload_id)
  // appear as standalone 'run' rows. Orphaned uploads (no paired run yet) are
  // standalone 'upload' rows.
  const rows = useMemo(() => {
    // Map uploadId → run for quick lookup
    const runByUploadId = new Map()
    const standaloneRuns = []
    for (const r of runs) {
      if (r.upload_id) runByUploadId.set(String(r.upload_id), r)
      else standaloneRuns.push(r)
    }

    const items = []

    // Each upload → combined if has a paired run, else upload-only
    for (const u of uploads) {
      const pairedRun = runByUploadId.get(String(u.id))
      if (pairedRun) {
        items.push({
          kind: 'combined',
          id: u.id,
          runId: pairedRun.id,
          // Use run timestamp (computation time) as the anchor — it's always ≥ upload time
          timestamp: pairedRun.computed_at || u.uploaded_at,
          filename: u.filename,
          record_count: u.record_count,
          scores: pairedRun.scores || {},
          rawUpload: u,
          rawRun: pairedRun,
        })
      } else {
        items.push({
          kind: 'upload',
          id: u.id,
          timestamp: u.uploaded_at,
          filename: u.filename,
          record_count: u.record_count,
          accepted_vars: u.accepted_vars,
          raw: u,
        })
      }
    }

    // Manual recomputes (no upload_id) — standalone run rows
    for (const r of standaloneRuns) {
      items.push({
        kind: 'run',
        id: r.id,
        timestamp: r.computed_at,
        filename: r.filename,
        scores: r.scores || {},
        raw: r,
      })
    }

    // Sort newest first — use Date arithmetic (robust to timezone-offset differences
    // and whitespace in ISO strings that would trip up localeCompare)
    items.sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0
      return tb - ta
    })

    if (!search) return items
    const q = search.toLowerCase()
    return items.filter(it => (it.filename || '').toLowerCase().includes(q))
  }, [uploads, runs, search])

  const hasData = rows.length > 0

  const handleRecompute = async () => {
    if (!onRecompute) return
    setRecomputing(true)
    await onRecompute()
    setRecomputing(false)
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!loading && !hasData) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-8 py-16 gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'var(--card2)' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div>
          <p className="text-[15px] font-semibold" style={{ color: 'var(--text-strong)' }}>No data yet</p>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--text-dim)' }}>
            Upload your first test suite to compute a CASI score, or use the API key below to push data programmatically.
          </p>
        </div>
        <button
          onClick={onNewUpload}
          className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold"
          style={{ color: 'var(--accent-fg)' }}
        >
          Upload test suite →
        </button>
      </div>
    )
  }

  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto">
      {/* Sub-header */}
      <div className="flex shrink-0 items-center justify-between border-b px-6 py-3 sticky top-0 z-10" style={{ borderColor: 'var(--line)', background: 'var(--bg2)' }}>
        <div>
          <h1 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-strong)' }}>
            {project?.name || 'Project'}
          </h1>
          <span className="text-[12px]" style={{ color: 'var(--text-dim)' }}>
            {uploads.length} file{uploads.length !== 1 ? 's' : ''} · {runs.length} computation{runs.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-[11px]" style={{ borderColor: 'var(--line)', background: 'var(--card)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-dim)' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-40 bg-transparent outline-none"
              placeholder="Search…"
              style={{ color: 'var(--text)' }}
            />
          </div>

          {/* Recompute — visible whenever any uploads exist */}
          {uploads.length > 0 && onRecompute && (
            <button
              onClick={handleRecompute}
              disabled={recomputing}
              className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-50"
              style={{ borderColor: 'var(--line2)', color: 'var(--text-strong)', background: 'var(--card)' }}
              title="Re-run CASI on all currently stored test records"
            >
              {recomputing ? (
                <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/>
                  <polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
              )}
              {recomputing ? 'Recomputing…' : 'Recompute'}
            </button>
          )}

          <button
            onClick={onNewUpload}
            className="rounded-md bg-accent px-3 py-1.5 text-[11px] font-semibold"
            style={{ color: 'var(--accent-fg)' }}
          >
            + New Upload
          </button>
        </div>
      </div>

      <div className="p-6 space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
            Activity
          </h2>
          <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
            Newest first · click a computation to load its dashboard
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-dim)' }}>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Loading…
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border" style={{ borderColor: 'var(--line)', background: 'var(--card)' }}>
            <p className="text-[13px]" style={{ color: 'var(--text-dim)' }}>
              {search ? 'Nothing matches your search.' : 'No activity yet.'}
            </p>
          </div>
        ) : (
          <div className="panel overflow-hidden rounded-2xl">
            {/* Column headers */}
            <div
              className="grid items-center gap-3 border-b px-4 py-2.5 text-[10px] uppercase tracking-wider"
              style={{ gridTemplateColumns: '90px 170px 1fr 72px 72px 100px 110px', borderColor: 'var(--line)', color: 'var(--text-dim)' }}
            >
              <span>Type</span>
              <span>Timestamp</span>
              <span>File / Source</span>
              <span className="text-right">ASI</span>
              <span className="text-right">CASI</span>
              <span>Gate</span>
              <span className="text-right">Action</span>
            </div>

            {rows.map((it) => {
              if (it.kind === 'upload') {
                return (
                  <div
                    key={`u-${it.id}`}
                    className="grid items-center gap-3 border-b px-4 py-3 last:border-b-0"
                    style={{ gridTemplateColumns: '90px 170px 1fr 72px 72px 100px 110px', borderColor: 'var(--line)' }}
                  >
                    <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                      style={{ background: 'rgba(59,130,246,0.10)', color: '#3b82f6' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      Upload
                    </span>
                    <span className="font-mono text-[12px]" style={{ color: 'var(--text)' }}>
                      {it.timestamp ? new Date(it.timestamp).toLocaleString() : '—'}
                    </span>
                    <div className="flex min-w-0 items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      <div className="min-w-0">
                        <div className="truncate font-mono text-[12px]" style={{ color: 'var(--text)' }}>{it.filename}</div>
                        <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{it.record_count ?? 0} test cases</div>
                      </div>
                    </div>
                    <span className="text-right font-mono text-[12px]" style={{ color: 'var(--text-faint)' }}>—</span>
                    <span className="text-right font-mono text-[12px]" style={{ color: 'var(--text-faint)' }}>—</span>
                    <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>—</span>
                    <div className="flex justify-end">
                      <DeleteButton onConfirm={() => onDeleteUpload(it.id)} />
                    </div>
                  </div>
                )
              }

              // combined row — upload + its immediate computation merged into one
              if (it.kind === 'combined') {
                const isCurrent = it.runId === currentRunId
                const scores = it.scores
                const gate = scores.casi_gate || '—'
                const casi = Math.round(scores.casi_score ?? 0)
                const asi  = Math.round(scores.asi_score  ?? 0)
                return (
                  <div
                    key={`c-${it.id}`}
                    onClick={() => onLoadRun(it.rawRun)}
                    className="grid cursor-pointer items-center gap-3 border-b px-4 py-3 transition hover:bg-[var(--card2)] last:border-b-0"
                    style={{
                      gridTemplateColumns: '90px 170px 1fr 72px 72px 100px 110px',
                      borderColor: 'var(--line)',
                      background: isCurrent ? 'var(--accent-bg)' : undefined,
                    }}
                  >
                    {/* Stacked badge: Upload + Compute */}
                    <div className="flex flex-col gap-1">
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                        style={{ background: 'rgba(59,130,246,0.10)', color: '#3b82f6' }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        Upload
                      </span>
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                        style={{ background: 'rgba(16,185,129,0.10)', color: '#059669' }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                        Compute
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-mono text-[12px]" style={{ color: 'var(--text)' }}>
                        {it.timestamp ? new Date(it.timestamp).toLocaleString() : '—'}
                      </span>
                      {isCurrent && <span className="mt-0.5 text-[10px] uppercase tracking-wider text-accent">current</span>}
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      <div className="min-w-0">
                        <div className="truncate font-mono text-[12px]" style={{ color: 'var(--text)' }}>{it.filename}</div>
                        <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{it.record_count ?? 0} test cases</div>
                      </div>
                    </div>
                    <span className="text-right font-mono text-[13px]" style={{ color: 'var(--text-muted)' }}>{asi || '—'}</span>
                    <span className="text-right font-mono text-[13px] font-semibold" style={{ color: gateColor(gate) }}>{casi || '—'}</span>
                    <GatePill gate={gate}/>
                    <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                      {/* Delete upload — cascades to remove its run records too */}
                      <DeleteButton onConfirm={() => onDeleteUpload(it.id)} />
                    </div>
                  </div>
                )
              }

              // standalone run row (manual recompute — no source upload)
              const isCurrent = it.id === currentRunId
              const scores = it.scores
              const gate = scores.casi_gate || '—'
              const casi = Math.round(scores.casi_score ?? 0)
              const asi  = Math.round(scores.asi_score  ?? 0)
              return (
                <div
                  key={`r-${it.id}`}
                  onClick={() => onLoadRun(it.raw)}
                  className="grid cursor-pointer items-center gap-3 border-b px-4 py-3 transition hover:bg-[var(--card2)] last:border-b-0"
                  style={{
                    gridTemplateColumns: '90px 170px 1fr 72px 72px 100px 110px',
                    borderColor: 'var(--line)',
                    background: isCurrent ? 'var(--accent-bg)' : undefined,
                  }}
                >
                  <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ background: 'rgba(16,185,129,0.10)', color: '#059669' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    Compute
                  </span>
                  <div className="flex flex-col">
                    <span className="font-mono text-[12px]" style={{ color: 'var(--text)' }}>
                      {it.timestamp ? new Date(it.timestamp).toLocaleString() : '—'}
                    </span>
                    {isCurrent && <span className="mt-0.5 text-[10px] uppercase tracking-wider text-accent">current</span>}
                  </div>
                  <div className="flex min-w-0 items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span className="truncate font-mono text-[12px]" style={{ color: 'var(--text)' }}>{it.filename || it.id.slice(0, 8)}</span>
                  </div>
                  <span className="text-right font-mono text-[13px]" style={{ color: 'var(--text-muted)' }}>{asi || '—'}</span>
                  <span className="text-right font-mono text-[13px] font-semibold" style={{ color: gateColor(gate) }}>{casi || '—'}</span>
                  <GatePill gate={gate}/>
                  <div className="flex justify-end">
                    {onDeleteRun && <DeleteButton onConfirm={() => onDeleteRun(it.id)} />}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
          Deleting an upload removes its test cases and triggers a recompute from remaining data.
          Use <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>Recompute</span> to rebuild the score from all stored records (e.g. after the engine has been updated).
        </p>
      </div>
    </div>
  )
}
