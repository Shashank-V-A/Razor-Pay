import type { AgentLogEntry, AgentStage } from '@/client/types/hackathon'

/** Deterministic tick summary. Does not call an LLM and cannot move money. */
export function summarizeAgentLog(
  actions: Array<{ stage: string; hackathonName: string; detail: string }>,
): string {
  if (!actions.length) {
    return 'No new agent actions this tick. Dual-control is waiting on humans, or this event is already complete.'
  }
  return actions
    .map((action) => `${action.hackathonName}: ${action.stage.replace(/_/g, ' ')} — ${action.detail}`)
    .join(' ')
}

export function appendAgentLog(
  log: AgentLogEntry[] | undefined,
  entry: Omit<AgentLogEntry, 'at'> & { at?: string },
): AgentLogEntry[] {
  const next: AgentLogEntry[] = [
    ...(log || []),
    {
      ...entry,
      at: entry.at || new Date().toISOString(),
      stage: entry.stage as AgentStage,
    },
  ]
  return next.slice(-24)
}
