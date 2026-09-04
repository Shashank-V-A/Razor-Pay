import { escrowBalanceXlm, isEscrowFullyFunded, prizeTotal } from './format'

export type PayoutWorkflowStage =
  | 'awaiting_funding'
  | 'funded'
  | 'winners_selected'
  | 'awaiting_sponsor'
  | 'ready_to_release'
  | 'released'

export type PayoutProposalLike = {
  hackathonId?: string
  status?: string
  organizerApproved?: boolean
  sponsorApproved?: boolean
}

export type FundedHackathon = {
  id?: string
  prizePool?: unknown
  onChainBalanceXlm?: unknown
  sponsorFundingXlm?: unknown
  winnersSelected?: boolean
  winners?: unknown[]
  payoutProposed?: boolean
  payoutExecuted?: boolean
}

export const WORKFLOW_STAGE_META: Record<
  PayoutWorkflowStage,
  { label: string; badge: string; description: string }
> = {
  awaiting_funding: {
    label: 'Awaiting funding',
    badge: 'pv-badge--warning',
    description: 'The sponsor must lock the full prize pool in escrow before judging or payouts.',
  },
  funded: {
    label: 'Funded',
    badge: 'pv-badge--success',
    description: 'Prize pool is locked. Select winners when the event ends.',
  },
  winners_selected: {
    label: 'Winners chosen',
    badge: 'pv-badge--accent',
    description: 'Winners are saved. The organizer should propose the INR payout next.',
  },
  awaiting_sponsor: {
    label: 'Awaiting sponsor',
    badge: 'pv-badge--warning',
    description: 'Organizer proposed the payout. The sponsor must co-approve the winner list.',
  },
  ready_to_release: {
    label: 'Ready to release',
    badge: 'pv-badge--accent',
    description: 'Both sides approved. The orchestration agent executes Razorpay INR payouts and posts receipt ids.',
  },
  released: {
    label: 'Released',
    badge: 'pv-badge--success',
    description: 'Prize funds were sent to winners in INR.',
  },
}

export function findHackathonProposal(
  hackathonId: string,
  proposals: PayoutProposalLike[] = [],
): PayoutProposalLike | undefined {
  return proposals.find((p) => p.hackathonId === hackathonId)
}

export function isPayoutReleased(
  hackathon: FundedHackathon,
  proposals: PayoutProposalLike[] = [],
): boolean {
  if (hackathon.payoutExecuted) return true
  if (!hackathon.id) return false
  const proposal = findHackathonProposal(hackathon.id, proposals)
  return proposal?.status === 'executed'
}

export function getPayoutWorkflowStage(
  hackathon: FundedHackathon,
  proposals: PayoutProposalLike[] = [],
): PayoutWorkflowStage {
  if (isPayoutReleased(hackathon, proposals)) return 'released'

  const proposal = hackathon.id ? findHackathonProposal(hackathon.id, proposals) : undefined

  if (proposal?.status === 'executed') return 'released'
  if (proposal?.organizerApproved && proposal?.sponsorApproved) return 'ready_to_release'
  if (proposal?.organizerApproved || hackathon.payoutProposed) return 'awaiting_sponsor'

  if (!isEscrowFullyFunded(hackathon)) return 'awaiting_funding'

  if (hackathon.winnersSelected && Array.isArray(hackathon.winners) && hackathon.winners.length > 0) {
    return 'winners_selected'
  }

  return 'funded'
}

export function canSelectWinners(
  hackathon: FundedHackathon,
  proposals: PayoutProposalLike[] = [],
): boolean {
  return isEscrowFullyFunded(hackathon) && !isPayoutReleased(hackathon, proposals)
}

export function canProposePayout(
  hackathon: FundedHackathon,
  proposals: PayoutProposalLike[] = [],
): boolean {
  if (!isEscrowFullyFunded(hackathon)) return false
  if (!hackathon.winnersSelected || !hackathon.winners?.length) return false
  if (hackathon.payoutProposed) return false
  if (hackathon.id && findHackathonProposal(hackathon.id, proposals)) return false
  return !isPayoutReleased(hackathon, proposals)
}

export function canSponsorApproveProposal(
  proposal: PayoutProposalLike,
  hackathon: FundedHackathon,
): boolean {
  if (!isEscrowFullyFunded(hackathon)) return false
  if (proposal.status === 'executed') return false
  if (!proposal.organizerApproved || proposal.sponsorApproved) return false
  return true
}

export function canExecuteRelease(proposal: PayoutProposalLike): boolean {
  if (proposal.status === 'executed') return false
  return Boolean(proposal.organizerApproved && proposal.sponsorApproved)
}

export function fundingGapXlm(hackathon: FundedHackathon): number {
  const total = prizeTotal(hackathon)
  const balance = escrowBalanceXlm(hackathon)
  return Math.max(0, total - balance)
}

export function workflowSteps(
  hackathon: FundedHackathon,
  proposal?: PayoutProposalLike,
): { label: string; done: boolean }[] {
  const stage = getPayoutWorkflowStage(hackathon, proposal ? [proposal] : [])
  const funded = isEscrowFullyFunded(hackathon)
  const organizerProposed = Boolean(
    proposal?.organizerApproved || hackathon.payoutProposed || stage === 'awaiting_sponsor' || stage === 'ready_to_release' || stage === 'released',
  )
  const sponsorApproved = Boolean(
    proposal?.sponsorApproved || stage === 'ready_to_release' || stage === 'released',
  )
  const released = stage === 'released'

  return [
    { label: 'Escrow funded', done: funded },
    { label: 'Organizer proposed', done: organizerProposed },
    { label: 'Sponsor approved', done: sponsorApproved },
    { label: 'Released', done: released },
  ]
}
