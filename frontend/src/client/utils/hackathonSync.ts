/**
 * Keeps hackathon lists in sync across tabs and after bfcache restore (browser Back).
 * localStorage "storage" events do not fire in the writing tab; CustomEvents do not cross tabs.
 */

export const PRIZE_VAULT_HACKATHONS_KEY = 'prize_vault_hackathons'
export const REGISTERED_HACKATHONS_KEY = 'registered_hackathons'
const HACKATHONS_SYNC_CHANNEL = 'prize_vault_hackathons_sync_v1'

export function broadcastHackathonsDatasetChanged(): void {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return
  try {
    const bc = new BroadcastChannel(HACKATHONS_SYNC_CHANNEL)
    bc.postMessage({ type: 'hackathons' })
    bc.close()
  } catch {
    // ignore
  }
}

/**
 * Reload when: same-tab custom event, other-tab storage, BroadcastChannel, or bfcache restore.
 */
export function subscribeHackathonsDatasetChanged(
  onReload: () => void,
  extraStorageKeys: string[] = [],
): () => void {
  if (typeof window === 'undefined') return () => {}

  const storageKeys = new Set([
    PRIZE_VAULT_HACKATHONS_KEY,
    REGISTERED_HACKATHONS_KEY,
    ...extraStorageKeys,
  ])

  const handler = () => onReload()
  window.addEventListener('prize_vault_hackathons_changed', handler)

  const onStorage = (e: StorageEvent) => {
    if (e.key === null || storageKeys.has(String(e.key))) handler()
  }
  window.addEventListener('storage', onStorage)

  const onPageShow = (e: PageTransitionEvent) => {
    if (e.persisted) handler()
  }
  window.addEventListener('pageshow', onPageShow as EventListener)

  let bc: BroadcastChannel | null = null
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      bc = new BroadcastChannel(HACKATHONS_SYNC_CHANNEL)
      bc.onmessage = () => handler()
    } catch {
      // ignore
    }
  }

  return () => {
    window.removeEventListener('prize_vault_hackathons_changed', handler)
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('pageshow', onPageShow as EventListener)
    bc?.close()
  }
}
