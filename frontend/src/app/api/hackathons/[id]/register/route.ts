import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/env'
import { registerWalletForHackathon } from '@/lib/supabase/registerParticipant'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Supabase is not configured' },
      { status: 503 },
    )
  }

  try {
    const body = (await request.json()) as { wallet?: string; name?: string }
    const wallet = body.wallet?.trim()

    if (!wallet) {
      return NextResponse.json({ success: false, error: 'wallet is required' }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()
    const result = await registerWalletForHackathon(supabase, id, wallet, body.name)

    if (result.alreadyRegistered) {
      return NextResponse.json({
        success: false,
        error: 'You are already registered for this event.',
        hackathon: result.hackathon,
      })
    }

    return NextResponse.json({ success: true, hackathon: result.hackathon })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
