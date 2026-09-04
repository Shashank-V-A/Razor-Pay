export type AppRole = 'participant' | 'sponsor' | 'organizer'

import { migrateLocalKey } from './twinLockStorage'

const SESSION_KEY = 'twin_lock_active_session'
const MANUAL_CONNECT_KEY = 'twin_lock_manual_connect_required'

if (typeof window !== 'undefined') {
  migrateLocalKey('prize_vault_active_session', SESSION_KEY)
  migrateLocalKey('prize_vault_manual_connect_required', MANUAL_CONNECT_KEY)
}

interface ActiveSession {
  wallet: string
  role: AppRole
  updatedAt: string
}

export function setActiveSession(wallet: string, role: AppRole): void {
  try {
    const data: ActiveSession = {
      wallet: wallet.trim(),
      role,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(data))
  } catch (_) {
    // ignore
  }
}

export function getActiveSession(): ActiveSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.wallet || !parsed?.role) return null
    return parsed as ActiveSession
  } catch (_) {
    return null
  }
}

export function clearActiveSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch (_) {
    // ignore
  }
}

export function requireManualConnect(): void {
  try {
    localStorage.setItem(MANUAL_CONNECT_KEY, '1')
  } catch (_) {
    // ignore
  }
}

export function clearManualConnectRequirement(): void {
  try {
    localStorage.removeItem(MANUAL_CONNECT_KEY)
  } catch (_) {
    // ignore
  }
}

export function isManualConnectRequired(): boolean {
  try {
    return localStorage.getItem(MANUAL_CONNECT_KEY) === '1'
  } catch (_) {
    return false
  }
}

export function hasRequiredRole(required: AppRole): boolean {
  const session = getActiveSession()
  return !!session && session.role === required
}
