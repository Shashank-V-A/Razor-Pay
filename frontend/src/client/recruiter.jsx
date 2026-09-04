import React, { useEffect, useMemo, useState } from 'react'
import { disconnectWallet } from './wallet'
import SharedHeader from './components/SharedHeader'
import Icon from './components/Icon'
import {
  clearActiveSession,
  getActiveSession,
  hasRequiredRole,
  requireManualConnect,
} from './utils/authSession'
import { resolveSessionWithQrBootstrap } from './utils/qrSession'
import { getPayoutProposals, savePayoutProposals } from './utils/payoutProposalsStorage'
import {
  broadcastHackathonsDatasetChanged,
  subscribeHackathonsDatasetChanged,
} from './utils/hackathonSync'
import { fetchHackathons, fetchProposals, updateHackathon } from './services/hackathonApi'
import { syncWalletSession } from './services/sessionApi'
import { useEscrow } from './hooks/useEscrow'
import { INR_VAULT_ID } from './constants/escrow'
import {
  escrowBalanceXlm,
  formatXlm,
  isEscrowFullyFunded,
  prizeTotal,
} from './utils/format'
import { canSponsorApproveProposal } from './utils/payoutWorkflow'
import { useAgentInbox } from './hooks/useAgentInbox'
import AgentInbox from './components/AgentInbox'
import EscrowOverviewPanel from './recruiter/views/EscrowOverviewPanel'
import FundingPanel from './recruiter/views/FundingPanel'
import ReleaseApprovalsPanel from './recruiter/views/ReleaseApprovalsPanel'
import BudgetSummaryPanel from './recruiter/views/BudgetSummaryPanel'
import ActivityHistoryPanel from './recruiter/views/ActivityHistoryPanel'
import SponsorProfilePanel from './recruiter/views/SponsorProfilePanel'
import './styles/index.css'

const HACKATHON_STORAGE_KEY = 'prize_vault_hackathons'

function getHackathonsFromStorage() {
  try {
    const stored = localStorage.getItem(HACKATHON_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (_) {
    return []
  }
}

function SponsorConsole() {
  useEffect(() => {
    const session = resolveSessionWithQrBootstrap()
    if (session?.wallet && session?.role === 'sponsor') {
      void syncWalletSession({ wallet: session.wallet, role: 'sponsor' })
    }
  }, [])

  useEffect(() => {
    if (!hasRequiredRole('sponsor')) {
      window.location.href = '/holder?role=sponsor'
    }
  }, [])

  const activeSession = getActiveSession()
  const senderAddress = (activeSession?.wallet || '').trim()

  const handleDisconnect = () => {
    void disconnectWallet()
    clearActiveSession()
    requireManualConnect()
    window.location.href = '/holder?role=sponsor'
  }

  const [hackathons, setHackathons] = useState([])
  const [proposals, setProposals] = useState([])
  const [selectedEscrowId, setSelectedEscrowId] = useState(null)
  const [activities, setActivities] = useState([])
  const [isFunding, setIsFunding] = useState(false)
  const [fundingError, setFundingError] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [approveError, setApproveError] = useState('')
  const { approvePayout, fundVault } = useEscrow()
  const { unread, dismiss } = useAgentInbox(senderAddress)

  const sponsorName = 'Hackathon Sponsor Inc.'
  const defaultWallet = senderAddress

  // savePayoutProposals now announces its own writes, so the 2-second poll the
  // original ran forever is no longer needed to notice cross-surface approvals.
  useEffect(() => {
    const refresh = async () => {
      const [list, propList] = await Promise.all([fetchHackathons(), fetchProposals()])
      setHackathons(list)
      setProposals(propList)
    }
    refresh()
    return subscribeHackathonsDatasetChanged(() => {
      void refresh()
    }, ['prize_vault_payout_proposals'])
  }, [])

  const escrows = useMemo(
    () =>
      hackathons.map((h) => {
        const attributed = escrowBalanceXlm(h)
        const contractId = INR_VAULT_ID
        const pool = prizeTotal(h)
        const fullyFunded = isEscrowFullyFunded(h)
        const sharedOnChain = Number(h.sponsorFundingXlm ?? 0)
        return {
          id: h.id,
          name: h.name,
          escrowAddress: contractId,
          status: fullyFunded
            ? 'Fully funded'
            : attributed > 0
              ? 'Partially funded'
              : 'Awaiting top-up',
          balanceAlgo: attributed,
          sharedOnChainBalance: Number.isFinite(sharedOnChain) ? sharedOnChain : 0,
          prizePool: pool,
          fullyFunded,
          remainingXlm: Math.max(0, pool - attributed),
          hackathon: h,
        }
      }),
    [hackathons],
  )

  useEffect(() => {
    if (!escrows.length) {
      setSelectedEscrowId(null)
      return
    }
    if (!selectedEscrowId || !escrows.some((e) => e.id === selectedEscrowId)) {
      setSelectedEscrowId(escrows[0].id)
    }
  }, [escrows, selectedEscrowId])

  const pendingReleases = useMemo(() => {
    const approvals = proposals
      .filter((p) => p.organizerApproved && !p.sponsorApproved && p.status !== 'executed')
      .map((p) => {
        const hackathon = hackathons.find((h) => h.id === p.hackathonId)
        const canApprove = hackathon ? canSponsorApproveProposal(p, hackathon) : false
        return {
          id: p.id,
          hackathon: p.hackathonName,
          winners: p.winners || [],
          total: (p.winners || []).reduce((sum, w) => sum + Number(w.prizeAmount || 0), 0),
          organizerState: 'Organizer proposed',
          sponsorState: canApprove ? 'Waiting on you' : 'Awaiting full funding',
          canApprove,
        }
      })

    const proposalsByHackathon = new Set(approvals.map((x) => x.hackathon))
    const selectedWinnersOnly = hackathons
      .filter((h) => h.winnersSelected && Array.isArray(h.winners) && h.winners.length > 0)
      .filter((h) => !proposalsByHackathon.has(h.name))
      .map((h) => ({
        id: `winner_only_${h.id}`,
        hackathon: h.name,
        winners: h.winners || [],
        total: (h.winners || []).reduce((sum, w) => sum + Number(w.prizeAmount || 0), 0),
        organizerState: 'Winners selected',
        sponsorState: isEscrowFullyFunded(h)
          ? 'Awaiting organizer proposal'
          : 'Awaiting full funding',
        canApprove: false,
      }))

    return [...approvals, ...selectedWinnersOnly]
  }, [proposals, hackathons])

  const budgetStats = useMemo(() => {
    const committed = escrows.reduce((sum, e) => sum + e.balanceAlgo, 0)
    const locked = escrows
      .filter((e) => e.status !== 'Released')
      .reduce((sum, e) => sum + e.balanceAlgo, 0)
    const released = proposals
      .filter((p) => p.status === 'executed')
      .reduce(
        (sum, p) =>
          sum + (p.winners || []).reduce((inner, w) => inner + Number(w.prizeAmount || 0), 0),
        0,
      )
    return { committed, locked, released }
  }, [escrows, proposals])

  const selectedEscrow = escrows.find((e) => e.id === selectedEscrowId) ?? null
  const actionableCount = pendingReleases.filter((r) => r.canApprove).length

  const syncEscrowOnChainState = async (escrowId) => {
    if (!escrowId) return
    try {
      const result = await updateHackathon(escrowId, { escrowAddress: INR_VAULT_ID })
      if (result.success && result.hackathon) {
        setHackathons((prev) =>
          prev.map((h) => (h.id === escrowId ? { ...h, ...result.hackathon } : h)),
        )
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to refresh vault row', error)
    }
  }

  useEffect(() => {
    if (selectedEscrowId) {
      void syncEscrowOnChainState(selectedEscrowId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEscrowId, senderAddress])

  const handleFund = async ({ escrowId, amount }) => {
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return
    }
    const hackRow = hackathons.find((h) => h.id === escrowId)
    if (!hackRow) return

    if (isEscrowFullyFunded(hackRow)) {
      setFundingError('This event is already fully funded.')
      return
    }

    setFundingError('')
    setIsFunding(true)
    try {
      const fundResult = await fundVault(escrowId, numericAmount)
      if (!fundResult.success) {
        throw new Error(fundResult.error || 'Razorpay fund failed')
      }
      const txHash = fundResult.txHash

      const nextFunding = Number(hackRow.sponsorFundingXlm || 0) + numericAmount
      const nextRow = {
        ...hackRow,
        sponsorFundingXlm: nextFunding,
        sponsorAddress: senderAddress,
      }
      const sponsorFunded = isEscrowFullyFunded(nextRow)

      const patch = {
        sponsorFundingXlm: nextFunding,
        sponsorAddress: senderAddress,
        organizerAddress: hackRow.organizerAddress?.trim() || '',
        escrowAddress: INR_VAULT_ID,
        sponsorFunded,
      }

      const result = await updateHackathon(escrowId, patch)
      if (!result.success || !result.hackathon) {
        throw new Error(result.error || 'Funding captured but could not save to the database.')
      }

      setHackathons((prev) =>
        prev.map((h) => (h.id === escrowId ? { ...h, ...result.hackathon } : h)),
      )

      setActivities((prev) => [
        {
          id: `act_fund_${Date.now()}`,
          timestamp: 'Just now',
          icon: 'send',
          tone: 'success',
          title: sponsorFunded ? 'Prize pool fully funded' : 'INR vault funded',
          description: `Attributed ₹${formatXlm(numericAmount)} to ${hackRow.name} (₹${formatXlm(nextFunding)} / ₹${formatXlm(prizeTotal(hackRow))}).`,
          txHash,
        },
        ...prev,
      ])
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Funding transaction failed', error)
      setFundingError(
        error instanceof Error ? error.message : 'Funding failed.',
      )
    } finally {
      setIsFunding(false)
    }
  }

  /** Repair path: attribute existing shared-contract funds to this event without another transfer. */
  const handleConfirmAttributedFunding = async (escrowId) => {
    const hackRow = hackathons.find((h) => h.id === escrowId)
    if (!hackRow || !senderAddress) return
    const pool = prizeTotal(hackRow)
    if (pool <= 0) return
    if (isEscrowFullyFunded(hackRow)) return

    setFundingError('')
    setIsFunding(true)
    try {
      const shared = Number(hackRow.sponsorFundingXlm || 0)
      if (shared < pool) {
        throw new Error(
          `Vault only holds ₹${formatXlm(shared)}, but this event needs ₹${formatXlm(pool)}. Send the remaining amount first.`,
        )
      }

      const patch = {
        sponsorFundingXlm: pool,
        sponsorAddress: senderAddress,
        organizerAddress: hackRow.organizerAddress?.trim() || '',
        escrowAddress: INR_VAULT_ID,
        sponsorFunded: true,
      }
      const result = await updateHackathon(escrowId, patch)
      if (!result.success || !result.hackathon) {
        throw new Error(result.error || 'Could not record funding for this event.')
      }
      setHackathons((prev) =>
        prev.map((h) => (h.id === escrowId ? { ...h, ...result.hackathon } : h)),
      )
      setActivities((prev) => [
        {
          id: `act_confirm_${Date.now()}`,
          timestamp: 'Just now',
          icon: 'checkCircle',
          tone: 'success',
          title: 'Funding attributed to event',
          description: `Marked ${hackRow.name} fully funded (₹${formatXlm(pool)}) from vault balance.`,
        },
        ...prev,
      ])
    } catch (error) {
      setFundingError(
        error instanceof Error ? error.message : 'Could not confirm funding for this event.',
      )
    } finally {
      setIsFunding(false)
    }
  }

  const handleApproveRelease = async (releaseId) => {
    setApproveError('')
    setIsApproving(true)
    try {
      const proposal = proposals.find((p) => p.id === releaseId)
      if (!proposal) {
        throw new Error('Payout proposal not found.')
      }

      const hackathon = hackathons.find((h) => h.id === proposal.hackathonId)
      if (!hackathon || !canSponsorApproveProposal(proposal, hackathon)) {
        throw new Error('Prize pool must be fully funded before sponsor approval.')
      }

      const onChainId = Number(proposal.onChainProposalId)
      if (!Number.isFinite(onChainId)) {
        throw new Error('Proposal is missing proposal id. Ask the organizer to re-propose.')
      }

      const chainResult = await approvePayout(onChainId)
      if (!chainResult.success) {
        throw new Error(chainResult.error || 'Sponsor approval failed')
      }

      const updatedProposals = proposals.map((p) =>
        p.id === releaseId
          ? {
              ...p,
              sponsorApproved: true,
              approveTxHash: chainResult.txHash,
              status: 'sponsor_approved',
            }
          : p,
      )
      savePayoutProposals(updatedProposals)
      setProposals(updatedProposals)
      setActivities((prev) => [
        {
          id: `act_approve_${Date.now()}`,
          timestamp: 'Just now',
          icon: 'checkCircle',
          tone: 'success',
          title: 'Sponsor approval recorded',
          description: `Approved payout #${onChainId} for ${proposal.hackathonName}. Receipt ${chainResult.txHash.slice(0, 14)}… — agent can execute.`,
        },
        ...prev,
      ])
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Payout approval failed', error)
      setApproveError(error instanceof Error ? error.message : 'Approval failed.')
    } finally {
      setIsApproving(false)
    }
  }

  return (
    <div className="pv-shell pv-app">
      <a className="pv-skip-link" href="#console">
        Skip to content
      </a>

      <SharedHeader activeTab="recruiter" subtitle="Sponsor" />

      <div className="pv-container pv-container--wide" style={{ paddingTop: 'var(--pv-space-8)' }}>
        <div className="pv-page-header pv-console-header">
          <div className="pv-page-header__text">
            <h1 className="pv-page-header__title">Sponsor console</h1>
            <p className="pv-page-header__desc">
              Fund prize pools first, then co-approve winner payouts after the organizer proposes
              them. Nothing is released until both sides approve. After that the orchestration agent
              executes Razorpay INR payouts and posts receipt ids.
            </p>
          </div>
          <div className="pv-page-header__actions">
            {actionableCount > 0 ? (
              <a href="#approvals" className="pv-btn pv-btn--primary pv-btn--sm">
                <Icon name="clock" size={14} />
                {actionableCount} awaiting you
              </a>
            ) : null}
            <button
              type="button"
              className="pv-btn pv-btn--secondary pv-btn--sm"
              onClick={handleDisconnect}
            >
              <Icon name="logout" size={14} />
              Disconnect
            </button>
          </div>
        </div>
      </div>

      <main
        className="pv-container pv-container--wide"
        id="console"
        style={{ paddingBottom: 'var(--pv-space-13)' }}
      >
        <div className="pv-stack pv-stack--lg">
          <AgentInbox
            notifications={unread}
            onOpen={(notice) => {
              if (notice.txUrl) window.open(notice.txUrl, '_blank', 'noreferrer')
              else document.getElementById('approvals')?.scrollIntoView({ behavior: 'smooth' })
            }}
            onDismiss={dismiss}
          />

          <BudgetSummaryPanel stats={budgetStats} />

          <section className="pv-section" id="approvals">
            <ReleaseApprovalsPanel
              pendingReleases={pendingReleases}
              onApprove={handleApproveRelease}
              isApproving={isApproving}
              approveError={approveError}
            />
          </section>

          <div id="workspace" className="pv-responsive-grid pv-sponsor-grid">
            <EscrowOverviewPanel
              escrows={escrows}
              selectedEscrowId={selectedEscrowId}
              onSelectEscrow={setSelectedEscrowId}
            />
            <FundingPanel
              selectedEscrow={selectedEscrow}
              onFund={handleFund}
              onConfirmAttributed={handleConfirmAttributedFunding}
              fundingDestinationAddress={INR_VAULT_ID}
              displaySenderAddress={senderAddress}
              onSyncOnChain={() => selectedEscrowId && void syncEscrowOnChainState(selectedEscrowId)}
              isFunding={isFunding}
              fundingError={fundingError}
            />
          </div>

          <div className="pv-responsive-grid">
            <ActivityHistoryPanel activities={activities} />
            <SponsorProfilePanel sponsorName={sponsorName} defaultWallet={defaultWallet} />
          </div>
        </div>
      </main>

      <footer className="pv-footer">
        <div className="pv-footer__inner">
          <span>INR hackathon prize vault · sponsor console.</span>
          <ul className="pv-footer__links">
            <li>
              <a href="/issuer">Organizer tools</a>
            </li>
            <li>
              <a href="/">Overview</a>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  )
}

export default SponsorConsole
export { SponsorConsole }
