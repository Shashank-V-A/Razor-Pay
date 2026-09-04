import { useMemo, useState, useEffect } from 'react'
import Icon from '../../components/Icon'
import EventVerifiedBadge from '../../components/EventVerifiedBadge'
import { Hackathon } from '../../types/hackathon'
import { useHackathons } from '../../hooks/useHackathons'
import { celebrateWinnerOnce } from '../../hooks/useWinnerCelebration'
import { isRegistered, registerForHackathon } from '../utils/registration'
import {
  STATUS_META,
  deriveStatus,
  eventCover,
  formatDateRange,
  formatXlm,
  participantCount,
  prizeCurrency,
  prizeTotal,
} from '../../utils/format'

interface ParticipantDashboardProps {
  userWallet: string | null
  onNavigate?: (view: string, params?: Record<string, unknown>) => void
}

export default function ParticipantDashboard({
  userWallet,
  onNavigate,
}: ParticipantDashboardProps) {
  const { hackathons, reload } = useHackathons()
  const [registeringId, setRegisteringId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  const mine = useMemo(
    () => hackathons.filter((h) => isRegistered(h, userWallet)),
    [hackathons, userWallet],
  )

  const available = useMemo(
    () =>
      hackathons.filter(
        (h) => deriveStatus(h) !== 'completed' && !isRegistered(h, userWallet),
      ),
    [hackathons, userWallet],
  )

  const myWinnings = useMemo(() => {
    if (!userWallet) return []
    return mine
      .map((h) => ({
        hackathon: h,
        win: (h.winners || []).find(
          (w) => w.payoutAddress?.toLowerCase() === userWallet.toLowerCase(),
        ),
      }))
      .filter((x) => x.win)
  }, [mine, userWallet])

  const totalWon = myWinnings.reduce((sum, x) => sum + (Number(x.win?.prizeAmount) || 0), 0)

  useEffect(() => {
    if (!userWallet) return
    for (const { hackathon } of myWinnings) {
      celebrateWinnerOnce(`participant_${hackathon.id}_${userWallet}`)
    }
  }, [myWinnings, userWallet])

  const handleRegister = async (hackathon: Hackathon) => {
    setRegisteringId(hackathon.id)
    setNotice(null)
    const result = await registerForHackathon(hackathon.id, userWallet)
    if (result.ok) {
      setNotice({ tone: 'success', text: `Registered for ${hackathon.name}.` })
      reload()
    } else {
      setNotice({ tone: 'danger', text: result.reason })
    }
    setRegisteringId(null)
  }

  if (!userWallet) {
    return (
      <div className="pv-alert pv-alert--warning">
        <span className="pv-alert__icon">
          <Icon name="alert" size={16} />
        </span>
        <div className="pv-alert__content">
          <p className="pv-alert__text">
            Connect your account to see your registrations and prizes.
          </p>
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
            Registered
          </span>
          <span className="pv-stat__value">{mine.length}</span>
        </div>
        <div className="pv-stat">
          <span className="pv-stat__label">
            <Icon name="trophy" size={12} />
            Prizes won
          </span>
          <span className="pv-stat__value">{myWinnings.length}</span>
        </div>
        <div className="pv-stat">
          <span className="pv-stat__label">
            <Icon name="wallet" size={12} />
            Total winnings
          </span>
          <span className="pv-stat__value">
            {formatXlm(totalWon)}
            <span className="pv-stat__unit">INR</span>
          </span>
        </div>
      </div>

      <section className="pv-card">
        <div className="pv-card__header">
          <div>
            <h3 className="pv-card__title">My hackathons</h3>
            <p className="pv-card__subtitle">
              {mine.length} registration{mine.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {mine.length === 0 ? (
          <div className="pv-empty">
            <span className="pv-empty__icon">
              <Icon name="calendar" size={20} />
            </span>
            <h4 className="pv-empty__title">No registrations yet</h4>
            <p className="pv-empty__text">
              Register for an open event below and it will show up here with its prize status.
            </p>
          </div>
        ) : (
          <div className="pv-card__body pv-card__body--flush">
            <div className="pv-table-wrap">
              <table className="pv-table pv-table--hover">
                <thead>
                  <tr>
                    <th scope="col">Event</th>
                    <th scope="col">Status</th>
                    <th scope="col">My standing</th>
                    <th scope="col" className="pv-table__num">
                      Prize
                    </th>
                    <th scope="col" className="pv-table__actions">
                      &nbsp;
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mine.map((h) => {
                    const status = deriveStatus(h)
                    const meta = STATUS_META[status]
                    const participant = h.participants?.find(
                      (p) => p.payoutAddress?.toLowerCase() === userWallet.toLowerCase(),
                    )
                    const win = (h.winners || []).find(
                      (w) => w.payoutAddress?.toLowerCase() === userWallet.toLowerCase(),
                    )
                    return (
                      <tr key={h.id}>
                        <td data-label="Event">
                          <span className="pv-table__primary">{h.name}</span>
                          <span className="pv-table__sub">
                            {formatDateRange(h.startDate, h.endDate)}
                          </span>
                        </td>
                        <td data-label="Status">
                          <span className={`pv-badge ${meta.badge}`.trim()}>
                            {status === 'live' ? (
                              <span className="pv-badge__dot pv-badge__dot--pulse" />
                            ) : null}
                            {meta.label}
                          </span>
                        </td>
                        <td data-label="My standing">
                          {win ? (
                            <span className="pv-badge pv-badge--success">
                              <Icon name="trophy" size={12} />
                              {win.prizeTier || 'Winner'}
                            </span>
                          ) : (
                            <span className="pv-badge">{participant?.status ?? 'registered'}</span>
                          )}
                        </td>
                        <td className="pv-table__num" data-label="Prize">
                          {win ? (
                            <strong>
                              {formatXlm(win.prizeAmount)} {prizeCurrency(h)}
                            </strong>
                          ) : (
                            <span className="pv-dim">--</span>
                          )}
                        </td>
                        <td className="pv-table__actions" data-label="Actions">
                          <button
                            type="button"
                            className="pv-btn pv-btn--secondary pv-btn--xs"
                            onClick={() => onNavigate?.('event', { hackathonId: h.id })}
                          >
                            View details
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
            <h3 className="pv-section__title">Open for registration</h3>
            <p className="pv-section__desc">
              {available.length} event{available.length === 1 ? '' : 's'} you have not joined yet.
            </p>
          </div>
        </div>

        {available.length === 0 ? (
          <div className="pv-card">
            <div className="pv-empty">
              <span className="pv-empty__icon">
                <Icon name="checkCircle" size={20} />
              </span>
              <h4 className="pv-empty__title">You are in every open event</h4>
              <p className="pv-empty__text">
                New events appear here as soon as organizers publish them.
              </p>
            </div>
          </div>
        ) : (
          <div className="pv-events">
            {available.map((h) => {
              const status = deriveStatus(h)
              const meta = STATUS_META[status]
              const cover = eventCover(h.name)
              const busy = registeringId === h.id

              return (
                <article className="pv-event" key={h.id} style={{ cursor: 'default' }}>
                  <div className="pv-event__cover" style={{ background: cover.background }}>
                    <span className="pv-event__cover-initials">{cover.initials}</span>
                    <span className={`pv-badge ${meta.badge} pv-event__cover-badge`.trim()}>
                      {status === 'live' ? (
                        <span className="pv-badge__dot pv-badge__dot--pulse" />
                      ) : null}
                      {meta.label}
                    </span>
                    <EventVerifiedBadge hackathon={h} />
                  </div>
                  <div className="pv-event__body">
                    <span className="pv-event__date">
                      <Icon name="calendar" size={13} />
                      {formatDateRange(h.startDate, h.endDate)}
                    </span>
                    <h4 className="pv-event__title">{h.name}</h4>
                    {h.description ? <p className="pv-event__desc">{h.description}</p> : null}
                    <div className="pv-event__meta">
                      <span className="pv-event__meta-item">
                        <Icon name="trophy" size={13} />
                        <span className="pv-event__prize">
                          {formatXlm(prizeTotal(h))} {prizeCurrency(h)}
                        </span>
                      </span>
                      <span className="pv-event__meta-item">
                        <Icon name="users" size={13} />
                        {participantCount(h)}
                      </span>
                    </div>
                    <div className="pv-btn-group" style={{ marginTop: 'var(--pv-space-5)' }}>
                      <button
                        type="button"
                        className="pv-btn pv-btn--primary pv-btn--sm"
                        disabled={busy}
                        onClick={() => handleRegister(h)}
                      >
                        {busy ? <span className="pv-btn__spinner" /> : null}
                        Register
                      </button>
                      <button
                        type="button"
                        className="pv-btn pv-btn--ghost pv-btn--sm"
                        onClick={() => onNavigate?.('event', { hackathonId: h.id })}
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
