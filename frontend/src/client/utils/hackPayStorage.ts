/** Copy a legacy localStorage key once so HackPay keeps existing browser data. */
export function migrateLocalKey(oldKey: string, newKey: string): void {
  if (typeof window === 'undefined' || oldKey === newKey) return
  try {
    if (localStorage.getItem(newKey) != null) return
    const legacy = localStorage.getItem(oldKey)
    if (legacy != null) localStorage.setItem(newKey, legacy)
  } catch {
    // ignore quota / private mode
  }
}

export function readLocalKey(newKey: string, oldKey: string): string | null {
  migrateLocalKey(oldKey, newKey)
  try {
    return localStorage.getItem(newKey)
  } catch {
    return null
  }
}
