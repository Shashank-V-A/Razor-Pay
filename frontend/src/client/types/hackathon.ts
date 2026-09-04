// Hackathon-related TypeScript types

export interface PrizePool {
  total: number
  currency: string
  locked: boolean
}

export interface Participant {
  id: string
  name: string
  team?: string
  project?: string
  track?: string
  registeredAt: string
  status: 'registered' | 'shortlisted' | 'winner'
  payoutAddress?: string
}

export interface Winner {
  id: string
  name: string
  team?: string
  prizeTier: '1st' | '2nd' | '3rd' | 'special'
  payoutAddress: string
  prizeAmount: number
}

export type AgentStage = 'event_ended' | 'propose' | 'released'

export type AgentNotification = {
  id: string
  wallet: string
  role: 'organizer' | 'sponsor'
  hackathonId: string
  hackathonName: string
  stage: AgentStage
  title: string
  body: string
  href: string
  view?: string
  txHash?: string
  txUrl?: string
  createdAt: string
  readAt?: string | null
}

export type HackathonAgentState = {
  notified?: Partial<Record<AgentStage, string>>
  inbox?: AgentNotification[]
}

export interface Hackathon {
  id: string
  name: string
  startDate: string
  endDate: string
  prizePool: PrizePool
  organizerAddress: string
  sponsorAddress: string
  escrowAddress: string
  status: 'upcoming' | 'live' | 'completed'
  participantCount: number
  participants?: Participant[]
  winners?: Winner[]
  winnersSelected: boolean
  payoutProposed: boolean
  /** Set after execute_release completes for this event */
  payoutExecuted?: boolean
  /** execute_release transaction hash (Stellar Expert certificate) */
  payoutTxHash?: string
  /** Set when sponsor funding reaches the full prize pool */
  sponsorFunded?: boolean
  /** Optional display names when known */
  organizerName?: string
  sponsorName?: string
  /** Escrow agent notify-once state and inbox (payload.agent) */
  agent?: HackathonAgentState
  description?: string
  /** City or venue label shown on the landing globe */
  venueCity?: string
  /** Precise map coordinates (WGS84). Auto-filled from venueCity when known. */
  latitude?: number
  longitude?: number
}

export type HackathonStatus = 'upcoming' | 'live' | 'completed'
export type ParticipantStatus = 'registered' | 'shortlisted' | 'winner'
export type PrizeTier = '1st' | '2nd' | '3rd' | 'special'
