import type { Hackathon, Winner } from '../types/hackathon'

function norm(value: string | undefined | null): string {
  return String(value || '').trim().toLowerCase()
}

/** Match a winner row to the signed-in participant (email, roster id, or UPI). */
export function findWinnerForAccount(hackathon: Hackathon, account: string | null): Winner | undefined {
  if (!account) return undefined
  const key = norm(account)
  const participant = hackathon.participants?.find(
    (p) => norm(p.payoutAddress) === key || norm(p.id) === key || norm(p.name) === key,
  )
  return (hackathon.winners || []).find((w) => {
    if (norm(w.payoutAddress) === key) return true
    if (participant && (w.id === participant.id || norm(w.name) === norm(participant.name))) return true
    return false
  })
}
