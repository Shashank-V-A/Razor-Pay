import { useMemo, useState } from 'react'
import Icon from '../../components/Icon'
import EventVerifiedBadge from '../../components/EventVerifiedBadge'
import { Hackathon } from '../../types/hackathon'
import { UserRole } from '../../types/holder'
import { useHackathons } from '../../hooks/useHackathons'
import { isRegistered, registerForHackathon } from '../utils/registration'
import {
  EventStatus,
  STATUS_META,
  deriveStatus,
  eventCover,
  formatDateRange,
  formatRelative,
  formatXlm,
  participantCount,
  prizeCurrency,
  prizeTotal,
} from '../../utils/format'

interface HackathonListProps {
  userWallet: string | null
  userRole: UserRole
  onNavigate?: (view: string, params?: unknown) => void
}

const FILTERS: { id: 'all' | EventStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
]

export default function HackathonList({ userWallet, userRole, onNavigate }: HackathonListProps) {
  const { hackathons, reload } = useHackathons()
  const [filter, setFilter] = useState<'all' | EventStatus>('all')
  const [registeringId, setRegisteringId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)

  const withStatus = useMemo(
    () => hackathons.map((h) => ({ hackathon: h, status: deriveStatus(h) })),
    [hackathons],
  )

  const counts = useMemo(() => {
    const base = { all: withStatus.length, live: 0, upcoming: 0, completed: 0 }
    for (const { status } of withStatus) base[status] += 1
    return base
  }, [withStatus])

  const visible = useMemo(
    () => (filter === 'all' ? withStatus : withStatus.filter((x) => x.status === filter)),
    [withStatus, filter],
  )

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

  const renderAction = (hackathon: Hackathon, status: EventStatus) => {
    if (!userWallet) return null
    const openDetail = () => onNavigate?.('event', { hackathonId: hackathon.id })

    if (userRole === 'participant') {
      if (isRegistered(hackathon, userWallet)) {
        return (
          <button type="button" className="pv-btn pv-btn--secondary pv-btn--sm" onClick={openDetail}>
            View status
          </button>
        )
      }
      if (status !== 'completed') {
        const busy = registeringId === hackathon.id
        return (
          <span className="pv-btn-group">
            <button
              type="button"
              className="pv-btn pv-btn--primary pv-btn--sm"
              disabled={busy}
              onClick={() => handleRegister(hackathon)}
            >
              {busy ? <span className="pv-btn__spinner" /> : null}
              Register
            </button>
            <button type="button" className="pv-btn pv-btn--ghost pv-btn--sm" onClick={openDetail}>
              Details
            </button>
          </span>
        )
      }
      return (
        <button type="button" className="pv-btn pv-btn--ghost pv-btn--sm" onClick={openDetail}>
          View results
        </button>
      )
    }

    if (userRole === 'sponsor') {
      const mine = hackathon.sponsorAddress?.toLowerCase() === userWallet.toLowerCase()
      return (
        <button
          type="button"
          className={`pv-btn pv-btn--sm ${mine ? 'pv-btn--secondary' : 'pv-btn--primary'}`}
          onClick={() => onNavigate?.('sponsor', { hackathonId: hackathon.id })}
        >
          {mine ? 'Manage sponsorship' : 'Contribute'}
        </button>
      )
    }

    if (userRole === 'organizer') {
      const mine = hackathon.organizerAddress?.toLowerCase() === userWallet.toLowerCase()
      if (!mine) return null
      return (
        <a href="/issuer" className="pv-btn pv-btn--secondary pv-btn--sm">
          Manage
        </a>
      )
    }

    return (
      <button type="button" className="pv-btn pv-btn--ghost pv-btn--sm" onClick={openDetail}>
        Details
      </button>
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

      <div className="pv-segmented" role="group" aria-label="Filter events by status">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className="pv-segmented__item"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label} <span className="pv-dim">{counts[f.id]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="pv-card">
          <div className="pv-empty">
            <span className="pv-empty__icon">
              <Icon name="calendar" size={20} />
            </span>
            <h3 className="pv-empty__title">
              {counts.all === 0 ? 'No events yet' : `No ${filter} events`}
            </h3>
            <p className="pv-empty__text">
              {counts.all === 0
                ? 'Events appear here as soon as an organizer publishes one.'
                : 'Try a different filter to see other events.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="pv-events">
          {visible.map(({ hackathon, status }) => {
            const meta = STATUS_META[status]
            const cover = eventCover(hackathon.name)
            const registered = isRegistered(hackathon, userWallet)

            return (
              <article className="pv-event" key={hackathon.id} style={{ cursor: 'default' }}>
                <div className="pv-event__cover" style={{ background: cover.background }}>
                  <span className="pv-event__cover-initials">{cover.initials}</span>
                  <span className={`pv-badge ${meta.badge} pv-event__cover-badge`.trim()}>
                    {status === 'live' ? (
                      <span className="pv-badge__dot pv-badge__dot--pulse" />
                    ) : null}
                    {meta.label}
                  </span>
                  <EventVerifiedBadge hackathon={hackathon} />
                </div>
                <div className="pv-event__body">
                  <span className="pv-event__date">
                    <Icon name="calendar" size={13} />
                    {formatDateRange(hackathon.startDate, hackathon.endDate)}
                    {status === 'upcoming' && hackathon.startDate ? (
                      <span className="pv-dim">· {formatRelative(hackathon.startDate)}</span>
                    ) : null}
                  </span>
                  <h3 className="pv-event__title">{hackathon.name || 'Untitled event'}</h3>
                  {hackathon.description ? (
                    <p className="pv-event__desc">{hackathon.description}</p>
                  ) : null}

                  {registered ? (
                    <span className="pv-badge pv-badge--success" style={{ alignSelf: 'flex-start' }}>
                      <Icon name="check" size={12} />
                      Registered
                    </span>
                  ) : null}

                  <div className="pv-event__meta">
                    <span className="pv-event__meta-item">
                      <Icon name="trophy" size={13} />
                      <span className="pv-event__prize">
                        {formatXlm(prizeTotal(hackathon))} {prizeCurrency(hackathon)}
                      </span>
                    </span>
                    <span className="pv-event__meta-item">
                      <Icon name="users" size={13} />
                      {participantCount(hackathon)}
                    </span>
                  </div>

                  <div style={{ marginTop: 'var(--pv-space-5)' }}>
                    {renderAction(hackathon, status)}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
