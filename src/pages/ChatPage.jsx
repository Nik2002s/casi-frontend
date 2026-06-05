import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { apiFetch } from '../lib/api'

function ScoreMini({ score, gate }) {
  const color = gate === 'Green' ? '#10b981' : gate === 'Yellow' ? '#f59e0b' : '#ef4444'
  const bg    = gate === 'Green' ? 'rgba(16,185,129,0.12)' : gate === 'Yellow' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)'
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] ring-1 ring-inset" style={{ background: bg, color, borderColor:`${color}4d` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }}/>
      <span className="font-mono font-semibold">{score}</span>
      <span className="opacity-70">{gate}</span>
    </span>
  )
}

// ── Lightweight markdown renderer (no extra deps) ─────────────────────────────
function renderInline(text) {
  // Bold **text**, inline code `code`
  const parts = []
  let remaining = text
  let key = 0
  while (remaining.length > 0) {
    const boldIdx  = remaining.indexOf('**')
    const codeIdx  = remaining.indexOf('`')
    const first    = [boldIdx, codeIdx].filter(i => i >= 0).sort((a, b) => a - b)[0] ?? -1
    if (first === -1) { parts.push(remaining); break }
    if (first > 0) parts.push(remaining.slice(0, first))
    if (first === boldIdx) {
      const end = remaining.indexOf('**', first + 2)
      if (end === -1) { parts.push(remaining.slice(first)); break }
      parts.push(<strong key={key++} style={{ color: 'var(--text-strong)', fontWeight: 600 }}>{remaining.slice(first + 2, end)}</strong>)
      remaining = remaining.slice(end + 2)
    } else {
      const end = remaining.indexOf('`', first + 1)
      if (end === -1) { parts.push(remaining.slice(first)); break }
      parts.push(<code key={key++} className="rounded px-1 py-0.5 font-mono text-[12px]" style={{ background: 'var(--card2)', color: 'var(--accent)' }}>{remaining.slice(first + 1, end)}</code>)
      remaining = remaining.slice(end + 1)
    }
  }
  return parts
}

function MarkdownBlock({ text }) {
  const lines = text.split('\n')
  const elements = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    // H1/H2/H3
    if (/^###\s/.test(line)) {
      elements.push(<h3 key={i} className="mt-4 mb-1 text-[13px] font-semibold" style={{ color: 'var(--text-strong)' }}>{line.slice(4)}</h3>)
    } else if (/^##\s/.test(line)) {
      elements.push(<h2 key={i} className="mt-5 mb-1 text-[14px] font-semibold" style={{ color: 'var(--text-strong)' }}>{line.slice(3)}</h2>)
    } else if (/^#\s/.test(line)) {
      elements.push(<h1 key={i} className="mt-5 mb-2 text-[15px] font-semibold" style={{ color: 'var(--text-strong)' }}>{line.slice(2)}</h1>)
    // Unordered list item
    } else if (/^[-*]\s/.test(line)) {
      const listItems = []
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        listItems.push(<li key={i} className="flex gap-2 text-[13px] leading-relaxed" style={{ color: 'var(--text)' }}>
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--accent)' }}/>
          <span>{renderInline(lines[i].slice(2))}</span>
        </li>)
        i++
      }
      elements.push(<ul key={`ul-${i}`} className="my-2 space-y-1.5 pl-1">{listItems}</ul>)
      continue
    // Ordered list item
    } else if (/^\d+\.\s/.test(line)) {
      const listItems = []
      let num = 1
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        listItems.push(<li key={i} className="flex gap-2.5 text-[13px] leading-relaxed" style={{ color: 'var(--text)' }}>
          <span className="shrink-0 font-mono text-[11px] font-semibold" style={{ color: 'var(--accent)', minWidth: '1.2em', paddingTop: '0.15em' }}>{num}.</span>
          <span>{renderInline(lines[i].replace(/^\d+\.\s/, ''))}</span>
        </li>)
        num++; i++
      }
      elements.push(<ol key={`ol-${i}`} className="my-2 space-y-1.5 pl-1">{listItems}</ol>)
      continue
    // Horizontal rule
    } else if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={i} style={{ borderColor: 'var(--line)', margin: '12px 0' }}/>)
    // Empty line → spacing
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2"/>)
    // Normal paragraph line
    } else {
      elements.push(<p key={i} className="text-[13px] leading-relaxed" style={{ color: 'var(--text)' }}>{renderInline(line)}</p>)
    }
    i++
  }
  return <>{elements}</>
}

function AssistantMsg({ content }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent">
        <span className="font-mono text-[10px] font-bold" style={{ color:'var(--accent-fg)' }}>AI</span>
      </div>
      <div className="min-w-0 flex-1">
        <MarkdownBlock text={content}/>
      </div>
    </div>
  )
}

function UserMsg({ content }) {
  return (
    <div className="flex justify-end gap-3">
      <div className="max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-[13px]" style={{ background:'var(--accent-bg)', color:'var(--text)', border:'1px solid var(--accent-ring)' }}>
        {content}
      </div>
      <div className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-violet-500"/>
    </div>
  )
}

const SUGGESTED = [
  'Why did CASI drop this quarter?',
  'Which module has the most open failures?',
  'What should the team prioritise fixing first?',
  'Forecast CASI if we fix the top 3 failures.',
]

// ── Quota bar component ───────────────────────────────────────────────────────

function QuotaBar({ used, limit, label, showCount = false }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  const color = pct >= 85 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#10b981'
  return (
    <div className="mb-3">
      <div className="flex justify-between text-[11px] mb-1">
        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ color: 'var(--text)' }}>
          {showCount ? `${used} / ${limit}` : `${Math.round(pct)}%`}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--line)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

function QuotaSection({ quota }) {
  if (!quota) return (
    <div className="text-[11px] animate-pulse" style={{ color: 'var(--text-dim)' }}>Loading quota…</div>
  )

  const reqPct      = quota.daily_requests_limit > 0 ? (quota.daily_requests_used  / quota.daily_requests_limit)  * 100 : 0
  const dayTokenPct = quota.daily_tokens_limit   > 0 ? (quota.daily_tokens_used    / quota.daily_tokens_limit)    * 100 : 0

  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider mb-3" style={{ color: 'var(--text-dim)' }}>
        Today&apos;s AI Quota
      </div>

      <QuotaBar
        label="Requests"
        used={quota.daily_requests_used}
        limit={quota.daily_requests_limit}
        showCount
      />
      <QuotaBar
        label="Daily tokens"
        used={quota.daily_tokens_used}
        limit={quota.daily_tokens_limit}
      />
      <QuotaBar
        label="Weekly tokens"
        used={quota.weekly_tokens_used}
        limit={quota.weekly_tokens_limit}
      />

      {(reqPct >= 85 || dayTokenPct >= 85) && (
        <div className="text-[10px] mt-2" style={{ color: '#f59e0b' }}>
          Resets at midnight UTC
        </div>
      )}

      {quota.block_reason && (
        <div
          className="rounded-lg p-3 text-[12px] mt-3"
          style={{
            background: 'rgba(239,68,68,0.08)',
            color: '#ef4444',
            border: '1px solid rgba(239,68,68,0.2)',
          }}
        >
          {quota.block_reason === 'daily_requests'
            ? `Daily limit reached (${quota.daily_requests_limit} requests). Resets at midnight UTC.`
            : quota.block_reason === 'daily_tokens'
            ? 'Daily token limit reached. Resets at midnight UTC.'
            : 'Weekly token budget reached. Resets Monday midnight UTC.'
          }
        </div>
      )}
    </div>
  )
}

export default function ChatPage({ result, project, onNavigate, setView: _setView }) {
  const setView = onNavigate || _setView  // support both old and new prop names
  const location = useLocation()
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [quota, setQuota]       = useState(null)
  const bottomRef  = useRef(null)
  const sentRef    = useRef(false)   // prevent double-send in StrictMode

  const scores = result?.scores || {}

  const fetchQuota = async () => {
    try {
      const res = await apiFetch('/api/me/quota')
      if (res.ok) setQuota(await res.json())
    } catch {
      // non-fatal
    }
  }

  // Auto-send a prompt injected via router navigation state (from "Explain with AI" buttons)
  // Source tag from the navigation state — tells the backend which button triggered this
  const navSource = location.state?.source || 'chat'

  useEffect(() => {
    fetchQuota()
    const prompt = location.state?.initialPrompt
    if (prompt && !sentRef.current && messages.length === 0) {
      sentRef.current = true
      send(prompt, navSource)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text, source) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role:'user', content: msg }])
    setLoading(true)

    try {
      if (!project?.id) {
        setMessages(prev => [...prev, { role:'assistant', content: 'No project context — open a project first.' }])
        return
      }
      const res = await apiFetch(`/api/projects/${project.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          run_id: result?.run_id,
          message: msg,
          history: messages,
          source: source || navSource,   // 'chat' | 'explain' — for token usage attribution
        }),
      })
      const data = await res.json()
      let reply = ''
      if (data.content) {
        reply = data.content
      } else if (data.error) {
        reply = data.error === 'quota_exceeded'
          ? (data.scope === 'weekly'
              ? 'Weekly token budget reached. Resets Monday midnight UTC.'
              : 'Daily token limit reached. Resets at midnight UTC.')
          : `Error: ${data.error}`
      } else {
        reply = JSON.stringify(data)
      }
      setMessages(prev => [...prev, { role:'assistant', content: reply }])
    } catch (e) {
      setMessages(prev => [...prev, { role:'assistant', content: `Error: ${e.message}` }])
    } finally {
      setLoading(false)
      fetchQuota()
    }
  }

  return (
    <div className="flex min-h-0 flex-1">
      {/* Conversation */}
      <section className="flex min-w-0 flex-1 flex-col">
        {/* Chat header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b px-6" style={{ borderColor:'var(--line)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setView('dashboard')} className="text-[11px]" style={{ color:'var(--text-muted)' }}>← Dashboard</button>
            <div className="h-4 w-px" style={{ background:'var(--line)' }}/>
            <span className="text-sm font-semibold" style={{ color:'var(--text-strong)' }}>Explain with AI</span>
            {scores.casi_score && <ScoreMini score={Math.round(scores.casi_score)} gate={scores.casi_gate}/>}
          </div>
          <button onClick={() => setMessages([])} className="text-[11px]" style={{ color:'var(--text-dim)' }}>New chat</button>
        </div>

        {/* Messages */}
        <div className="scrollbar-thin flex-1 space-y-6 overflow-y-auto p-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <p className="mt-4 text-[14px] font-medium" style={{ color:'var(--text-strong)' }}>Ask about your CASI score</p>
              <p className="mt-1 text-[13px]" style={{ color:'var(--text-dim)' }}>I have full context from the latest run</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {SUGGESTED.map(s => (
                  <button key={s} onClick={() => send(s)} className="rounded-lg border px-3 py-2 text-[12px] text-left hover:bg-[var(--card2)] transition" style={{ borderColor:'var(--line)', color:'var(--text-muted)' }}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === 'user'
              ? <UserMsg key={i} content={m.content}/>
              : <AssistantMsg key={i} content={m.content}/>
          )}

          {loading && (
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent">
                <span className="font-mono text-[10px] font-bold" style={{ color:'var(--accent-fg)' }}>AI</span>
              </div>
              <div className="flex items-center gap-1.5 text-[13px]" style={{ color:'var(--text-dim)' }}>
                <span className="inline-flex gap-1">
                  {[0,1,2].map(i => <span key={i} className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay:`${i*0.15}s` }}/>)}
                </span>
                Thinking…
              </div>
            </div>
          )}

          <div ref={bottomRef}/>
        </div>

        {/* Input bar */}
        <div className="shrink-0 border-t p-4" style={{ borderColor:'var(--line)' }}>
          <div className="panel-inner flex items-end gap-2 rounded-xl p-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Ask anything about CASI, modules, or sprint trends…"
              className="flex-1 resize-none bg-transparent px-3 py-2 text-[13px] outline-none"
              style={{ color:'var(--text)' }}
              rows={2}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent disabled:opacity-40 transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color:'var(--accent-fg)' }}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
          <div className="mt-2 flex items-center gap-3 px-1 text-[10px]" style={{ color:'var(--text-dim)' }}>
            <span>Context: latest run · suite metadata only</span>
          </div>
        </div>
      </section>

      {/* Context sidebar */}
      <aside className="hidden w-[300px] shrink-0 border-l lg:block" style={{ borderColor:'var(--line)', background:'var(--bg2)' }}>
        <div className="space-y-4 p-4">
          {/* Quota section */}
          <div className="panel-inner rounded-xl p-3">
            <QuotaSection quota={quota} />
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color:'var(--text-dim)' }}>Context</div>
            <div className="mt-2 space-y-1.5">
              {[
                ['CASI Score', Math.round(scores.casi_score || 0)],
                ['ASI Score',  Math.round(scores.asi_score  || 0)],
                ['Gate',       scores.casi_gate || '—'],
              ].map(([k, v]) => (
                <div key={k} className="panel-inner flex items-center justify-between rounded-lg px-3 py-2 text-[12px]">
                  <span style={{ color:'var(--text)' }}>{k}</span>
                  <span className="font-mono text-[10px]" style={{ color:'var(--text-dim)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color:'var(--text-dim)' }}>Suggested prompts</div>
            <div className="mt-2 space-y-1.5">
              {SUGGESTED.map(p => (
                <button key={p} onClick={() => send(p)} className="w-full rounded-lg border px-3 py-2 text-left text-[12px] hover:bg-[var(--card2)] transition" style={{ borderColor:'var(--line)', color:'var(--text-muted)' }}>{p}</button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border p-3" style={{ borderColor:'var(--accent-ring)', background:'var(--accent-bg)' }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-accent">Tip</div>
            <p className="mt-1 text-[12px]" style={{ color:'var(--text-muted)' }}>Mention a TC ID like <span className="font-mono" style={{ color:'var(--text)' }}>TC-FRM-025</span> to focus analysis on it.</p>
          </div>
        </div>
      </aside>
    </div>
  )
}
