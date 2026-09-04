import { useCallback, useEffect, useRef, useState } from 'react'
import { Hackathon } from '../types/hackathon'
import { getHackathonsFromStorage } from '../holder/utils/roleDetection'
import { subscribeHackathonsDatasetChanged } from '../utils/hackathonSync'
import { PROPOSALS_STORAGE_KEY, getPayoutProposals } from '../utils/payoutProposalsStorage'
import { fetchHackathons, fetchProposals } from '../services/hackathonApi'

const RELOAD_DEBOUNCE_MS = 300

/**
 * Live hackathon list — loads from Supabase via API, caches in localStorage as fallback.
 */
export function useHackathons(filterFn?: (h: Hackathon) => boolean): {
  hackathons: Hackathon[]
  reload: () => void
  loading: boolean
} {
  const [hackathons, setHackathons] = useState<Hackathon[]>(() => getHackathonsFromStorage())
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reload = useCallback(() => {
    setLoading(true)
    fetchHackathons()
      .then((list) => setHackathons(list))
      .catch(() => setHackathons(getHackathonsFromStorage()))
      .finally(() => setLoading(false))
  }, [])

  const reloadDebounced = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => reload(), RELOAD_DEBOUNCE_MS)
  }, [reload])

  useEffect(() => {
    reload()
    return subscribeHackathonsDatasetChanged(reloadDebounced)
  }, [reload, reloadDebounced])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const list = typeof filterFn === 'function' ? hackathons.filter(filterFn) : hackathons
  return { hackathons: list, reload, loading }
}

/** Live payout proposals from Supabase API with localStorage fallback. */
export function usePayoutProposals(): {
  proposals: Record<string, unknown>[]
  reload: () => void
  loading: boolean
} {
  const [proposals, setProposals] = useState<Record<string, unknown>[]>(() => getPayoutProposals())
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reload = useCallback(() => {
    setLoading(true)
    fetchProposals()
      .then((list) => setProposals(list))
      .catch(() => setProposals(getPayoutProposals()))
      .finally(() => setLoading(false))
  }, [])

  const reloadDebounced = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => reload(), RELOAD_DEBOUNCE_MS)
  }, [reload])

  useEffect(() => {
    reload()
    return subscribeHackathonsDatasetChanged(reloadDebounced, [PROPOSALS_STORAGE_KEY])
  }, [reload, reloadDebounced])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return { proposals, reload, loading }
}
