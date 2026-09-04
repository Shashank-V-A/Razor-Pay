import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/env'
import {
  ensureOrganizer,
  ensureParticipant,
  ensureSponsor,
} from '@/lib/supabase/mappers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SyncBody = {
  wallet?: string
  role?: 'organizer' | 'sponsor' | 'participant'
  name?: string
  email?: string
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Supabase is not configured' },
      { status: 503 },
    )
  }

  try {
    const body = (await request.json()) as SyncBody
    const wallet = body.wallet?.trim()
    const role = body.role

    if (!wallet) {
      return NextResponse.json({ success: false, error: 'wallet is required' }, { status: 400 })
    }
    if (role !== 'organizer' && role !== 'sponsor' && role !== 'participant') {
      return NextResponse.json({ success: false, error: 'valid role is required' }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()
    let profileId: string

    if (role === 'organizer') {
      profileId = await ensureOrganizer(supabase, wallet, body.name, body.email)
    } else if (role === 'sponsor') {
      profileId = await ensureSponsor(supabase, wallet, body.name, body.email)
    } else {
      profileId = await ensureParticipant(supabase, wallet, body.name, body.email)
    }

    return NextResponse.json({ success: true, role, profileId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Session sync failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
