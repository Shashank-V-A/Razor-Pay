import { NextResponse } from 'next/server'
import { runAgentTick } from '@/lib/agent/runTick'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function handleTick() {
  try {
    const result = await runAgentTick()
    return NextResponse.json(result, { status: result.ok ? 200 : 500 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Agent tick failed'
    return NextResponse.json({ ok: false, error: message, actions: [] }, { status: 500 })
  }
}

export async function GET() {
  return handleTick()
}

export async function POST() {
  return handleTick()
}
