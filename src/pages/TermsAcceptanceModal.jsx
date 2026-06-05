// TermsAcceptanceModal — shown on first login before the user can access the app.
// Both checkboxes must be ticked and "Accept & Continue" clicked.
// Inline scrollable versions of T&C and Privacy Policy are embedded.

import { useState } from 'react'
import TermsPage from './TermsPage'
import PrivacyPage from './PrivacyPage'

export default function TermsAcceptanceModal({ onAccept, loading, error }) {
  const [tab, setTab]               = useState('terms')   // 'terms' | 'privacy'
  const [termsRead, setTermsRead]   = useState(false)
  const [privacyRead, setPrivacyRead] = useState(false)
  const [termsChecked, setTermsChecked]     = useState(false)
  const [privacyChecked, setPrivacyChecked] = useState(false)

  const canSubmit = termsChecked && privacyChecked && !loading

  // Mark the active tab as "read" when the user scrolls to the bottom
  const handleScroll = (e) => {
    const el = e.currentTarget
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 40
    if (atBottom) {
      if (tab === 'terms')   setTermsRead(true)
      if (tab === 'privacy') setPrivacyRead(true)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div
        className="flex flex-col w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{ background: 'var(--card)', border: '1px solid var(--line)', maxHeight: '90vh' }}>

        {/* Header */}
        <div className="shrink-0 px-7 pt-7 pb-5" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-mono text-[11px] font-bold" style={{ color: 'var(--accent-fg)' }}>C</div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-strong)' }}>Before you continue</h2>
          </div>
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            Please read and accept our Terms and Conditions and Privacy Policy to use CASI.
          </p>

          {/* Tab switcher */}
          <div className="mt-4 flex gap-1 rounded-lg p-1" style={{ background: 'var(--card2)' }}>
            {[
              { key: 'terms',   label: 'Terms & Conditions', done: termsRead },
              { key: 'privacy', label: 'Privacy Policy',     done: privacyRead },
            ].map(({ key, label, done }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-[12px] font-medium transition"
                style={{
                  background: tab === key ? 'var(--bg2)' : 'transparent',
                  color: tab === key ? 'var(--text-strong)' : 'var(--text-muted)',
                  border: tab === key ? '1px solid var(--line)' : '1px solid transparent',
                }}>
                {done && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable document */}
        <div
          className="flex-1 overflow-y-auto px-7 py-5 scrollbar-thin"
          style={{ minHeight: 0 }}
          onScroll={handleScroll}>
          {tab === 'terms'
            ? <TermsPage inline />
            : <PrivacyPage inline />
          }
          {/* Scroll-to-bottom nudge */}
          {((tab === 'terms' && !termsRead) || (tab === 'privacy' && !privacyRead)) && (
            <div className="sticky bottom-0 pt-4 pb-1 text-center text-[11px]" style={{ color: 'var(--text-dim)' }}>
              ↓ Scroll to the bottom to enable the checkbox
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-7 py-5 space-y-3" style={{ borderTop: '1px solid var(--line)', background: 'var(--card2)' }}>
          {/* Checkboxes */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={termsChecked}
              disabled={!termsRead}
              onChange={e => setTermsChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer disabled:cursor-not-allowed"
              style={{ accentColor: 'var(--accent)' }}
            />
            <span className="text-[12px] leading-relaxed" style={{ color: termsRead ? 'var(--text)' : 'var(--text-dim)' }}>
              I have read and agree to the{' '}
              <button
                type="button"
                onClick={() => setTab('terms')}
                className="underline"
                style={{ color: 'var(--accent)' }}>
                Terms and Conditions
              </button>
              {!termsRead && <span className="ml-1 text-[10px]" style={{ color: 'var(--text-dim)' }}>(read the document first)</span>}
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={privacyChecked}
              disabled={!privacyRead}
              onChange={e => setPrivacyChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer disabled:cursor-not-allowed"
              style={{ accentColor: 'var(--accent)' }}
            />
            <span className="text-[12px] leading-relaxed" style={{ color: privacyRead ? 'var(--text)' : 'var(--text-dim)' }}>
              I have read and agree to the{' '}
              <button
                type="button"
                onClick={() => setTab('privacy')}
                className="underline"
                style={{ color: 'var(--accent)' }}>
                Privacy Policy
              </button>
              {!privacyRead && <span className="ml-1 text-[10px]" style={{ color: 'var(--text-dim)' }}>(read the document first)</span>}
            </span>
          </label>

          {error && (
            <div className="rounded-lg px-4 py-2.5 text-[12px]"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
              {error}
            </div>
          )}

          <button
            onClick={onAccept}
            disabled={!canSubmit}
            className="w-full py-3.5 rounded-xl font-semibold text-[13px] transition-all disabled:opacity-40 hover:brightness-110 bg-accent"
            style={{ color: 'var(--accent-fg)' }}>
            {loading ? 'Saving…' : 'Accept & Continue →'}
          </button>

          <p className="text-center text-[11px]" style={{ color: 'var(--text-dim)' }}>
            You must accept both documents to use CASI. Your acceptance is recorded with a timestamp.
          </p>
        </div>
      </div>
    </div>
  )
}
