/**
 * QR / deep-link helpers. No hardcoded personal wallets —
 * each browser session uses the connected or entered G-address.
 */
import { AppRole } from '../utils/authSession'

/** Build a holder deep-link for an explicit wallet + role (e.g. share with a teammate). */
export function holderSessionUrl(role: AppRole, wallet: string, origin?: string): string {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '')
  const params = new URLSearchParams({ role, wallet: wallet.trim() })
  return `${base}/holder?${params.toString()}`
}
