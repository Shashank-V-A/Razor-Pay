import type { AgentNotification, AgentStage, Hackathon, HackathonAgentState } from '@/client/types/hackathon'
import { deriveStatus, escrowBalanceXlm, payoutReceiptUrl } from '@/client/utils/format'
import { canExecuteRelease, getPayoutWorkflowStage } from '@/client/utils/payoutWorkflow'
import { handleExecute } from '@/lib/backend/escrowHandlers'
import { isSupabaseConfigured } from '@/lib/supabase/env'
import { rowToHackathon, rowToProposal } from '@/lib/supabase/mappers'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { syncExecutedPayouts } from '@/lib/supabase/syncExecutedPayouts'

export type AgentTickAction = {
  stage: AgentStage | 'execute_failed'
  hackathonId: string
  hackathonName: string
  detail: string
  txHash?: string
}

export type AgentTickResult = {
  ok: boolean
  ranAt: string
  source: 'supabase' | 'none'
  actions: AgentTickAction[]
  error?: string
}

function nowIso() {
  return new Date().toISOString()
}

function notifyId(stage: AgentStage, hackathonId: string, wallet: string) {
  return `agent_${stage}_${hackathonId}_${wallet.slice(-8)}_${Date.now()}`
}

function findProposal(hackathon: Hackathon & { dbId?: string }, proposals: Record<string, unknown>[]) {
  const keys = new Set([hackathon.id, hackathon.dbId].filter(Boolean).map((k) => String(k)))
  return proposals.find((p) => keys.has(String(p.hackathonId || '')) || keys.has(String(p.hackathonDbId || '')))
}

function pushNotice(
  inbox: AgentNotification[],
  notice: Omit<AgentNotification, 'id' | 'createdAt'>,
) {
  inbox.push({
    ...notice,
    id: notifyId(notice.stage, notice.hackathonId, notice.wallet),
    createdAt: nowIso(),
  })
}

async function saveAgentPayload(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  rowId: string,
  existingPayload: Record<string, unknown>,
  agent: HackathonAgentState,
  extra: Record<string, unknown> = {},
) {
  const { error } = await supabase
    .from('hackathons')
    .update({
      payload: {
        ...existingPayload,
        ...extra,
        agent,
      },
    })
    .eq('id', rowId)
  if (error) throw error
}

export async function runAgentTick(): Promise<AgentTickResult> {
  const ranAt = nowIso()
  if (!isSupabaseConfigured()) {
    return { ok: true, ranAt, source: 'none', actions: [], error: 'Supabase is not configured' }
  }

  const supabase = createSupabaseServerClient()
  const actions: AgentTickAction[] = []

  const { data: hackRows, error: hackError } = await supabase
    .from('hackathons')
    .select('*')
    .order('created_at', { ascending: false })
  if (hackError) {
    return { ok: false, ranAt, source: 'supabase', actions, error: hackError.message }
  }

  const { data: proposalRows, error: proposalError } = await supabase.from('proposals').select('*')
  if (proposalError) {
    return { ok: false, ranAt, source: 'supabase', actions, error: proposalError.message }
  }

  const proposals = (proposalRows || []).map((row) => rowToProposal(row))

  for (const row of hackRows || []) {
    const hackathon = rowToHackathon(row)
    const payload = (row.payload || {}) as Record<string, unknown>
    const agent: HackathonAgentState = {
      notified: { ...(hackathon.agent?.notified || {}) },
      inbox: [...(hackathon.agent?.inbox || [])],
    }
    const proposal = findProposal(hackathon, proposals)
    const matchedProposal: Record<string, unknown> | undefined = proposal
      ? { ...proposal, hackathonId: hackathon.id }
      : undefined
    const workflow = getPayoutWorkflowStage(hackathon, matchedProposal ? [matchedProposal] : [])
    const ended = deriveStatus(hackathon) === 'completed'
    let dirty = false

    if (ended && !hackathon.winnersSelected && !agent.notified?.event_ended) {
      const body = `${hackathon.name} has ended. Choose winners so the payout can be proposed.`
      if (hackathon.organizerAddress) {
        pushNotice(agent.inbox!, {
          wallet: hackathon.organizerAddress,
          role: 'organizer',
          hackathonId: hackathon.id,
          hackathonName: hackathon.name,
          stage: 'event_ended',
          title: 'Event ended — choose winners',
          body,
          href: '/issuer',
          view: 'winners',
        })
      }
      if (hackathon.sponsorAddress) {
        pushNotice(agent.inbox!, {
          wallet: hackathon.sponsorAddress,
          role: 'sponsor',
          hackathonId: hackathon.id,
          hackathonName: hackathon.name,
          stage: 'event_ended',
          title: 'Event ended — waiting on winners',
          body: `${hackathon.name} has ended. The organizer needs to select winners before you can co-approve a payout.`,
          href: '/verifier',
        })
      }
      agent.notified!.event_ended = nowIso()
      dirty = true
      actions.push({
        stage: 'event_ended',
        hackathonId: hackathon.id,
        hackathonName: hackathon.name,
        detail: 'Notified organizer and sponsor to choose winners',
      })
    }

    if (workflow === 'winners_selected' && !agent.notified?.propose && hackathon.organizerAddress) {
      pushNotice(agent.inbox!, {
        wallet: hackathon.organizerAddress,
        role: 'organizer',
        hackathonId: hackathon.id,
        hackathonName: hackathon.name,
        stage: 'propose',
        title: 'Winners saved — propose the payout',
        body: `Winners for ${hackathon.name} are on file. Propose the INR payout so the sponsor can co-approve.`,
        href: '/issuer',
        view: 'payouts',
      })
      agent.notified!.propose = nowIso()
      dirty = true
      actions.push({
        stage: 'propose',
        hackathonId: hackathon.id,
        hackathonName: hackathon.name,
        detail: 'Reminded organizer to propose the payout',
      })
    }

    if (
      matchedProposal &&
      canExecuteRelease(matchedProposal) &&
      !hackathon.payoutExecuted &&
      !agent.notified?.released
    ) {
      const onChainId = matchedProposal.onChainProposalId ?? matchedProposal.onchain_proposal_id
      const winners = Array.isArray(matchedProposal.winners)
        ? (matchedProposal.winners as Array<{ payoutAddress?: string; prizeAmount?: number; project?: string; githubUrl?: string; name?: string }>)
        : []
      const executed = await handleExecute({
        proposal_id: onChainId as number | string,
        payouts: winners.map((w) => ({
          winner_address: w.payoutAddress,
          amount: w.prizeAmount,
        })),
        winners,
        vaultBalanceInr: escrowBalanceXlm(hackathon),
        hackathonId: hackathon.id,
      })
      if (!executed.success) {
        actions.push({
          stage: 'execute_failed',
          hackathonId: hackathon.id,
          hackathonName: hackathon.name,
          detail: executed.error,
        })
      } else {
        const executedAt = nowIso()
        const txUrl = payoutReceiptUrl(executed.txHash)
        const updatedProposal = {
          ...matchedProposal,
          status: 'executed',
          txHash: executed.txHash,
          executedAt,
        }
        await supabase
          .from('proposals')
          .update({
            status: 'executed',
            executed_at: executedAt,
            payload: updatedProposal,
          })
          .eq('legacy_id', String(matchedProposal.id))

        if (matchedProposal.dbId) {
          await syncExecutedPayouts(supabase, String(matchedProposal.dbId), updatedProposal)
        }

        if (hackathon.organizerAddress) {
          pushNotice(agent.inbox!, {
            wallet: hackathon.organizerAddress,
            role: 'organizer',
            hackathonId: hackathon.id,
            hackathonName: hackathon.name,
            stage: 'released',
            title: 'Payout released in INR',
            body: `Both sides approved. The agent executed Razorpay payouts for ${hackathon.name}.`,
            href: '/issuer',
            view: 'payouts',
            txHash: executed.txHash,
            txUrl,
          })
        }
        if (hackathon.sponsorAddress) {
          pushNotice(agent.inbox!, {
            wallet: hackathon.sponsorAddress,
            role: 'sponsor',
            hackathonId: hackathon.id,
            hackathonName: hackathon.name,
            stage: 'released',
            title: 'Payout released in INR',
            body: `The prize pool for ${hackathon.name} was sent to winners via Razorpay.`,
            href: '/verifier',
            txHash: executed.txHash,
            txUrl,
          })
        }
        agent.notified!.released = executedAt
        dirty = true
        await saveAgentPayload(supabase, row.id, payload, agent, { payoutExecuted: true })
        dirty = false
        actions.push({
          stage: 'released',
          hackathonId: hackathon.id,
          hackathonName: hackathon.name,
          detail: 'Executed release after dual approval',
          txHash: executed.txHash,
        })
      }
    }

    if (dirty) {
      await saveAgentPayload(supabase, row.id, payload, agent)
    }
  }

  return { ok: true, ranAt, source: 'supabase', actions }
}

export async function listAgentNotifications(wallet: string): Promise<AgentNotification[]> {
  if (!wallet.trim() || !isSupabaseConfigured()) return []
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.from('hackathons').select('payload, legacy_id, id')
  if (error || !data) return []

  const needle = wallet.trim().toLowerCase()
  const notices: AgentNotification[] = []
  for (const row of data) {
    const payload = (row.payload || {}) as Record<string, unknown>
    const agent = payload.agent as HackathonAgentState | undefined
    for (const item of agent?.inbox || []) {
      if (item.wallet?.trim().toLowerCase() === needle) notices.push(item)
    }
  }
  return notices.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}

export async function markAgentNotificationRead(wallet: string, noticeId: string): Promise<boolean> {
  if (!wallet.trim() || !noticeId || !isSupabaseConfigured()) return false
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.from('hackathons').select('id, payload')
  if (error || !data) return false

  const needle = wallet.trim().toLowerCase()
  for (const row of data) {
    const payload = (row.payload || {}) as Record<string, unknown>
    const agent = payload.agent as HackathonAgentState | undefined
    if (!agent?.inbox?.length) continue
    const next = agent.inbox.map((item) =>
      item.id === noticeId && item.wallet.trim().toLowerCase() === needle
        ? { ...item, readAt: nowIso() }
        : item,
    )
    if (JSON.stringify(next) === JSON.stringify(agent.inbox)) continue
    await saveAgentPayload(supabase, row.id, payload, { ...agent, inbox: next })
    return true
  }
  return false
}
