import type { AgentNotification } from '../types/hackathon'

export async function tickAgent(): Promise<void> {
  try {
    await fetch('/api/agent/tick', { method: 'POST' })
  } catch {
    // Dashboard still works if the watchdog is down.
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
