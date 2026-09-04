import { useCallback, useState } from 'react'
import {
  allocateOnChainProposalId,
  postEscrow,
  xlmToStroops,
  type EscrowApiResponse,
  type EscrowPayout,
} from '../api/escrowApi'

export type ProposeWinnerInput = {
  winner_address?: string
  payoutAddress?: string
  amount?: number | string
  prizeAmount?: number | string
  amount_stroops?: string | number
  githubUrl?: string
  project?: string
  name?: string
}

export type UseEscrowResult = {
  loading: boolean
  lastError: string
  lastTxHash: string
  clearError: () => void
  fundVault: (hackathonId: string, amountInr: number) => Promise<EscrowApiResponse>
  confirmFund: (checkout: {
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
  }) => Promise<EscrowApiResponse>
  claimPrize: (input: {
    hackathonId: string
    destination: string
    amount: number
  }) => Promise<EscrowApiResponse>
  proposePayouts: (
    winners: ProposeWinnerInput[],
    proposalId?: number,
  ) => Promise<EscrowApiResponse & { proposalId: number }>
  approvePayout: (proposalId: number) => Promise<EscrowApiResponse>
  executePayout: (
    proposalId: number,
    extra?: { winners?: ProposeWinnerInput[]; vaultBalanceInr?: number; hackathonId?: string },
  ) => Promise<EscrowApiResponse>
}

function normalizePayouts(winners: ProposeWinnerInput[]): EscrowPayout[] {
  return winners
    .map((w) => {
      const winner_address = String(w.winner_address || w.payoutAddress || '').trim()
      let amount: string
      if (w.amount_stroops !== undefined && w.amount_stroops !== null && w.amount_stroops !== '') {
        amount = String(w.amount_stroops)
      } else {
        amount = xlmToStroops(w.amount ?? w.prizeAmount ?? 0)
      }
      return { winner_address, amount }
    })
    .filter((p) => p.winner_address && p.amount !== '0')
}

/**
 * React hook that talks to the PrizeVault Express API:
 *   POST /api/escrow/propose | approve | execute
 */
export function useEscrow(): UseEscrowResult {
  const [loading, setLoading] = useState(false)
  const [lastError, setLastError] = useState('')
  const [lastTxHash, setLastTxHash] = useState('')

  const clearError = useCallback(() => setLastError(''), [])

  const run = useCallback(async (path: string, body: Record<string, unknown>) => {
    setLoading(true)
    setLastError('')
    try {
      const result = await postEscrow(path, body)
      if (result.success && result.txHash) {
        setLastTxHash(result.txHash)
      }
      if (!result.success) {
        setLastError(result.error || 'Escrow API call failed')
      }
      return result
    } finally {
      setLoading(false)
    }
  }, [])

  const fundVault = useCallback(
    async (hackathonId: string, amountInr: number) => {
      return run('/api/escrow/fund', { hackathonId, amount: amountInr })
    },
    [run],
  )

  const confirmFund = useCallback(
    async (checkout: {
      razorpay_order_id: string
      razorpay_payment_id: string
      razorpay_signature: string
    }) => {
      return run('/api/escrow/fund/confirm', { ...checkout })
    },
    [run],
  )

  const claimPrize = useCallback(
    async (input: { hackathonId: string; destination: string; amount: number }) => {
      return run('/api/escrow/claim', input)
    },
    [run],
  )

  const proposePayouts = useCallback(
    async (winners: ProposeWinnerInput[], proposalId?: number) => {
      const id = proposalId ?? allocateOnChainProposalId()
      const payouts = normalizePayouts(winners)
      if (!payouts.length) {
        const failure: EscrowApiResponse & { proposalId: number } = {
          success: false,
          txHash: '',
          error: 'No valid winners with payout addresses and amounts.',
          proposalId: id,
        }
        setLastError(failure.error)
        return failure
      }
      const result = await run('/api/escrow/propose', {
        proposal_id: id,
        payouts,
      })
      return { ...result, proposalId: id }
    },
    [run],
  )

  const approvePayout = useCallback(
    async (proposalId: number) => {
      if (!Number.isFinite(proposalId)) {
        const failure = { success: false, txHash: '', error: 'proposalId is required' }
        setLastError(failure.error)
        return failure
      }
      return run('/api/escrow/approve', { proposal_id: proposalId })
    },
    [run],
  )

  const executePayout = useCallback(
    async (
      proposalId: number,
      extra?: { winners?: ProposeWinnerInput[]; vaultBalanceInr?: number; hackathonId?: string },
    ) => {
      if (!Number.isFinite(proposalId)) {
        const failure = { success: false, txHash: '', error: 'proposalId is required' }
        setLastError(failure.error)
        return failure
      }
      const payouts = extra?.winners ? normalizePayouts(extra.winners) : undefined
      return run('/api/escrow/execute', {
        proposal_id: proposalId,
        payouts,
        winners: extra?.winners,
        vaultBalanceInr: extra?.vaultBalanceInr,
        hackathonId: extra?.hackathonId,
      })
    },
    [run],
  )

  return {
    loading,
    lastError,
    lastTxHash,
    clearError,
    fundVault,
    confirmFund,
    claimPrize,
    proposePayouts,
    approvePayout,
    executePayout,
  }
}

export default useEscrow
