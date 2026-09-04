/**
 * No-op session helpers. Identity is email stored in authSession, not a crypto wallet.
 */
export async function connectWallet(): Promise<string> {
  throw new Error('Use email sign-in on the account gate.')
}

export async function ensureWalletAddress(): Promise<string> {
  throw new Error('Use the signed-in email session.')
}

export async function reconnectWalletSession(): Promise<string[]> {
  return []
}

export async function disconnectWallet(): Promise<void> {
  return
}

export function isWalletConnectConfigured(): boolean {
  return false
}

const accountSession = {
  connect: connectWallet,
  reconnectSession: reconnectWalletSession,
  disconnect: disconnectWallet,
}

export default accountSession
