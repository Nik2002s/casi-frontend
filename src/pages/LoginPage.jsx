import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'

export default function LoginPage() {
  const { signInWithGoogle, authError } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSignIn = async () => {
    setLoading(true)
    setError('')
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message || 'Sign-in failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex h-screen w-full flex-col items-center justify-center"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl font-mono text-base font-bold"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          C
        </div>
        <div>
          <div className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text-strong)' }}>CASI</div>
          <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>Engineering Maturity Dashboard</div>
        </div>
      </div>

      {/* Sign-in card */}
      <div
        className="panel w-full max-w-sm rounded-2xl p-8 text-center"
        style={{ background: 'var(--card)' }}
      >
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
          Sign in to CASI
        </h1>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--text-dim)' }}>
          Use your Google account to get started.
        </p>

        <button
          onClick={handleSignIn}
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border py-3 text-[14px] font-medium transition hover:bg-[var(--card2)] disabled:opacity-50"
          style={{ borderColor: 'var(--line2)', color: 'var(--text-strong)' }}
        >
          {loading
            ? <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            : <GoogleIcon/>
          }
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>

        {(error || authError) && (
          <div className="mt-4 rounded-lg px-4 py-3 text-[12px] text-left"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
            {error || authError}
          </div>
        )}
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
