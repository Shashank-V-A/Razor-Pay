import { NextResponse } from 'next/server'
import { listAgentNotifications, markAgentNotificationRead } from '@/lib/agent/runTick'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const wallet = new URL(request.url).searchParams.get('wallet')?.trim() || ''
  if (!wallet) {
    return NextResponse.json({ notifications: [] })
  }
  try {
    const notifications = await listAgentNotifications(wallet)
    return NextResponse.json({ notifications })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load notifications'
    return NextResponse.json({ notifications: [], error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { wallet?: string; id?: string }
    const wallet = body.wallet?.trim() || ''
    const id = body.id?.trim() || ''
    if (!wallet || !id) {
      return NextResponse.json({ success: false, error: 'wallet and id are required' }, { status: 400 })
    }
    const success = await markAgentNotificationRead(wallet, id)
    return NextResponse.json({ success })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update notification'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
