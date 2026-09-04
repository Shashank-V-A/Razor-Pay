/**
 * Payout proposals — persisted to Supabase via API with localStorage cache.
 */

import { dropLegacyStellarProposals } from './legacyWeb3Data'
import { emitHackathonsChanged } from './hackathonSync'
import { saveAllProposals, fetchProposals } from '../services/hackathonApi'
import { migrateLocalKey } from './twinLockStorage'

export const PROPOSALS_STORAGE_KEY = 'twin_lock_payout_proposals'

if (typeof window !== 'undefined') {
  migrateLocalKey('prize_vault_payout_proposals', PROPOSALS_STORAGE_KEY)
}

export function getPayoutProposals(): Record<string, unknown>[] {
  try {
    const stored = localStorage.getItem(PROPOSALS_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        const cleaned = dropLegacyStellarProposals(parsed)
        if (cleaned.length !== parsed.length) {
          try {
            localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(cleaned))
          } catch {
            // ignore
          }
        }
        return cleaned
      }
    }
  } catch (_) {}
  return []
}

export async function savePayoutProposals(proposals: Record<string, unknown>[]): Promise<void> {
  await saveAllProposals(proposals)
}

export async function loadPayoutProposalsFromApi(): Promise<Record<string, unknown>[]> {
  return fetchProposals()
}

export function notifyProposalsChanged(): void {
  try {
    emitHackathonsChanged()
  } catch (_) {
    // best-effort
  }
}
