import { useState, useEffect, useRef } from 'react'
import ReCAPTCHA from 'react-google-recaptcha'
import { useAuth } from '../lib/AuthContext'
import { apiFetch } from '../lib/api'
import { ThemeToggleBtn } from '../components/primitives'

const LS_THEME = 'casi_theme'
const ACCENT_COLORS = [
  { cls: '',               hex: '#3B82F6' },
  { cls: 'accent-teal',   hex: '#14B8A6' },
  { cls: 'accent-violet', hex: '#8B5CF6' },
  { cls: 'accent-rose',   hex: '#F43F5E' },
  { cls: 'accent-amber',  hex: '#F59E0B' },
]

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''

// ── Semicircular mock gauge ───────────────────────────────────────────────────
// Renders a top-facing semicircle (score=0 at left, score=999 at right, top=~500).
// Math: each score maps to angle a = π(1−s/999), then x = cx+R·cos(a), y = cy−R·sin(a).
function MockGauge({ score = 742 }) {
  const cx = 110, cy = 100, R = 80, r = 62

  function pt(s, radius) {
    const a = Math.PI * (1 - s / 999)
    return [cx + radius * Math.cos(a), cy - radius * Math.sin(a)]
  }

  // Ring arc from score s1 to s2 (s2 > s1).
  // outer arc: sweep=1 (left→right through top); inner: sweep=0 (reversed).
  function ringArc(s1, s2, outerR = R, innerR = r) {
    if (s2 - s1 < 0.5) return ''
    const [ox1, oy1] = pt(s1, outerR)
    const [ox2, oy2] = pt(s2, outerR)
    const [ix1, iy1] = pt(s1, innerR)
    const [ix2, iy2] = pt(s2, innerR)
    return `M${ox1},${oy1} A${outerR},${outerR} 0 0 1 ${ox2},${oy2} L${ix2},${iy2} A${innerR},${innerR} 0 0 0 ${ix1},${iy1}Z`
  }

  const gate = score >= 700 ? 'Green' : score >= 400 ? 'Yellow' : 'Red'
  const gColor = gate === 'Green' ? '#10b981' : gate === 'Yellow' ? '#f59e0b' : '#ef4444'
  const [nx, ny] = pt(score, R - 6)

  return (
    <svg viewBox="0 0 220 108" width="100%">
      {/* Track background */}
      <path d={ringArc(0, 999)} fill="#1c2742" />
      {/* Zone tints */}
      <path d={ringArc(0, 400)} fill="#ef4444" opacity="0.25" />
      <path d={ringArc(400, 700)} fill="#f59e0b" opacity="0.25" />
      <path d={ringArc(700, 999)} fill="#10b981" opacity="0.25" />
      {/* Active fill */}
      {score > 0.5 && <path d={ringArc(0, score)} fill={gColor} opacity="0.88" />}
      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill="white" />
      {/* Score text */}
      <text x={cx} y={cy - 24} textAnchor="middle" fill={gColor} fontSize="28" fontWeight="700" fontFamily="Inter,sans-serif">{score}</text>
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#475569" fontSize="9" fontFamily="Inter,sans-serif">/ 999</text>
    </svg>
  )
}

// ── Mock hero card (right side of hero) ──────────────────────────────────────
function HeroCard() {
  return (
    <div className="relative w-full max-w-sm rounded-2xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-faint)' }}>
              Readiness Gateway On
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
              Sprint 2025-04-14 → 2025-04-25
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#10b981' }} />
            GREEN
          </span>
        </div>

        {/* Gauge */}
        <MockGauge score={742} />

        {/* Component scores */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { k: 'Broken Index', v: '91%', c: '#3B82F6' },
            { k: 'Fix Time',     v: '78%', c: '#8B5CF6' },
            { k: 'Downtime',     v: '95%', c: '#10b981' },
          ].map(({ k, v, c }) => (
            <div key={k} className="rounded-lg p-2.5 text-center" style={{ background: 'var(--card2)' }}>
              <div className="text-[9px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-faint)' }}>{k}</div>
              <div className="text-base font-bold font-mono" style={{ color: c }}>{v}</div>
            </div>
          ))}
        </div>

        {/* AI insight chip */}
        <div className="mt-3 rounded-lg p-3 text-[11px] leading-relaxed" style={{ background: 'var(--card2)', color: 'var(--text-muted)' }}>
          <span className="font-semibold" style={{ color: '#10b981' }}>↑ 42 pts</span> above baseline.
          No critical regressions detected. 3 variance overrides active.
        </div>
      </div>
    </div>
  )
}

// ── Navigation ────────────────────────────────────────────────────────────────
function Nav({ onSignIn, authLoading, onEnterprise, theme, setTheme, accent, setAccent }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  const scrolledBg   = theme === 'dark' ? 'rgba(8,12,20,0.9)' : 'rgba(246,247,251,0.95)'
  // In light theme always show a solid-ish nav so links stay readable against the white hero
  const unscrolledBg = theme === 'dark' ? 'transparent' : 'rgba(246,247,251,0.85)'

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? scrolledBg : unscrolledBg,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: scrolled ? '1px solid var(--line)' : '1px solid transparent',
      }}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm bg-accent"
            style={{ color: 'var(--accent-fg)' }}>
            C
          </div>
          <span className="text-base font-semibold tracking-tight" style={{ color: 'var(--text-strong)' }}>CASI</span>
        </div>

        {/* Center links */}
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: 'How it works', href: '#how-it-works' },
            { label: 'Features',     href: '#features'     },
          ].map(({ label, href }) => (
            <a key={href} href={href}
              className="text-sm transition-colors duration-150"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-strong)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              {label}
            </a>
          ))}
        </div>

        {/* Right: theme controls + CTAs */}
        <div className="flex items-center gap-2">
          {/* Accent swatches */}
          <div className="hidden sm:flex items-center gap-1 mr-1">
            {ACCENT_COLORS.map(({ cls, hex }) => (
              <button
                key={cls}
                onClick={() => setAccent(cls)}
                className="h-4 w-4 rounded-full border-2 transition-transform hover:scale-110"
                style={{ background: hex, borderColor: accent === cls ? 'var(--text)' : 'transparent' }}
                title={cls || 'Blue'}
              />
            ))}
          </div>
          <ThemeToggleBtn theme={theme} onToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} />
          <button onClick={onSignIn}
            className="hidden sm:block text-sm px-4 py-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-strong)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            Log in
          </button>
          <button onClick={onSignIn} disabled={authLoading}
            className="text-sm font-semibold px-4 py-2 rounded-lg transition-all disabled:opacity-60 bg-accent"
            style={{ color: 'var(--accent-fg)' }}>
            {authLoading ? 'Signing in…' : 'Get Started →'}
          </button>
        </div>
      </div>
    </nav>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero({ onSignIn, authLoading, onEnterprise }) {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-24 left-1/4 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'var(--accent)', filter: 'blur(120px)', opacity: 0.1 }} />
        <div className="absolute bottom-24 right-1/4 w-72 h-72 rounded-full opacity-8"
          style={{ background: '#8B5CF6', filter: 'blur(100px)' }} />
        {/* Dot grid */}
        <div className="absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.022) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-24 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: copy */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full mb-8"
              style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-ring)', color: 'var(--accent)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
              Early Access Open
            </div>

            <h1 className="text-5xl lg:text-[3.6rem] font-bold leading-[1.1] tracking-tight">
              <span style={{ color: 'var(--text-strong)' }}>Know if your software</span><br />
              <span style={{ color: 'var(--text-strong)' }}>is ready to ship. </span>
              <span style={{ color: 'var(--accent)' }}>Before</span><br />
              <span style={{ color: 'var(--text-strong)' }}>it&rsquo;s too late.</span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed max-w-lg" style={{ color: 'var(--text-muted)' }}>
              CASI computes a 0–999 release stability score from your QA test suite.
              AI-powered root cause. Sprint-aware trends. CI/CD native.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <button onClick={onSignIn} disabled={authLoading}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-semibold text-base transition-all disabled:opacity-60 hover:brightness-110 bg-accent"
                style={{ color: 'var(--accent-fg)' }}>
                {authLoading && (
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                )}
                {authLoading ? 'Signing in…' : 'Get Started Free →'}
              </button>
              <button onClick={onEnterprise}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-base transition-all hover:border-slate-500"
                style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--line2)' }}>
                Request Enterprise Access
              </button>
            </div>
          </div>

          {/* Right: mock card */}
          <div className="flex justify-center lg:justify-end">
            <HeroCard />
          </div>
        </div>
      </div>
    </section>
  )
}

// ── How it works ──────────────────────────────────────────────────────────────
const STEPS = [
  {
    num: '01',
    title: 'Upload or connect',
    desc: 'Drop your QA Excel or hit our REST endpoint from CI. Structured test result data is parsed automatically — no transformation needed.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Compute 6 components',
    desc: 'Broken Index, Fix Time, Downtime, Fail Ratio, Suite Fail, Variances — fused with adaptive Bayesian weights tuned to your failure patterns.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Score, trend, root cause',
    desc: 'Get a 0–999 score, 7-sprint trend with forecast, and an AI root cause from Claude if you dip below threshold.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-28 relative">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-block text-[11px] font-semibold uppercase tracking-[0.2em] mb-5 px-3 py-1.5 rounded-full"
            style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-ring)' }}>
            How it works
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold" style={{ color: 'var(--text-strong)' }}>
            From spreadsheet to ship-decision<br />in under 2 seconds
          </h2>
        </div>

        {/* Steps connected by a horizontal line on desktop */}
        <div className="relative grid md:grid-cols-3 gap-6">
          {/* Connector line */}
          <div className="hidden md:block absolute top-10 left-[16.67%] right-[16.67%] h-px"
            style={{ background: 'linear-gradient(to right, transparent, var(--line) 20%, var(--line) 80%, transparent)' }} />

          {STEPS.map((step) => (
            <div key={step.num} className="relative rounded-2xl p-7"
              style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                style={{ background: 'var(--accent-bg)' }}>
                {step.icon}
              </div>
              <div className="text-[11px] font-mono font-bold mb-2 uppercase tracking-widest"
                style={{ color: 'var(--accent)' }}>
                Step {step.num}
              </div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-strong)' }}>
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Features ──────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    title: 'Composite score, not pass rate',
    desc: 'Six weighted components capture age of failures, downtime, and variance — the signals that actually predict production issues.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    title: 'AI root cause analysis',
    desc: "When CASI drops below threshold, Claude names the implicated tests and rates fixes by impact × effort.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12" /><path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    title: 'Sprint-aware trend forecast',
    desc: '7-sprint rolling window with next-sprint prediction so you see drift before it hits the gate.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
      </svg>
    ),
  },
  {
    title: 'Immutable gate decisions',
    desc: 'Ship / Hold recorded with reasoning and who decided. Audit trail locked server-side — cannot be spoofed by the request body.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    title: 'CI/CD native REST API',
    desc: 'Push scores from any pipeline. No UI required. JSON in, score out. Rate-limited, auth-gated, and schema-validated.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    title: 'Multi-project radar',
    desc: 'Component radar chart across projects. Spot which team or service is the bottleneck at a glance.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
]

function Features() {
  return (
    <section id="features" className="py-28">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold" style={{ color: 'var(--text-strong)' }}>
            Built for release governance
          </h2>
          <p className="mt-4 text-lg" style={{ color: 'var(--text-dim)' }}>
            Everything a QA lead or engineering manager needs to make the call.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div key={i}
              className="rounded-2xl p-6 transition-all duration-200"
              style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--line2)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'var(--accent-bg)' }}>
                {f.icon}
              </div>
              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-strong)' }}>
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Enterprise CTA section ────────────────────────────────────────────────────
function EnterpriseCTA({ onEnterprise }) {
  return (
    <section className="py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="rounded-3xl p-14 text-center relative overflow-hidden"
          style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
          {/* Glow */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-[500px] h-40 rounded-full opacity-15"
              style={{ background: 'var(--accent)', filter: 'blur(80px)' }} />
          </div>
          <div className="relative">
            <div className="inline-block text-[11px] font-semibold uppercase tracking-[0.2em] mb-5 px-3 py-1.5 rounded-full"
              style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-ring)' }}>
              Enterprise
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold mb-4" style={{ color: 'var(--text-strong)' }}>
              Need dedicated access?
            </h2>
            <p className="text-lg mb-10 max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Get a private deployment, custom integrations, SSO, and an onboarding session
              with the CASI team.
            </p>
            <button onClick={onEnterprise}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-base transition-all hover:brightness-110 bg-accent"
              style={{ color: 'var(--accent-fg)' }}>
              Request Enterprise Access →
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
function LandingFooter() {
  return (
    <footer className="py-10" style={{ borderTop: '1px solid var(--line)' }}>
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md flex items-center justify-center font-mono font-bold text-xs bg-accent"
            style={{ color: 'var(--accent-fg)' }}>
            C
          </div>
          <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>CASI</span>
        </div>
        <div className="flex items-center gap-6 text-sm" style={{ color: 'var(--text-faint)' }}>
          <a href="#features"     className="transition-colors" onMouseEnter={e => e.currentTarget.style.color='var(--text-muted)'} onMouseLeave={e => e.currentTarget.style.color='var(--text-faint)'}>Features</a>
          <a href="#how-it-works" className="transition-colors" onMouseEnter={e => e.currentTarget.style.color='var(--text-muted)'} onMouseLeave={e => e.currentTarget.style.color='var(--text-faint)'}>How it works</a>
          <a href="/terms"        className="transition-colors" onMouseEnter={e => e.currentTarget.style.color='var(--text-muted)'} onMouseLeave={e => e.currentTarget.style.color='var(--text-faint)'}>Terms</a>
          <a href="/privacy"      className="transition-colors" onMouseEnter={e => e.currentTarget.style.color='var(--text-muted)'} onMouseLeave={e => e.currentTarget.style.color='var(--text-faint)'}>Privacy</a>
          <span>© 2026 CASI</span>
        </div>
      </div>
    </footer>
  )
}

// ── Enterprise request modal ──────────────────────────────────────────────────
function EnterpriseModal({ onClose }) {
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' })
  const [captchaToken, setCaptchaToken] = useState(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const recaptchaRef = useRef(null)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const inputStyle = {
    background: 'var(--card2)',
    border: '1px solid var(--line)',
    color: 'var(--text)',
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.company.trim()) {
      return setError('Name, email, and company are required.')
    }
    if (RECAPTCHA_SITE_KEY && !captchaToken) {
      return setError('Please complete the CAPTCHA verification.')
    }
    setLoading(true)
    setError('')
    try {
      const res = await apiFetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, captcha_token: captchaToken || '' }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || `Request failed (${res.status})`)
      }
      setDone(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      recaptchaRef.current?.reset()
      setCaptchaToken(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl"
        style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
        {done ? (
          /* ── Success state ── */
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(16,185,129,0.12)' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-strong)' }}>Request received!</h3>
            <p className="text-sm mb-7" style={{ color: 'var(--text-muted)' }}>
              We'll be in touch within 1–2 business days.
            </p>
            <button onClick={onClose}
              className="px-7 py-2.5 rounded-xl text-sm font-medium transition-all hover:brightness-110"
              style={{ background: 'var(--card2)', color: 'var(--text)' }}>
              Close
            </button>
          </div>
        ) : (
          /* ── Form ── */
          <div className="p-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-strong)' }}>Request Enterprise Access</h2>
              <button onClick={onClose}
                className="p-1 rounded-lg transition-colors"
                style={{ color: 'var(--text-faint)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-muted)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {[
                { key: 'name',    label: 'Name',        type: 'text',  placeholder: 'Your name',          required: true },
                { key: 'email',   label: 'Work email',  type: 'email', placeholder: 'you@company.com',    required: true },
                { key: 'company', label: 'Company',     type: 'text',  placeholder: 'Acme Corp',          required: true },
              ].map(({ key, label, type, placeholder, required }) => (
                <div key={key}>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={set(key)}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={inputStyle}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--line)'}
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Use case <span style={{ color: 'var(--text-faint)' }}>(optional)</span>
                </label>
                <textarea
                  value={form.message}
                  onChange={set('message')}
                  placeholder="Tell us about your QA setup and what you're hoping to achieve…"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all resize-none"
                  style={inputStyle}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--line)'}
                />
              </div>

              {/* reCAPTCHA — only shown when a site key is configured */}
              {RECAPTCHA_SITE_KEY && (
                <div>
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={RECAPTCHA_SITE_KEY}
                    onChange={token => setCaptchaToken(token)}
                    onExpired={() => setCaptchaToken(null)}
                    theme="dark"
                  />
                </div>
              )}

              {error && (
                <div className="rounded-xl px-4 py-3 text-sm"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || Boolean(RECAPTCHA_SITE_KEY && !captchaToken)}
                className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 hover:brightness-110 bg-accent"
                style={{ color: 'var(--accent-fg)' }}>
                {loading ? 'Submitting…' : 'Request Access →'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Google sign-in modal ──────────────────────────────────────────────────────
function SignInModal({ onClose, onSignIn, loading, error }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-6 pb-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs bg-accent"
              style={{ color: 'var(--accent-fg)' }}>
              C
            </div>
            <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-strong)' }}>CASI</span>
          </div>
          <button onClick={onClose}
            className="p-1 rounded-lg transition-colors"
            style={{ color: 'var(--text-faint)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-muted)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-7 pt-6 text-center">
          <h2 className="text-xl font-bold mb-1.5" style={{ color: 'var(--text-strong)' }}>
            Sign in to CASI
          </h2>
          <p className="text-sm leading-relaxed mb-1" style={{ color: 'var(--text-muted)' }}>
            Access the early demo and start measuring your release health.
          </p>

          {/* Divider + provider notice */}
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
            <span className="text-[11px] font-medium px-2" style={{ color: 'var(--text-faint)' }}>
              We currently only offer login with Google
            </span>
            <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
          </div>

          {/* Google button */}
          <button
            onClick={onSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 hover:brightness-110"
            style={{ background: '#FFFFFF', color: '#1E293B' }}>
            {loading
              ? <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1E293B" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              : (
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )
            }
            {loading ? 'Signing in…' : 'Continue with Google'}
          </button>

          {error && (
            <div className="mt-4 rounded-xl px-4 py-3 text-sm text-left"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
              {error}
            </div>
          )}

          <p className="mt-5 text-[11px] leading-relaxed" style={{ color: 'var(--text-faint)' }}>
            By signing in you agree to our{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--text-dim)' }}>Terms</a>
            {' '}and{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--text-dim)' }}>Privacy Policy</a>.
            Enterprise access?{' '}
            <button className="underline transition-colors" style={{ color: 'var(--text-dim)' }}
              onMouseEnter={e => e.currentTarget.style.color='var(--text-muted)'}
              onMouseLeave={e => e.currentTarget.style.color='var(--text-dim)'}
              onClick={onClose}>
              Request it here.
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { signInWithGoogle, authError } = useAuth()
  const [showSignIn, setShowSignIn] = useState(false)
  const [showEnterprise, setShowEnterprise] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authLocalError, setAuthLocalError] = useState('')
  const [theme, setTheme]   = useState(() => { try { return localStorage.getItem(LS_THEME) || 'dark' } catch { return 'dark' } })
  const [accent, setAccent] = useState(() => { try { return localStorage.getItem('casi_accent') || '' } catch { return '' } })

  useEffect(() => { try { localStorage.setItem(LS_THEME, theme) } catch {} }, [theme])
  useEffect(() => { try { localStorage.setItem('casi_accent', accent) } catch {} }, [accent])

  const openSignIn = () => { setAuthLocalError(''); setShowSignIn(true) }

  const handleSignIn = async () => {
    setAuthLoading(true)
    setAuthLocalError('')
    try { await signInWithGoogle() }
    catch (err) { setAuthLocalError(err.message || 'Sign-in failed. Please try again.') }
    finally { setAuthLoading(false) }
  }

  const openEnterprise = () => { setShowSignIn(false); setShowEnterprise(true) }

  return (
    <div className={`theme-${theme} ${accent}`} style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Nav      onSignIn={openSignIn} authLoading={false} onEnterprise={openEnterprise} theme={theme} setTheme={setTheme} accent={accent} setAccent={setAccent} />
      <Hero     onSignIn={openSignIn} authLoading={false} onEnterprise={openEnterprise} />
      <HowItWorks />
      <Features />
      <EnterpriseCTA onEnterprise={openEnterprise} />
      <LandingFooter />

      {showSignIn && (
        <SignInModal
          onClose={() => setShowSignIn(false)}
          onSignIn={handleSignIn}
          loading={authLoading}
          error={authLocalError || authError}
        />
      )}
      {showEnterprise && <EnterpriseModal onClose={() => setShowEnterprise(false)} />}
    </div>
  )
}
