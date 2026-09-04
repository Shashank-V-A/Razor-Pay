import { AwardBadge } from '@/components/ui/award-badge'
import { isEscrowFullyFunded } from '../utils/format'

type FundedHackathon = {
  escrowAddress?: string
  prizePool?: unknown
  onChainBalanceXlm?: unknown
  sponsorFundingXlm?: unknown
  sponsorAddress?: unknown
  sponsorFunded?: unknown
}

export default function EventVerifiedBadge({ hackathon }: { hackathon: FundedHackathon }) {
  if (!isEscrowFullyFunded(hackathon)) return null

  return (
    <div className="pv-event__verified-badge">
      <AwardBadge link="/verifier" />
    </div>
  )
}
