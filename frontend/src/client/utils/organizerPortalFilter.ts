/**
 * Hackathons belong to the organizer portal when organizerAddress matches
 * the connected session wallet (no hardcoded demo addresses).
 */
export function hackathonBelongsToOrganizerPortal(
  hackathon: { organizerAddress?: string },
  sessionWallet: string | null | undefined,
): boolean {
  const o = (hackathon.organizerAddress || '').trim().toLowerCase()
  const w = (sessionWallet || '').trim().toLowerCase()
  if (!o || !w) return false
  return o === w
}
