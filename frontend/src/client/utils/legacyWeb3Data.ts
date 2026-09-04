import { isLegacyStellarGAddress } from '../constants/escrow'
import type { Hackathon } from '../types/hackathon'

/** Classic Stellar account or Soroban contract id. */
export function isLegacyStellarParty(value?: string | null): boolean {
  const v = (value || '').trim()
  if (isLegacyStellarGAddress(v)) return true
  return /^C[A-Z2-7]{55}$/.test(v)
}

function payoutLooksStellar(value?: string | null): boolean {
  return isLegacyStellarParty(value)
}

export function isLegacyStellarHackathon(
  hackathon: Partial<Hackathon> & {
    escrowAddress?: string
    organizerAddress?: string
    sponsorAddress?: string
    winners?: Array<{ payoutAddress?: string }>
    participants?: Array<{ payoutAddress?: string }>
  },
): boolean {
  if (!hackathon) return false
  if (hackathon.id === 'hack_001' && hackathon.name === "RIFT '26") return true
  if (isLegacyStellarParty(hackathon.organizerAddress)) return true
  if (isLegacyStellarParty(hackathon.sponsorAddress)) return true
  if (isLegacyStellarParty(hackathon.escrowAddress) && hackathon.escrowAddress !== 'pv_inr_vault') {
    return true
  }
  if (hackathon.winners?.some((w) => payoutLooksStellar(w.payoutAddress))) return true
  if (hackathon.participants?.some((p) => payoutLooksStellar(p.payoutAddress))) return true
  return false
}

export function isLegacyStellarProposal(proposal: Record<string, unknown>): boolean {
  const createdBy = String(proposal.createdByWallet || proposal.created_by_wallet || '')
  if (isLegacyStellarParty(createdBy)) return true
  const winners = Array.isArray(proposal.winners) ? proposal.winners : []
  return winners.some((w) => {
    if (!w || typeof w !== 'object') return false
    const row = w as { payoutAddress?: string; address?: string }
    return payoutLooksStellar(row.payoutAddress || row.address)
  })
}

export function dropLegacyStellarHackathons<T extends Partial<Hackathon>>(list: T[]): T[] {
  return list.filter((h) => !isLegacyStellarHackathon(h))
}

export function dropLegacyStellarProposals(
  proposals: Record<string, unknown>[],
  allowedHackathonIds?: Set<string>,
): Record<string, unknown>[] {
  return proposals.filter((p) => {
    if (isLegacyStellarProposal(p)) return false
    if (!allowedHackathonIds) return true
    const id = String(p.hackathonId || '')
    return !id || allowedHackathonIds.has(id)
  })
}
