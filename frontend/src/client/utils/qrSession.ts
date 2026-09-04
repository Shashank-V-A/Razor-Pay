import {
  AppRole,
  clearManualConnectRequirement,
  getActiveSession,
  setActiveSession,
} from './authSession'
import { isValidAccountId } from '../constants/escrow'

function normalizeRole(roleRaw: string | null): AppRole | null {
  if (!roleRaw) return null
  const role = roleRaw.toLowerCase().trim()
  if (role === 'participant' || role === 'sponsor' || role === 'organizer') {
    return role
  }
  return null
}

/**
 * Accepts QR deep-link query params and stores session:
 * - role: participant | sponsor | organizer (required)
 * - wallet / address: account email
 *
 * Example:
 * /holder?role=participant&wallet=you@college.edu
 */
export function bootstrapSessionFromQrParams(): { role: AppRole; wallet: string } | null {
  if (typeof window === 'undefined') return null

  const params = new URLSearchParams(window.location.search)
  const role = normalizeRole(params.get('role'))
  const wallet = (params.get('wallet') || params.get('address') || '').trim()
  if (!role || !wallet || !isValidAccountId(wallet)) return null

  setActiveSession(wallet, role)
  clearManualConnectRequirement()

  const cleanUrl = `${window.location.pathname}${window.location.hash || ''}`
  window.history.replaceState({}, '', cleanUrl)

  return { role, wallet }
}

export function resolveSessionWithQrBootstrap(): { role: AppRole; wallet: string } | null {
  const fromQr = bootstrapSessionFromQrParams()
  if (fromQr) return fromQr
  const current = getActiveSession()
  if (!current) return null
  return { role: current.role, wallet: current.wallet }
}
