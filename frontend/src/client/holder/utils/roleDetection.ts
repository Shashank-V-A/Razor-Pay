import { UserRole } from '../../types/holder'
import { Hackathon } from '../../types/hackathon'
import { getPayoutProposals, savePayoutProposals } from '../../utils/payoutProposalsStorage'
import {
  broadcastHackathonsDatasetChanged,
  PRIZE_VAULT_HACKATHONS_KEY,
  REGISTERED_HACKATHONS_KEY,
} from '../../utils/hackathonSync'

const STORAGE_KEY = PRIZE_VAULT_HACKATHONS_KEY

/**
 * Detects user role based on wallet address and hackathon data
 * @param walletAddress - The connected wallet address
 * @param hackathons - Array of hackathons to check against
 * @returns Detected role: 'sponsor', 'organizer', or 'participant'
 */
export function detectUserRole(
  walletAddress: string | null,
  hackathons: Hackathon[] = []
): UserRole {
  if (!walletAddress) return null

  // Load hackathons from localStorage if not provided
  let allHackathons = hackathons
  if (allHackathons.length === 0) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        allHackathons = JSON.parse(stored)
      }
    } catch (_) {
      // Ignore parse errors
    }
  }

  const normalizedAddress = walletAddress.toLowerCase()

  // Check if wallet is an organizer
  const isOrganizer = allHackathons.some(
    (h) => h.organizerAddress?.toLowerCase() === normalizedAddress
  )

  if (isOrganizer) return 'organizer'

  // Check if wallet is a sponsor
  const isSponsor = allHackathons.some(
    (h) => h.sponsorAddress?.toLowerCase() === normalizedAddress
  )

  if (isSponsor) return 'sponsor'

  // Check if wallet is a participant
  const isParticipant = allHackathons.some((h) =>
    h.participants?.some(
      (p) => p.payoutAddress?.toLowerCase() === normalizedAddress
    )
  )

  if (isParticipant) return 'participant'

  // Default to participant if no match (can register for hackathons)
  return 'participant'
}

/**
 * Gets hackathons from localStorage.
 */
export function getHackathonsFromStorage(): Hackathon[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        return parsed.filter((h) => !(h.id === 'hack_001' && h.name === "RIFT '26"))
      }
    }
  } catch (_) {
    // Ignore parse errors
  }
  return []
}

export type SaveHackathonsOptions = {
  /** When false, skip cross-tab / hook reload signals (e.g. silent API cache writes). */
  broadcast?: boolean
}

/**
 * Saves hackathons to localStorage
 */
export function saveHackathonsToStorage(
  hackathons: Hackathon[],
  options: SaveHackathonsOptions = {},
): void {
  const shouldBroadcast = options.broadcast !== false
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hackathons))
    if (typeof window !== 'undefined' && shouldBroadcast) {
      window.dispatchEvent(new CustomEvent('prize_vault_hackathons_changed'))
      broadcastHackathonsDatasetChanged()
    }
  } catch (_) {
    // Ignore storage errors
  }
}

const TIMELINE_STORAGE_KEY = 'prize_vault_hackathon_timelines'

/**
 * Removes a hackathon everywhere it is persisted (shared across organizer, sponsor, participant UIs).
 */
export function deleteHackathonById(hackathonId: string): void {
  const current = getHackathonsFromStorage()
  const filtered = current.filter((h) => h.id !== hackathonId)
  saveHackathonsToStorage(filtered)

  try {
    const proposals = getPayoutProposals()
    const kept = proposals.filter(
      (p) => String((p as Record<string, unknown>).hackathonId) !== hackathonId,
    )
    savePayoutProposals(kept)
  } catch (_) {
    // ignore
  }

  try {
    const reg = localStorage.getItem(REGISTERED_HACKATHONS_KEY)
    if (reg) {
      const ids: string[] = JSON.parse(reg)
      localStorage.setItem(
        REGISTERED_HACKATHONS_KEY,
        JSON.stringify(ids.filter((id) => id !== hackathonId)),
      )
    }
  } catch (_) {
    // ignore
  }

  try {
    const raw = localStorage.getItem(TIMELINE_STORAGE_KEY)
    if (raw) {
      const store = JSON.parse(raw) as Record<string, unknown>
      if (store && typeof store === 'object' && hackathonId in store) {
        delete store[hackathonId]
        localStorage.setItem(TIMELINE_STORAGE_KEY, JSON.stringify(store))
      }
    }
  } catch (_) {
    // ignore
  }
}
