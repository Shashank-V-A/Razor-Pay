/** Dual-control HackPay INR vault (not a blockchain contract). */
export const INR_VAULT_ID = 'pv_inr_vault'

/** @deprecated use INR_VAULT_ID */
export const ESCROW_APP_ID = INR_VAULT_ID

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || '').trim())
}

/** Session identity is an email (replaces Stellar G-address). */
export function isValidAccountId(value: string): boolean {
  return isValidEmail(value)
}

/** UPI VPA, e.g. name@okaxis */
export function isValidUpiVpa(value: string): boolean {
  return /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/.test((value || '').trim())
}

/** Allow UPI or a 9–18 digit bank account number. */
export function isValidPayoutDestination(value: string): boolean {
  const v = (value || '').trim()
  if (isValidUpiVpa(v)) return true
  if (/^\d{9,18}$/.test(v)) return true
  return isValidEmail(v)
}

/** Leftover Stellar public keys from the previous Web3 build. */
export function isLegacyStellarGAddress(value: string): boolean {
  return /^G[A-Z2-7]{55}$/.test((value || '').trim())
}
