import { useMemo, useState } from 'react'
import Icon from '../../components/Icon'
import AddressChip from '../../components/AddressChip'
import { Hackathon } from '../../types/hackathon'
import { saveHackathonsToStorage } from '../utils/roleDetection'
import { savePayoutProposals } from '../../utils/payoutProposalsStorage'
import { useHackathons, usePayoutProposals } from '../../hooks/useHackathons'
import {
  STATUS_META,
  deriveStatus,
  formatDate,
  formatDateRange,
  formatXlm,
  participantCount,
  prizeCurrency,
  prizeTotal,
} from '../../utils/format'

/**
 * NOTE ON REACHABILITY: sponsors are redirected from /holder to /verifier in
 * three places (see HolderApp.tsx), so this view is not currently reachable in
 * normal use -- the shipping sponsor console is src/recruiter.jsx. It is kept
 * correct rather than deleted so the redirect can be relaxed without inheriting
 * the bugs this file used to carry.
 */

interface SponsorDashboardProps {
  userWallet: string | null
  onNavigate?: (view: string, params?: Record<string, unknown>) => void
}

interface Proposal {
  id?: string
  hackathonId?: string
  hackathonName?: string
  createdAt?: string
  status?: string
  organizerApproved?: boolean
  sponsorApproved?: boolean
  winners?: { name?: string; prizeTier?: string; payoutAddress?: string; prizeAmount?: number }[]
  eventEndDate?: string
}

export default function SponsorDashboard({ userWallet, onNavigate }: SponsorDashboardProps) {
  const { hackathons, reload } = useHackathons()
  const { proposals, reload: reloadProposals } = usePayoutProposals()
  // One amount per hackathon. A single shared field filled every card's input
  // and spent the same value whichever card you clicked.
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  const mine = useMemo(() => {
    if (!userWallet) return []
    return hackathons.filter(
      (h) => h.sponsorAddress?.toLowerCase() === userWallet.toLowerCase(),
    )
  }, [hackathons, userWallet])

  const available = useMemo(() => {
    if (!userWallet) return []
    return hackathons.filter(
      (h) =>
        h.sponsorAddress?.toLowerCase() !== userWallet.toLowerCase() &&
        deriveStatus(h) !== 'completed',
    )
  }, [hackathons, userWallet])

  /**
   * Only proposals for events THIS sponsor funds. The original returned every
   * pending proposal in the browser, letting any sponsor approve a release for
   * an event they had nothing to do with.
   */
  const awaitingMyApproval = useMemo<Proposal[]>(() => {
    if (!userWallet) return []
    const myIds = new Set(mine.map((h) => h.id))
    return (proposals as Proposal[]).filter(
      (p) =>
        p.organizerApproved &&
        !p.sponsorApproved &&
        p.status !== 'executed' &&
        p.hackathonId &&
        myIds.has(p.hackathonId),
    )
  }, [proposals, userWallet, mine])

  const totalCommitted = mine.reduce((sum, h) => sum + prizeTotal(h), 0)

  const handleContribute = (hackathon: Hackathon) => {
    const raw = amounts[hackathon.id] ?? ''
    const value = parseFloat(raw)
    if (!raw || Number.isNaN(value) || value <= 0) {
      setNotice({ tone: 'danger', text: 'Enter an amount greater than 0.' })
      return
    }

    // Never reassign an existing sponsor -- that silently hijacked their event
    // and changed who detectUserRole() classifies as its sponsor.
    const existing = (hackathon.sponsorAddress || '').trim()
    if (existing && existing.toLowerCase() !== (userWallet || '').toLowerCase()) {
      setNotice({
        tone: 'danger',
        text: 'This event already has a different sponsor, so it cannot be reassigned here.',
      })
      return
    }

    setBusyId(hackathon.id)
    try {
      const updated = hackathons.map((h) =>
        h.id === hackathon.id
          ? {
              ...h,
              prizePool: { ...h.prizePool, total: prizeTotal(h) + value },
              sponsorAddress: existing || userWallet || '',
            }
          : h,
      )
      saveHackathonsToStorage(updated)
      reload()
      setAmounts((prev) => ({ ...prev, [hackathon.id]: '' }))
      setNotice({
        tone: 'success',
        text: `Committed ${formatXlm(value)} ${prizeCurrency(hackathon)} to ${hackathon.name}.`,
      })
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Contribution failed:', error)
      setNotice({ tone: 'danger', text: 'Could not save the contribution. Try again.' })
    } finally {
      setBusyId(null)
    }
  }

  const handleApprovePayout = (proposalId?: string) => {
    if (!proposalId) return
    setBusyId(proposalId)
    try {
      const updated = (proposals as Proposal[]).map((p) =>
        p.id === proposalId ? { ...p, sponsorApproved: true } : p,
      )
      savePayoutProposals(updated as Record<string, unknown>[])
      reloadProposals()
      setNotice({
        tone: 'success',
        text: 'Approved. The orchestration agent can now execute INR payouts.',
      })
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Approval failed:', error)
      setNotice({ tone: 'danger', text: 'Approval failed. Try again.' })
    } finally {
      setBusyId(null)
    }
  }

  if (!userWallet) {
    return (
      <div className="pv-alert pv-alert--warning">
        <span className="pv-alert__icon">
          <Icon name="alert" size={16} />
        </span>
        <div className="pv-alert__content">
          <p className="pv-alert__text">Sign in to see sponsor features.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pv-stack pv-stack--lg">
      {notice ? (
        <div className={`pv-alert pv-alert--${notice.tone}`} role="status" aria-live="polite">
          <span className="pv-alert__icon">
            <Icon name={notice.tone === 'success' ? 'checkCircle' : 'alert'} size={16} />
          </span>
          <div className="pv-alert__content">
            <p className="pv-alert__text">{notice.text}</p>
          </div>
          <button
            type="button"
            className="pv-btn pv-btn--ghost pv-btn--xs pv-btn--icon"
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      ) : null}

      <div className="pv-stats">
        <div className="pv-stat">
          <span className="pv-stat__label">
            <Icon name="calendar" size={12} />
            Sponsored events
          </span>
          <span className="pv-stat__value">{mine.length}</span>
        </div>
        <div className="pv-stat">
          <span className="pv-stat__label">
            <Icon name="wallet" size={12} />
            Committed
          </span>
          <span className="pv-stat__value">
            {formatXlm(totalCommitted)}
            <span className="pv-stat__unit">INR</span>
          </span>
        </div>
        <div className="pv-stat">
          <span className="pv-stat__label">
            <Icon name="clock" size={12} />
            Awaiting my approval
          </span>
          <span className="pv-stat__value">{awaitingMyApproval.length}</span>
        </div>
      </div>

      {awaitingMyApproval.length > 0 ? (
        <section className="pv-stack">
          <div className="pv-section__header">
            <div>
              <h3 className="pv-section__title">Payouts needing your approval</h3>
              <p className="pv-section__desc">
                Review the winners and amounts. Approving lets the organizer release funds.
              </p>
            </div>
          </div>

          {awaitingMyApproval.map((p) => {
            const total = (p.winners || []).reduce(
              (s, w) => s + (Number(w.prizeAmount) || 0),
              0,
            )
            return (
              <article className="pv-card" key={p.id}>
                <div className="pv-card__header">
                  <div>
                    <h4 className="pv-card__title">{p.hackathonName}</h4>
                    <p className="pv-card__subtitle">
                      Ended {formatDate(p.eventEndDate)} · {(p.winners || []).length} winner
                      {(p.winners || []).length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="pv-card__actions">
                    <span className="pv-badge pv-badge--warning">Awaiting you</span>
                  </div>
                </div>
                <div className="pv-card__body pv-card__body--flush">
                  <div className="pv-table-wrap">
                    <table className="pv-table">
                      <thead>
                        <tr>
                          <th scope="col">Winner</th>
                          <th scope="col">Tier</th>
                          <th scope="col">Payout address</th>
                          <th scope="col" className="pv-table__num">
                            Amount (INR)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(p.winners || []).map((w, i) => (
                          <tr key={`${p.id}-${i}`}>
                            <td className="pv-table__primary">{w.name || 'Winner'}</td>
                            <td>
                              <span className="pv-badge">{w.prizeTier || '--'}</span>
                            </td>
                            <td>
                              <AddressChip address={w.payoutAddress} label="payout address" />
                            </td>
                            <td className="pv-table__num">{formatXlm(w.prizeAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={3} style={{ fontWeight: 'var(--pv-weight-semibold)' }}>
                            Total
                          </td>
                          <td
                            className="pv-table__num"
                            style={{ fontWeight: 'var(--pv-weight-semibold)' }}
                          >
                            {formatXlm(total)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
                <div className="pv-card__footer" style={{ justifyContent: 'space-between' }}>
                  <button
                    type="button"
                    className="pv-btn pv-btn--ghost pv-btn--sm"
                    onClick={() => onNavigate?.('event', { hackathonId: p.hackathonId })}
                  >
                    View event
                  </button>
                  <button
                    type="button"
                    className="pv-btn pv-btn--primary pv-btn--sm"
                    onClick={() => handleApprovePayout(p.id)}
                    disabled={busyId === p.id}
                  >
                    {busyId === p.id ? <span className="pv-btn__spinner" /> : <Icon name="check" size={14} />}
                    Approve payout
                  </button>
                </div>
              </article>
            )
          })}
        </section>
      ) : null}

      <section className="pv-card">
        <div className="pv-card__header">
          <div>
            <h3 className="pv-card__title">My sponsored events</h3>
            <p className="pv-card__subtitle">
              {mine.length} event{mine.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        {mine.length === 0 ? (
          <div className="pv-empty">
            <span className="pv-empty__icon">
              <Icon name="wallet" size={20} />
            </span>
            <h4 className="pv-empty__title">Not sponsoring anything yet</h4>
            <p className="pv-empty__text">Commit to a prize pool below to get started.</p>
          </div>
        ) : (
          <div className="pv-card__body pv-card__body--flush">
            <div className="pv-table-wrap">
              <table className="pv-table pv-table--hover">
                <thead>
                  <tr>
                    <th scope="col">Event</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="pv-table__num">
                      Prize pool
                    </th>
                    <th scope="col">Escrow</th>
                    <th scope="col" className="pv-table__actions">
                      &nbsp;
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mine.map((h) => {
                    const status = deriveStatus(h)
                    const meta = STATUS_META[status]
                    return (
                      <tr key={h.id}>
                        <td>
                          <span className="pv-table__primary">{h.name}</span>
                          <span className="pv-table__sub">
                            {formatDateRange(h.startDate, h.endDate)}
                          </span>
                        </td>
                        <td>
                          <span className={`pv-badge ${meta.badge}`.trim()}>{meta.label}</span>
                        </td>
                        <td className="pv-table__num">
                          {formatXlm(prizeTotal(h))} {prizeCurrency(h)}
                        </td>
                        <td>
                          {h.escrowAddress ? (
                            <AddressChip address={h.escrowAddress} label="escrow address" />
                          ) : (
                            <span className="pv-dim">--</span>
                          )}
                        </td>
                        <td className="pv-table__actions">
                          <button
                            type="button"
                            className="pv-btn pv-btn--secondary pv-btn--xs"
                            onClick={() => onNavigate?.('event', { hackathonId: h.id })}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="pv-section__header">
          <div>
            <h3 className="pv-section__title">Events you can fund</h3>
            <p className="pv-section__desc">
              Committing here records your pledge. Locking funds in the Razorpay vault happens in the sponsor console.
              transaction.
            </p>
          </div>
        </div>

        {available.length === 0 ? (
          <div className="pv-card">
            <div className="pv-empty">
              <span className="pv-empty__icon">
                <Icon name="calendar" size={20} />
              </span>
              <h4 className="pv-empty__title">Nothing open to fund</h4>
              <p className="pv-empty__text">
                Upcoming and live events without a sponsor will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="pv-grid pv-grid--cards">
            {available.map((h) => {
              const status = deriveStatus(h)
              const meta = STATUS_META[status]
              const taken = Boolean(
                (h.sponsorAddress || '').trim() &&
                  h.sponsorAddress?.toLowerCase() !== userWallet.toLowerCase(),
              )
              return (
                <article className="pv-card" key={h.id}>
                  <div className="pv-card__header">
                    <div>
                      <h4 className="pv-card__title">{h.name}</h4>
                      <p className="pv-card__subtitle">
                        {formatDateRange(h.startDate, h.endDate)}
                      </p>
                    </div>
                    <div className="pv-card__actions">
                      <span className={`pv-badge ${meta.badge}`.trim()}>{meta.label}</span>
                    </div>
                  </div>
                  <div className="pv-card__body pv-card__body--tight">
                    <div className="pv-kv-row">
                      <span className="pv-kv-row__key">Current pool</span>
                      <span className="pv-kv-row__val pv-tnum">
                        {formatXlm(prizeTotal(h))} {prizeCurrency(h)}
                      </span>
                    </div>
                    <div className="pv-kv-row">
                      <span className="pv-kv-row__key">Registered</span>
                      <span className="pv-kv-row__val pv-tnum">{participantCount(h)}</span>
                    </div>

                    {taken ? (
                      <p className="pv-muted" style={{ marginTop: 'var(--pv-space-6)' }}>
                        Already sponsored by another account.
                      </p>
                    ) : (
                      <div className="pv-field" style={{ marginTop: 'var(--pv-space-6)' }}>
                        <label className="pv-field__label" htmlFor={`amt-${h.id}`}>
                          Amount to commit
                        </label>
                        <div className="pv-input-group">
                          <input
                            id={`amt-${h.id}`}
                            type="number"
                            min="0"
                            step="any"
                            className="pv-input"
                            placeholder="0"
                            value={amounts[h.id] ?? ''}
                            onChange={(e) =>
                              setAmounts((prev) => ({ ...prev, [h.id]: e.target.value }))
                            }
                          />
                          <span className="pv-input-group__affix">{prizeCurrency(h)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {!taken ? (
                    <div className="pv-card__footer">
                      <button
                        type="button"
                        className="pv-btn pv-btn--primary pv-btn--sm"
                        onClick={() => handleContribute(h)}
                        disabled={busyId === h.id}
                      >
                        {busyId === h.id ? <span className="pv-btn__spinner" /> : null}
                        Commit funds
                      </button>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
