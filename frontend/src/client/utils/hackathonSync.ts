/**
 * Keeps hackathon lists in sync across tabs and after bfcache restore (browser Back).
 * localStorage "storage" events do not fire in the writing tab; CustomEvents do not cross tabs.
 */

import { migrateLocalKey } from './twinLockStorage'

export const TWIN_LOCK_HACKATHONS_KEY = 'twin_lock_hackathons'
/** @deprecated use TWIN_LOCK_HACKATHONS_KEY */
export const PRIZE_VAULT_HACKATHONS_KEY = TWIN_LOCK_HACKATHONS_KEY
export const REGISTERED_HACKATHONS_KEY = 'registered_hackathons'
export const TWIN_LOCK_TIMELINE_KEY = 'twin_lock_hackathon_timelines'
export const HACKATHONS_CHANGED_EVENT = 'twin_lock_hackathons_changed'
const LEGACY_HACKATHONS_CHANGED_EVENT = 'prize_vault_hackathons_changed'
const HACKATHONS_SYNC_CHANNEL = 'twin_lock_hackathons_sync_v1'
const LEGACY_SYNC_CHANNEL = 'prize_vault_hackathons_sync_v1'

if (typeof window !== 'undefined') {
  migrateLocalKey('prize_vault_hackathons', TWIN_LOCK_HACKATHONS_KEY)
  migrateLocalKey('prize_vault_hackathon_timelines', TWIN_LOCK_TIMELINE_KEY)
}

export function broadcastHackathonsDatasetChanged(): void {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return
  for (const name of [HACKATHONS_SYNC_CHANNEL, LEGACY_SYNC_CHANNEL]) {
    try {
      const bc = new BroadcastChannel(name)
      bc.postMessage({ type: 'hackathons' })
      bc.close()
    } catch {
      // ignore
    }
  }
}

export function emitHackathonsChanged(): void {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new CustomEvent(HACKATHONS_CHANGED_EVENT))
    window.dispatchEvent(new CustomEvent(LEGACY_HACKATHONS_CHANGED_EVENT))
  } catch {
    // ignore
  }
  broadcastHackathonsDatasetChanged()
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
    TWIN_LOCK_HACKATHONS_KEY,
    'prize_vault_hackathons',
    REGISTERED_HACKATHONS_KEY,
    ...extraStorageKeys,
  ])

  const handler = () => onReload()
  window.addEventListener(HACKATHONS_CHANGED_EVENT, handler)
  window.addEventListener(LEGACY_HACKATHONS_CHANGED_EVENT, handler)

  const onStorage = (e: StorageEvent) => {
    if (e.key === null || storageKeys.has(String(e.key))) handler()
  }
  window.addEventListener('storage', onStorage)

  const onPageShow = (e: PageTransitionEvent) => {
    if (e.persisted) handler()
  }
  window.addEventListener('pageshow', onPageShow as EventListener)

  const channels: BroadcastChannel[] = []
  if (typeof BroadcastChannel !== 'undefined') {
    for (const name of [HACKATHONS_SYNC_CHANNEL, LEGACY_SYNC_CHANNEL]) {
      try {
        const bc = new BroadcastChannel(name)
        bc.onmessage = () => handler()
        channels.push(bc)
      } catch {
        // ignore
      }
    }
  }

  return () => {
    window.removeEventListener(HACKATHONS_CHANGED_EVENT, handler)
    window.removeEventListener(LEGACY_HACKATHONS_CHANGED_EVENT, handler)
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('pageshow', onPageShow as EventListener)
    for (const bc of channels) bc.close()
  }
}
