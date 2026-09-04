/**
 * Frontend client for PrizeVault INR escrow API.
 */

export type EscrowApiResponse = {
  success: boolean
  txHash: string
  error: string
  needsCheckout?: boolean
  keyId?: string
  amountPaise?: number
  orderId?: string
  amount?: number
  paymentId?: string
}

export type EscrowPayout = {
  winner_address: string
  /** INR rupees as string */
  amount: string
}

function apiBase(): string {
  try {
    const next = (process.env as { NEXT_PUBLIC_API_BASE_URL?: string }).NEXT_PUBLIC_API_BASE_URL
    if (next) return next.replace(/\/$/, '')
  } catch {
    // ignore
  }
  return ''
}

export async function postEscrow(
  path: string,
  body: Record<string, unknown>,
): Promise<EscrowApiResponse> {
  let response: Response
  try {
    response = await fetch(`${apiBase()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Network error reaching PrizeVault API'
    return { success: false, txHash: '', error: message }
  }

  let data: Partial<EscrowApiResponse> = {}
  try {
    data = (await response.json()) as Partial<EscrowApiResponse>
  } catch {
    return {
      success: false,
      txHash: '',
      error: `Invalid JSON from API (HTTP ${response.status})`,
    }
  }

  return {
    success: Boolean(data.success),
    txHash: typeof data.txHash === 'string' ? data.txHash : '',
    error: typeof data.error === 'string' ? data.error : response.ok ? '' : `HTTP ${response.status}`,
    needsCheckout: Boolean(data.needsCheckout),
    keyId: typeof data.keyId === 'string' ? data.keyId : undefined,
    amountPaise: typeof data.amountPaise === 'number' ? data.amountPaise : undefined,
    orderId: typeof data.orderId === 'string' ? data.orderId : undefined,
    amount: typeof data.amount === 'number' ? data.amount : undefined,
    paymentId: typeof data.paymentId === 'string' ? data.paymentId : undefined,
  }
}

/** Convert rupees to a canonical decimal string. */
export function inrToAmount(rupees: number | string): string {
  const n = typeof rupees === 'number' ? rupees : Number(String(rupees).trim())
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid INR amount: ${rupees}`)
  }
  return String(n)
}

/** @deprecated use inrToAmount */
export function xlmToStroops(xlm: number | string): string {
  return inrToAmount(xlm)
}

export function allocateOnChainProposalId(): number {
  return Date.now()
}
