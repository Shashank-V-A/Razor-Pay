import type { AgentNotification, AgentTickResult } from '../types/hackathon'

export type { AgentTickResult }

export async function tickAgent(): Promise<AgentTickResult | null> {
  try {
    const res = await fetch('/api/agent/tick', { method: 'POST' })
    const data = (await res.json()) as Partial<AgentTickResult>
    if (!data || typeof data !== 'object') return null
    return {
      ok: Boolean(data.ok),
      ranAt: typeof data.ranAt === 'string' ? data.ranAt : new Date().toISOString(),
      source: data.source === 'supabase' ? 'supabase' : 'none',
      actions: Array.isArray(data.actions) ? data.actions : [],
      summary: typeof data.summary === 'string' ? data.summary : '',
      error: typeof data.error === 'string' ? data.error : undefined,
    }
  } catch {
    return null
  }
}

export async function fetchAgentNotifications(wallet: string): Promise<AgentNotification[]> {
  if (!wallet.trim()) return []
  const params = new URLSearchParams({ wallet: wallet.trim() })
  const res = await fetch(`/api/agent/notifications?${params.toString()}`)
  const data = (await res.json()) as { notifications?: AgentNotification[] }
  return Array.isArray(data.notifications) ? data.notifications : []
}

export async function markAgentNotificationRead(wallet: string, id: string): Promise<void> {
  await fetch('/api/agent/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet, id }),
  })
}
