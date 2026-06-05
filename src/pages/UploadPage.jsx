import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Chip } from '../components/primitives'
import { apiFetch } from '../lib/api'

// Template is a static asset committed to frontend/public/ and served by
// Firebase Hosting (same origin as the app — no CORS, no backend needed).
const TEMPLATE_URL = '/CASI_Template.xlsx'

// ── Instruction card ──────────────────────────────────────────────────────────
const EXEC_COLS = [
  { name: 'TC_RUN_ID',       desc: 'Unique ID for this run of this test case.  e.g. RUN-001' },
  { name: 'SUITE_RUN_ID',    desc: 'Groups TCs into one suite run.  e.g. SR-001' },
  { name: 'TC_ID',           desc: 'Stable ID for the test case — must not change between sprints.  e.g. TC-001' },
  { name: 'SUITE_ID',        desc: 'Stable ID for the suite.  e.g. SUITE_001' },
  { name: 'SUITE_NAME',      desc: 'Human-readable suite name.' },
  { name: 'SPRINT',          desc: 'Sprint label — same for every row in one sprint.  e.g. SPRINT_2025_04_1' },
  { name: 'TC_NAME',         desc: 'Human-readable test case name.' },
  { name: 'STATUS',          desc: 'PASS  /  FAIL  /  ERR' },
  { name: 'EXECUTED_BY',     desc: 'Name of the tester.' },
  { name: 'START_TIMESTAMP', desc: 'Format: YYYY-MM-DD HH:MM:SS' },
  { name: 'END_TIMESTAMP',   desc: 'Format: YYYY-MM-DD HH:MM:SS' },
]

const VAR_COLS = [
  { name: 'TEST_CASE_ID',          desc: 'TC_ID this variance covers.' },
  { name: 'VARIANCE_ID',           desc: 'Unique variance ID.  e.g. VAR-001' },
  { name: 'VARIANCE_REASON',       desc: 'Why the failure is excused.' },
  { name: 'VARIANCE_START',        desc: 'Active from.  Format: YYYY-MM-DD' },
  { name: 'VARIANCE_END',          desc: 'Expires on.  Format: YYYY-MM-DD' },
  { name: 'VARIANCE_CURRENT_STATUS', desc: 'APPROVED / PENDING / DISMISSED / EXPIRED' },
  { name: 'DISMISSED_DATE',        desc: 'If dismissed, the date.  Leave blank otherwise.' },
]

function InstructionCard() {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-4 rounded-xl border overflow-hidden" style={{ borderColor: 'var(--line)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-[var(--card2)]"
        style={{ background: 'var(--card)' }}
      >
        <div className="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
          </svg>
          <span className="text-[13px] font-medium" style={{ color: 'var(--text-strong)' }}>
            How to fill the template
          </span>
        </div>
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round"
          style={{ color: 'var(--text-dim)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="border-t px-4 py-4 space-y-5 text-[12px]" style={{ borderColor: 'var(--line)', background: 'var(--card2)' }}>

          {/* Overview */}
          <p style={{ color: 'var(--text-muted)' }}>
            The workbook must have exactly two sheets: <span className="font-mono font-semibold" style={{ color: 'var(--text)' }}>TEST EXECUTION</span> and{' '}
            <span className="font-mono font-semibold" style={{ color: 'var(--text)' }}>VARIANCE SHEET</span>.
            Delete the example rows before uploading — only your real data.
          </p>

          {/* TEST EXECUTION */}
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
              TEST EXECUTION — required columns
            </div>
            <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--line)' }}>
              {EXEC_COLS.map((c, i) => (
                <div key={c.name}
                  className="flex items-start gap-3 px-3 py-2"
                  style={{ background: i % 2 === 0 ? 'var(--card)' : 'transparent' }}
                >
                  <span className="shrink-0 font-mono text-[11px] font-semibold w-36" style={{ color: 'var(--text-strong)' }}>{c.name}</span>
                  <span style={{ color: 'var(--text-dim)' }}>{c.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* VARIANCE SHEET */}
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
              VARIANCE SHEET — required columns (may be empty)
            </div>
            <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--line)' }}>
              {VAR_COLS.map((c, i) => (
                <div key={c.name}
                  className="flex items-start gap-3 px-3 py-2"
                  style={{ background: i % 2 === 0 ? 'var(--card)' : 'transparent' }}
                >
                  <span className="shrink-0 font-mono text-[11px] font-semibold w-44" style={{ color: 'var(--text-strong)' }}>{c.name}</span>
                  <span style={{ color: 'var(--text-dim)' }}>{c.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-lg px-3 py-3 space-y-1.5" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>Important notes</div>
            {[
              'Do not rename or reorder column headers.',
              'TC_ID must be stable across sprints — CASI tracks history by this ID.',
              'SPRINT label must be identical for all rows in the same sprint.',
              'The VARIANCE SHEET must exist even if empty (the parser requires it).',
              'Non-admin accounts: max 1,000 unique test cases per upload.',
            ].map(note => (
              <div key={note} className="flex items-start gap-2" style={{ color: 'var(--text-muted)' }}>
                <span className="mt-0.5 shrink-0 text-accent">✓</span>
                <span>{note}</span>
              </div>
            ))}
          </div>

          <a href={TEMPLATE_URL} download className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold text-white"
            style={{ background: 'var(--accent)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download CASI_Template.xlsx
          </a>
        </div>
      )}
    </div>
  )
}

// ── Upload page ───────────────────────────────────────────────────────────────
export default function UploadPage({ theme, setTheme, accent, setAccent, onComputed, project, apiKey }) {
  const [file, setFile]           = useState(null)
  const [status, setStatus]       = useState('idle') // idle | processing | error
  const [error, setError]         = useState('')
  const [rejectedRows, setRejectedRows] = useState([])  // rows skipped during ingest

  const onDrop = useCallback((accepted) => {
    const f = accepted[0]
    if (!f) return
    if (f.size > 25 * 1024 * 1024) {
      setError('File is too large. Maximum upload size is 25 MB.')
      setStatus('error')
      return
    }
    setFile(f)
    setError('')
    setRejectedRows([])
    setStatus('idle')
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1,
  })

  const handleCompute = async () => {
    if (!file) return
    setStatus('processing')
    setError('')
    setRejectedRows([])

    const form = new FormData()
    form.append('file', file)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 90000)

    try {
      let res, data

      if (project) {
        res = await apiFetch(`/api/projects/${project.id}/runs`, {
          method: 'POST',
          body: form,
          headers: apiKey ? { 'X-CASI-Key': apiKey } : {},
          signal: controller.signal,
        })
        clearTimeout(timer)
        data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to compute CASI')

        // Surface any rows that were rejected during ingest
        if (data.rejected_rows?.length) setRejectedRows(data.rejected_rows)

        const flat = {
          ...(data.result || {}),
          run_id: data.id,
          filename: data.filename,
          computed_at: data.computed_at,
          project_id: data.project_id,
        }
        onComputed(flat, data)
      } else {
        res = await apiFetch('/api/upload', { method: 'POST', body: form, signal: controller.signal })
        clearTimeout(timer)
        data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Upload failed')

        const controller2 = new AbortController()
        const timer2 = setTimeout(() => controller2.abort(), 60000)
        const res2 = await apiFetch('/api/compute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: data.session_id }),
          signal: controller2.signal,
        })
        clearTimeout(timer2)
        const data2 = await res2.json()
        if (!res2.ok) throw new Error(data2.error || 'Compute failed')
        onComputed(data2, null)
      }
    } catch (e) {
      clearTimeout(timer)
      setError(e.name === 'AbortError' ? 'Request timed out — try again' : e.message)
      setStatus('error')
    }
  }

  const isProcessing = status === 'processing'

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-3xl">

        {/* Breadcrumb */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px]"
            style={{ borderColor: 'var(--line)', background: 'var(--card)' }}>
            <span className="h-1.5 w-1.5 rounded-full bg-accent"/>
            {project
              ? <span style={{ color: 'var(--text-muted)' }}>New run for <span style={{ color: 'var(--text-strong)' }}>{project.name}</span></span>
              : <span style={{ color: 'var(--text-muted)' }}>Upload · Step 1 of 2</span>
            }
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-strong)' }}>Upload Test Suite</h1>
          <p className="mt-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>
            Upload your test execution data in the CASI Excel format.{' '}
            <a href={TEMPLATE_URL} download className="text-accent underline">
              Download template
            </a>
          </p>
        </div>

        <div className="mt-6 panel rounded-2xl p-5">
          {/* Drop zone */}
          <div
            {...getRootProps()}
            className={`panel-inner grid-dots relative flex h-56 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed transition ${isDragActive ? 'ring-2 ring-[var(--accent)]' : ''}`}
            style={{ borderColor: isDragActive ? 'var(--accent)' : file ? 'var(--accent)' : 'var(--line2)' }}
          >
            <input {...getInputProps()}/>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl" style={{ background: 'var(--accent-bg)' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            {file ? (
              <>
                <div className="mt-3 flex items-center gap-2">
                  <span className="font-mono text-[14px] font-semibold" style={{ color: 'var(--text-strong)' }}>{file.name}</span>
                </div>
                <div className="mt-1 text-[12px]" style={{ color: 'var(--text-dim)' }}>
                  {(file.size / 1024).toFixed(0)} KB · <span className="text-accent underline cursor-pointer">Replace file</span>
                </div>
              </>
            ) : (
              <>
                <div className="mt-3 text-[14px] font-semibold" style={{ color: 'var(--text-strong)' }}>
                  {isDragActive ? 'Drop it here' : 'Drop your .xlsx file here'}
                </div>
                <div className="mt-1 text-[12px]" style={{ color: 'var(--text-dim)' }}>
                  or <span className="text-accent underline">browse from disk</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Chip tone="slate">xlsx</Chip>
                  <Chip tone="slate">max 25 MB</Chip>
                  <Chip tone="slate">CASI Template</Chip>
                </div>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-xl border px-4 py-3 text-[13px] text-red-400"
              style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
              {error}
            </div>
          )}

          {/* Rejected rows warning */}
          {rejectedRows.length > 0 && (
            <div className="mt-4 rounded-xl border overflow-hidden"
              style={{ borderColor: 'rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.05)' }}>
              <div className="flex items-center gap-2 px-4 py-3 border-b"
                style={{ borderColor: 'rgba(245,158,11,0.25)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span className="text-[13px] font-semibold" style={{ color: '#f59e0b' }}>
                  {rejectedRows.length} row{rejectedRows.length !== 1 ? 's' : ''} were skipped — fix and re-upload to include them
                </span>
              </div>
              <div className="max-h-52 overflow-y-auto divide-y" style={{ borderColor: 'rgba(245,158,11,0.15)' }}>
                {rejectedRows.map((r, i) => (
                  <div key={i} className="px-4 py-2.5 text-[12px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold" style={{ color: 'var(--text-strong)' }}>Row {r.row}</span>
                      {r.tc_run_id !== '—' && <span className="font-mono text-[11px]" style={{ color: 'var(--text-dim)' }}>{r.tc_run_id}</span>}
                      {r.tc_id !== '—' && <span className="font-mono text-[11px]" style={{ color: 'var(--text-dim)' }}>({r.tc_id})</span>}
                    </div>
                    <ul className="mt-1 space-y-0.5">
                      {r.reasons.map((reason, j) => (
                        <li key={j} className="flex items-start gap-1.5" style={{ color: '#f59e0b' }}>
                          <span className="mt-0.5 shrink-0">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compute button */}
          <button
            onClick={handleCompute}
            disabled={!file || isProcessing}
            className="mt-4 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold disabled:opacity-40 transition"
            style={{ color: 'var(--accent-fg)' }}
          >
            {isProcessing
              ? <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Computing CASI… (may take 10–20s)
                </span>
              : 'Compute CASI →'
            }
          </button>
        </div>

        {/* Instruction card */}
        <InstructionCard />

        {/* Footer */}
        <div className="mt-5 flex items-center justify-center gap-6 text-[11px]" style={{ color: 'var(--text-dim)' }}>
          <span>● No PII stored</span>
          <span>● Runs locally</span>
          <a href={TEMPLATE_URL} download className="underline hover:text-accent transition-colors">
            ● Download template
          </a>
        </div>
      </div>
    </div>
  )
}
