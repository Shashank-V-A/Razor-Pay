import { useMemo, useState } from 'react'
import Icon from '../../components/Icon'
import AddressChip from '../../components/AddressChip'
import EventVerifiedBadge from '../../components/EventVerifiedBadge'
import { Hackathon } from '../../types/hackathon'
import { UserRole } from '../../types/holder'
import { useHackathons, usePayoutProposals } from '../../hooks/useHackathons'
import { useWinnerCelebration } from '../../hooks/useWinnerCelebration'
import { isRegistered, registerForHackathon } from '../utils/registration'
import {
  STATUS_META,
  deriveStatus,
  eventCover,
  formatDateRange,
  formatRelative,
  formatXlm,
  participantCount,
  payoutStatusCopy,
  prizeCurrency,
  prizeTotal,
  stellarAccountUrl,
} from '../../utils/format'
import { getPayoutWorkflowStage, WORKFLOW_STAGE_META } from '../../utils/payoutWorkflow'
import { AgentGates } from '../../components/AgentConsole'
import { findWinnerForAccount } from '../../utils/winnerMatch'

const TIMELINE_STORAGE_KEY = 'prize_vault_hackathon_timelines'

interface TimelineEvent {
  id: string
  time?: string
  title?: string
  details?: string
}

function getTimeline(hackathonId: string): TimelineEvent[] {
  try {
    const raw = localStorage.getItem(TIMELINE_STORAGE_KEY)
    const store = raw ? JSON.parse(raw) : {}
    const list = store?.[hackathonId]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

interface EventDetailProps {
  hackathonId: string | null
  userWallet: string | null
  userRole: UserRole
  onBack: () => void
}

export default function EventDetail({
  hackathonId,
  userWallet,
  userRole,
  onBack,
}: EventDetailProps) {
  const { hackathons, reload } = useHackathons()
  const { proposals } = usePayoutProposals()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  const hackathon = useMemo<Hackathon | null>(
    () => hackathons.find((h) => h.id === hackathonId) || null,
    [hackathons, hackathonId],
  )

  const timeline = useMemo(() => (hackathonId ? getTimeline(hackathonId) : []), [hackathonId])

  const myWinner = useMemo(() => {
    if (!hackathon || !userWallet) return null
    return findWinnerForAccount(hackathon, userWallet) || null
  }, [hackathon, userWallet])

  useWinnerCelebration(
    Boolean(myWinner && userWallet && hackathonId),
    myWinner && userWallet && hackathonId ? `event_${hackathonId}_${userWallet}` : null,
  )

  if (!hackathon) {
    return (
      <div className="pv-card">
        <div className="pv-empty">
          <span className="pv-empty__icon">
            <Icon name="calendar" size={20} />
          </span>
          <h3 className="pv-empty__title">Event not found</h3>
          <p className="pv-empty__text">
            It may have been deleted by the organizer, or the link is out of date.
          </p>
          <button type="button" className="pv-btn pv-btn--secondary pv-btn--sm" onClick={onBack}>
            Back to events
          </button>
        </div>
      </div>
    )
  }

  const status = deriveStatus(hackathon)
  const meta = STATUS_META[status]
  const cover = eventCover(hackathon.name)
  const registered = isRegistered(hackathon, userWallet)
  const open = status !== 'completed'
  const payoutStage = getPayoutWorkflowStage(hackathon, proposals)
  const payoutMeta = WORKFLOW_STAGE_META[payoutStage]

  const handleRegister = async () => {
    setBusy(true)
    setNotice(null)
    const result = await registerForHackathon(hackathon.id, userWallet)
    if (result.ok) {
      setNotice({ tone: 'success', text: `You are registered for ${hackathon.name}.` })
      reload()
    } else {
      setNotice({ tone: 'danger', text: result.reason })
    }
    setBusy(false)
  }

  return (
    <div className="pv-stack pv-stack--lg">
      <button
        type="button"
        className="pv-btn pv-btn--ghost pv-btn--sm"
        onClick={onBack}
        style={{ alignSelf: 'flex-start' }}
      >
        <Icon name="chevronRight" size={14} style={{ transform: 'rotate(180deg)' }} />
        All events
      </button>

      <div className="pv-card" style={{ overflow: 'hidden' }}>
        <div
          className="pv-event__cover"
          style={{ background: cover.background, aspectRatio: '16 / 4' }}
        >
          <span className="pv-event__cover-initials">{cover.initials}</span>
          <span className={`pv-badge ${meta.badge} pv-event__cover-badge`.trim()}>
            {status === 'live' ? <span className="pv-badge__dot pv-badge__dot--pulse" /> : null}
            {meta.label}
          </span>
          <EventVerifiedBadge hackathon={hackathon} />
        </div>

        <div className="pv-card__body">
          <h1 style={{ fontSize: 'var(--pv-text-2xl)', marginBottom: 'var(--pv-space-4)' }}>
            {hackathon.name}
          </h1>
          <p className="pv-row pv-row--sm pv-muted" style={{ marginBottom: 'var(--pv-space-7)' }}>
            <Icon name="calendar" size={14} />
            {formatDateRange(hackathon.startDate, hackathon.endDate)}
            {status === 'upcoming' && hackathon.startDate ? (
              <span className="pv-dim">· starts {formatRelative(hackathon.startDate)}</span>
            ) : null}
          </p>

          {hackathon.description ? (
            <p style={{ maxWidth: '68ch', marginBottom: 'var(--pv-space-8)' }}>
              {hackathon.description}
            </p>
          ) : null}

          <dl className="pv-dl">
            <div className="pv-dl__item">
              <dt className="pv-dl__key">Prize pool</dt>
              <dd className="pv-dl__val pv-tnum">
                {formatXlm(prizeTotal(hackathon))} {prizeCurrency(hackathon)}
              </dd>
            </div>
            <div className="pv-dl__item">
              <dt className="pv-dl__key">Registered</dt>
              <dd className="pv-dl__val pv-tnum">{participantCount(hackathon)}</dd>
            </div>
            <div className="pv-dl__item">
              <dt className="pv-dl__key">Payout status</dt>
              <dd className="pv-dl__val">
                <span className={`pv-badge ${payoutMeta.badge}`.trim()}>{payoutMeta.label}</span>
                <p className="pv-dim" style={{ marginTop: 'var(--pv-space-2)', maxWidth: '48ch' }}>
                  {payoutStage === 'released'
                    ? payoutStatusCopy(hackathon.payoutTxHash || hackathon.agent?.lastReceipt)
                    : payoutMeta.description}
                </p>
                {payoutStage === 'released' ? <AgentGates gates={hackathon.agent?.gates} /> : null}
              </dd>
            </div>
            <div className="pv-dl__item">
              <dt className="pv-dl__key">Escrow account</dt>
              <dd className="pv-dl__val">
                {hackathon.escrowAddress ? (
                  <AddressChip address={hackathon.escrowAddress} label="escrow address" />
                ) : (
                  <span className="pv-dim">Not set</span>
                )}
              </dd>
            </div>
            <div className="pv-dl__item">
              <dt className="pv-dl__key">Sponsor</dt>
              <dd className="pv-dl__val">
                {hackathon.sponsorAddress ? (
                  <AddressChip address={hackathon.sponsorAddress} label="sponsor address" />
                ) : (
                  <span className="pv-dim">Not funded yet</span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div className="pv-card__footer" style={{ justifyContent: 'space-between' }}>
          {hackathon.escrowAddress ? (
            <a
              href={stellarAccountUrl(hackathon.escrowAddress)}
              target="_blank"
              rel="noreferrer"
              className="pv-btn pv-btn--ghost pv-btn--sm"
            >
              Open prize vault
              <Icon name="external" size={13} />
            </a>
          ) : (
            <span />
          )}

          {userRole === 'participant' ? (
            registered ? (
              <span className="pv-badge pv-badge--success pv-badge--lg">
                <Icon name="check" size={13} />
                You are registered
              </span>
            ) : open ? (
              <button
                type="button"
                className="pv-btn pv-btn--primary"
                onClick={handleRegister}
                disabled={busy || !userWallet}
              >
                {busy ? <span className="pv-btn__spinner" /> : null}
                Register for this event
              </button>
            ) : (
              <span className="pv-muted">Registration is closed.</span>
            )
          ) : null}
        </div>
      </div>

      {notice ? (
        <div className={`pv-alert pv-alert--${notice.tone}`} role="status" aria-live="polite">
          <span className="pv-alert__icon">
            <Icon name={notice.tone === 'success' ? 'checkCircle' : 'alert'} size={16} />
          </span>
          <div className="pv-alert__content">
            <p className="pv-alert__text">{notice.text}</p>
          </div>
        </div>
      ) : null}

      {myWinner ? (
        <div className="pv-card pv-card--accent pv-winner-banner">
          <div className="pv-card__body">
            <div className="pv-row pv-row--between">
              <div>
                <h3 className="pv-card__title pv-winner-banner__title">
                  You won {myWinner.prizeTier} 🎉
                </h3>
                <p className="pv-card__subtitle">
                  {hackathon.payoutExecuted
                    ? payoutStatusCopy(hackathon.payoutTxHash || hackathon.agent?.lastReceipt)
                    : 'Payout goes to your UPI or bank once both parties approve. You do not pay at Checkout.'}
                </p>
              </div>
              <span className="pv-stat__value pv-winner-banner__amount">
                {formatXlm(myWinner.prizeAmount)}
                <span className="pv-stat__unit">{prizeCurrency(hackathon)}</span>
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {timeline.length > 0 ? (
        <section className="pv-card">
          <div className="pv-card__header">
            <div>
              <h3 className="pv-card__title">Schedule</h3>
              <p className="pv-card__subtitle">
                {timeline.length} event{timeline.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <div className="pv-card__body pv-card__body--flush">
            <div className="pv-table-wrap">
              <table className="pv-table">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '30%' }}>
                      Time
                    </th>
                    <th scope="col">What happens</th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.map((evt) => (
                    <tr key={evt.id}>
                      <td className="pv-mono" data-label="Time">
                        {evt.time || '--'}
                      </td>
                      <td data-label="What happens">
                        <span className="pv-table__primary">{evt.title || 'Untitled'}</span>
                        {evt.details ? <span className="pv-table__sub">{evt.details}</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {(hackathon.winners || []).length > 0 ? (
        <section className="pv-card">
          <div className="pv-card__header">
            <div>
              <h3 className="pv-card__title">Results</h3>
              <p className="pv-card__subtitle">Winners selected by the organizer</p>
            </div>
          </div>
          <div className="pv-card__body pv-card__body--flush">
            <div className="pv-table-wrap">
              <table className="pv-table">
                <thead>
                  <tr>
                    <th scope="col">Winner</th>
                    <th scope="col">Tier</th>
                    <th scope="col" className="pv-table__num">
                      Prize ({prizeCurrency(hackathon)})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(hackathon.winners || []).map((w, i) => (
                    <tr key={w.id || i}>
                      <td data-label="Winner">
                        <span className="pv-table__primary">{w.name || 'Winner'}</span>
                        {w.team ? <span className="pv-table__sub">{w.team}</span> : null}
                      </td>
                      <td data-label="Tier">
                        <span className="pv-badge">{w.prizeTier || '--'}</span>
                      </td>
                      <td className="pv-table__num" data-label={`Prize (${prizeCurrency(hackathon)})`}>{formatXlm(w.prizeAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
