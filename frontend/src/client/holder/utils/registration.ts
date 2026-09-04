import { Hackathon, Participant } from '../../types/hackathon'
import { getHackathonsFromStorage } from './roleDetection'
import { getProfileForWallet } from './userProfileStorage'
import {
  TWIN_LOCK_HACKATHONS_KEY,
  REGISTERED_HACKATHONS_KEY,
  emitHackathonsChanged,
} from '../../utils/hackathonSync'
import { registerParticipantForHackathon } from '../../services/hackathonApi'

/** Ids this browser has registered, used as a fallback when the roster is stale. */
export function getRegisteredIds(): string[] {
  try {
    const raw = localStorage.getItem(REGISTERED_HACKATHONS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function isRegistered(hackathon: Hackathon, wallet: string | null): boolean {
  if (!wallet) return false
  return Boolean(
    hackathon.participants?.some(
      (p) => p.payoutAddress?.toLowerCase() === wallet.toLowerCase(),
    ),
  )
}

export type RegisterResult = { ok: true } | { ok: false; reason: string }

function rememberRegisteredId(hackathonId: string): void {
  const ids = getRegisteredIds()
  if (!ids.includes(hackathonId)) {
    localStorage.setItem(REGISTERED_HACKATHONS_KEY, JSON.stringify([...ids, hackathonId]))
  }
}

function cacheRegistrationLocally(hackathonId: string, participant: Participant): void {
  const current = getHackathonsFromStorage()
  const updated = current.map((h) => {
    if (h.id !== hackathonId) return h
    const participants = [...(h.participants ?? []), participant]
    return { ...h, participants, participantCount: participants.length }
  })

  localStorage.setItem(TWIN_LOCK_HACKATHONS_KEY, JSON.stringify(updated))
  rememberRegisteredId(hackathonId)
  emitHackathonsChanged()
}

/**
 * Registers the connected wallet for a hackathon in Supabase and local cache.
 */
export async function registerForHackathon(
  hackathonId: string,
  wallet: string | null,
): Promise<RegisterResult> {
  if (!wallet) return { ok: false, reason: 'Sign in before registering.' }

  const current = getHackathonsFromStorage()
  const target = current.find((h) => h.id === hackathonId)
  if (!target) return { ok: false, reason: 'That event no longer exists.' }

  const onRoster = target.participants?.some(
    (p) => p.payoutAddress?.toLowerCase() === wallet.toLowerCase(),
  )
  if (onRoster) return { ok: false, reason: 'You are already registered.' }

  const profile = getProfileForWallet(wallet)
  const result = await registerParticipantForHackathon(
    hackathonId,
    wallet,
    profile?.name,
  )

  if (!result.success || !result.hackathon) {
    return { ok: false, reason: result.error || 'Could not save registration.' }
  }

  rememberRegisteredId(hackathonId)
  return { ok: true }
}

/** Offline-only fallback when the API is unavailable. */
export function registerForHackathonLocally(
  hackathonId: string,
  wallet: string | null,
): RegisterResult {
  if (!wallet) return { ok: false, reason: 'Sign in before registering.' }

  const current = getHackathonsFromStorage()
  const target = current.find((h) => h.id === hackathonId)
  if (!target) return { ok: false, reason: 'That event no longer exists.' }
  if (isRegistered(target, wallet)) return { ok: false, reason: 'You are already registered.' }

  const profile = getProfileForWallet(wallet)
  const participant: Participant = {
    id: `p_${wallet.slice(0, 8)}`,
    name: profile?.name ?? 'Participant',
    registeredAt: new Date().toISOString(),
    status: 'registered',
    payoutAddress: wallet,
  }

  try {
    cacheRegistrationLocally(hackathonId, participant)
    return { ok: true }
  } catch {
    return { ok: false, reason: 'Could not save. Browser storage may be full or blocked.' }
  }
}
