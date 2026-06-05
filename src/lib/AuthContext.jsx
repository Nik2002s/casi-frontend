import { createContext, useContext, useState, useEffect } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
} from 'firebase/auth'
import { auth, googleProvider } from './firebase'
import { apiFetch } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [authError, setAuthError]     = useState('')
  const [isAdmin, setIsAdmin]         = useState(false)
  const [needsTerms, setNeedsTerms]   = useState(false)  // true = show acceptance modal

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        try {
          const res = await apiFetch('/api/me')
          if (res.ok) {
            const data = await res.json()
            setIsAdmin(!!data.is_admin)
            setNeedsTerms(!!data.needs_acceptance)
          }
        } catch {
          // non-fatal — admin features simply won't show
        }
      } else {
        setIsAdmin(false)
        setNeedsTerms(false)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const signInWithGoogle = async () => {
    setAuthError('')
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      setAuthError(err.message || 'Sign-in failed. Please try again.')
      throw err
    }
  }

  const signOut = async () => {
    await fbSignOut(auth)
    setIsAdmin(false)
    setNeedsTerms(false)
  }

  const acceptTerms = async () => {
    const res = await apiFetch('/api/me/accept-terms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accepted_terms: true, accepted_privacy: true }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      throw new Error(d.error || 'Failed to record acceptance')
    }
    setNeedsTerms(false)
  }

  return (
    <AuthContext.Provider value={{ user, loading, authError, isAdmin, needsTerms, signInWithGoogle, signOut, acceptTerms }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
