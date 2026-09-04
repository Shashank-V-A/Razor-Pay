import { isValidEmail } from '../constants/escrow'
import { isEscrowFullyFunded } from './format'

/**
 * Sponsor console: only this account's vaults, plus unfunded events they can lock.
 */
export function hackathonVisibleToSponsor(
  hackathon: {
    organizerAddress?: string
    sponsorAddress?: string
    payoutExecuted?: boolean
    prizePool?: unknown
    sponsorFundingXlm?: unknown
    onChainBalanceXlm?: unknown
    sponsorFunded?: unknown
  },
  sessionEmail: string | null | undefined,
): boolean {
  const me = (sessionEmail || '').trim().toLowerCase()
  if (!me || !isValidEmail(me)) return false

  const sponsor = (hackathon.sponsorAddress || '').trim().toLowerCase()
  if (sponsor === me) return true

  const openForFunding =
    !sponsor && !hackathon.payoutExecuted && !isEscrowFullyFunded(hackathon)
  return openForFunding
}
