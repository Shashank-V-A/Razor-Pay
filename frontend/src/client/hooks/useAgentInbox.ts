import { useCallback, useEffect, useState } from 'react'
import type { AgentNotification } from '../types/hackathon'
import { fetchAgentNotifications, markAgentNotificationRead, tickAgent } from '../services/agentApi'

const POLL_MS = 60_000

export function useAgentInbox(wallet?: string | null) {
  const [notifications, setNotifications] = useState<AgentNotification[]>([])

  const reload = useCallback(async () => {
    if (!wallet?.trim()) {
      setNotifications([])
      return
    }
    await tickAgent()
    const list = await fetchAgentNotifications(wallet)
    setNotifications(list)
  }, [wallet])

  useEffect(() => {
    void reload()
    const timer = window.setInterval(() => {
      void reload()
    }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [reload])

  const unread = notifications.filter((n) => !n.readAt)

  const dismiss = useCallback(
    async (id: string) => {
      if (!wallet) return
      setNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)),
      )
      await markAgentNotificationRead(wallet, id)
    },
    [wallet],
  )

  return { notifications, unread, reload, dismiss }
}
