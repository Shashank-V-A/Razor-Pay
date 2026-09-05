import { UserProfile } from '../../types/holder'
import { migrateLocalKey } from '../../utils/hackPayStorage'

const STORAGE_KEY = 'hack_pay_user_profiles'
if (typeof window !== 'undefined') {
  migrateLocalKey('prize_vault_user_profiles', STORAGE_KEY)
  migrateLocalKey('twin_lock_user_profiles', STORAGE_KEY)
}

type StoredProfile = UserProfile & { updatedAt?: string }

function getStorage(): Record<string, StoredProfile> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch (_) {
    // ignore
  }
  return {}
}

export function getProfileForWallet(wallet: string): UserProfile | null {
  const key = wallet.toLowerCase().trim()
  const all = getStorage()
  const stored = all[key]
  if (!stored || !stored.name || !stored.role) return null
  return {
    name: stored.name,
    email: stored.email || key,
    college: stored.college,
    usn: stored.usn,
    upi: stored.upi,
    role: stored.role,
  }
}

export function setProfileForWallet(wallet: string, profile: UserProfile): void {
  const key = wallet.toLowerCase().trim()
  const all = getStorage()
  all[key] = {
    ...profile,
    updatedAt: new Date().toISOString(),
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch (_) {
    // ignore
  }
}
