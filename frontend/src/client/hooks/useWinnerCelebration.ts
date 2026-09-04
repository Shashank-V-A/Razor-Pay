"use client"

import { useEffect } from "react"
import { fireWinnerConfetti } from "@/registry/magicui/confetti"

const STORAGE_PREFIX = "pv_winner_confetti_"

/** Celebrate a winner once per browser session for a given key. */
export function celebrateWinnerOnce(key: string): void {
  if (typeof window === "undefined" || !key) return
  const storageKey = STORAGE_PREFIX + key
  if (sessionStorage.getItem(storageKey)) return
  sessionStorage.setItem(storageKey, "1")
  fireWinnerConfetti()
}

/** Immediate celebration (organizer save, etc.) — always fires. */
export function celebrateWinnersNow(): void {
  fireWinnerConfetti()
}

/** Trigger confetti once when `active` becomes true (participant/sponsor views). */
export function useWinnerCelebration(active: boolean, key: string | null | undefined): void {
  useEffect(() => {
    if (!active || !key) return
    celebrateWinnerOnce(key)
  }, [active, key])
}
