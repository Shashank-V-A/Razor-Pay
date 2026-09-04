/**
 * Razorpay + vault env. Loaded by next.config.ts dotenv from repo-root `.env`.
 */
const ENV = process.env

export const INR_VAULT_ID = 'pv_inr_vault'

export function getRazorpayKeyId(): string {
  return (ENV.RAZORPAY_KEY_ID || ENV.NEXT_PUBLIC_RAZORPAY_KEY_ID || '').trim()
}

export function getRazorpayKeySecret(): string {
  return (ENV.RAZORPAY_KEY_SECRET || '').trim()
}

export function isRazorpayLiveConfigured(): boolean {
  const id = getRazorpayKeyId()
  const secret = getRazorpayKeySecret()
  return Boolean(id && secret)
}

export function isRazorpayTestMode(): boolean {
  const id = getRazorpayKeyId()
  return !id || id.startsWith('rzp_test_')
}

export function rupeesToPaise(rupees: number | string): number {
  const n = typeof rupees === 'number' ? rupees : Number(String(rupees).trim())
  if (!Number.isFinite(n) || n < 0) throw new Error(`Invalid INR amount: ${rupees}`)
  return Math.round(n * 100)
}

export function paiseToRupees(paise: number): number {
  return paise / 100
}
