/**
 * Authenticated API helper.
 *
 * apiFetch(path, options) — like fetch(), but:
 *   - Prepends VITE_API_URL (Railway backend URL in production)
 *   - Automatically attaches Firebase ID token as Authorization: Bearer <token>
 *
 * Usage:
 *   const res = await apiFetch('/api/projects')
 *   const res = await apiFetch('/api/projects', { method: 'POST', body: JSON.stringify(data),
 *                               headers: { 'Content-Type': 'application/json' } })
 */

import { auth } from './firebase'

const BASE = import.meta.env.VITE_API_URL ?? ''

async function getToken() {
  try {
    return auth.currentUser ? await auth.currentUser.getIdToken() : null
  } catch {
    return null
  }
}

export async function apiFetch(path, options = {}) {
  const token = await getToken()
  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  return fetch(`${BASE}${path}`, { ...options, headers })
}

/** Kept for any component that still needs a plain URL (e.g. non-fetch usage) */
export function apiUrl(path) {
  return `${BASE}${path}`
}
