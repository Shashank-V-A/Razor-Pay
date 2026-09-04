/**
 * Payout proposals — persisted to Supabase via API with localStorage cache.
 */

import { broadcastHackathonsDatasetChanged } from './hackathonSync'
import { saveAllProposals, fetchProposals } from '../services/hackathonApi'

export const PROPOSALS_STORAGE_KEY = 'prize_vault_payout_proposals'

export function getPayoutProposals(): Record<string, unknown>[] {
  try {
    const stored = localStorage.getItem(PROPOSALS_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed
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
    window.dispatchEvent(new CustomEvent('prize_vault_hackathons_changed'))
    broadcastHackathonsDatasetChanged()
  } catch (_) {
    // best-effort
  }
}
