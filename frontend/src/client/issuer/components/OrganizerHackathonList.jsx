import React, { useState } from 'react'
import Icon from '../../components/Icon'
import AddressChip from '../../components/AddressChip'
import EventVerifiedBadge from '../../components/EventVerifiedBadge'
import { hackathonBelongsToOrganizerPortal } from '../../utils/organizerPortalFilter'
import { deleteHackathon } from '../../services/hackathonApi'
import { useHackathons } from '../../hooks/useHackathons'
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

function HackathonCard({ hackathon, sessionWallet, onNavigate, onDeleted }) {
  const status = deriveStatus(hackathon)
  const meta = STATUS_META[status]
  const cover = eventCover(hackathon.name)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    const ok = window.confirm(
      `Delete hackathon "${hackathon.name}"? This removes it for sponsors and participants and deletes related proposals.`,
    )
    if (!ok) return

    setDeleting(true)
    const result = await deleteHackathon(hackathon.id, sessionWallet)
    setDeleting(false)

    if (!result.success) {
      window.alert(result.error || 'Could not delete hackathon.')
      return
    }
    onDeleted?.()
  }

  return (
    <article className="pv-card pv-card--interactive" style={{ overflow: 'hidden' }}>
      <div
        className="pv-event__cover"
        style={{ background: cover.background, aspectRatio: '16 / 5' }}
      >
        <span className="pv-event__cover-initials">{cover.initials}</span>
        <span className={`pv-badge ${meta.badge} pv-event__cover-badge`.trim()}>
          {status === 'live' ? <span className="pv-badge__dot pv-badge__dot--pulse" /> : null}
          {meta.label}
        </span>
        <EventVerifiedBadge hackathon={hackathon} />
      </div>

      <div className="pv-card__body pv-card__body--tight">
        <h3 className="pv-card__title" style={{ marginBottom: 'var(--pv-space-5)' }}>
          {hackathon.name || 'Untitled event'}
        </h3>

        <div className="pv-stack pv-stack--sm">
          <div className="pv-kv-row">
            <span className="pv-kv-row__key">Dates</span>
            <span className="pv-kv-row__val">
              {formatDateRange(hackathon.startDate, hackathon.endDate)}
            </span>
          </div>
          <div className="pv-kv-row">
            <span className="pv-kv-row__key">Prize pool</span>
            <span className="pv-kv-row__val pv-tnum">
              {formatXlm(prizeTotal(hackathon))} {prizeCurrency(hackathon)}
            </span>
          </div>
          <div className="pv-kv-row">
            <span className="pv-kv-row__key">Registered</span>
            <span className="pv-kv-row__val pv-tnum">{participantCount(hackathon)}</span>
          </div>
          <div className="pv-kv-row">
            <span className="pv-kv-row__key">Escrow</span>
            <span className="pv-kv-row__val">
              {hackathon.escrowAddress ? (
                <AddressChip address={hackathon.escrowAddress} label="escrow address" />
              ) : (
                <span className="pv-dim">Not set</span>
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="pv-card__footer" style={{ justifyContent: 'space-between' }}>
        <span className="pv-btn-group">
          <button
            type="button"
            className="pv-btn pv-btn--secondary pv-btn--xs"
            onClick={() => onNavigate?.('participants', hackathon.id)}
          >
            Participants
          </button>
          <button
            type="button"
            className="pv-btn pv-btn--secondary pv-btn--xs"
            onClick={() => onNavigate?.('winners', hackathon.id)}
          >
            Winners
          </button>
          <button
            type="button"
            className="pv-btn pv-btn--secondary pv-btn--xs"
            onClick={() => onNavigate?.('payouts', hackathon.id)}
          >
            Payout
          </button>
        </span>
        <button
          type="button"
          className="pv-btn pv-btn--ghost pv-btn--xs pv-btn--icon"
          onClick={handleDelete}
          disabled={deleting}
          aria-label={`Delete ${hackathon.name}`}
          title="Delete hackathon"
        >
          {deleting ? <span className="pv-btn__spinner" /> : <Icon name="trash" size={13} />}
        </button>
      </div>
    </article>
  )
}

export default function OrganizerHackathonList({ sessionWallet, onNavigate }) {
  const { hackathons, reload } = useHackathons((h) => hackathonBelongsToOrganizerPortal(h, sessionWallet))

  return (
    <div className="pv-stack pv-stack--lg">
      <div className="pv-row pv-row--between">
        <span className="pv-muted">
          {hackathons.length} event{hackathons.length === 1 ? '' : 's'}
        </span>
        <button
          type="button"
          className="pv-btn pv-btn--primary"
          onClick={() => onNavigate?.('create-hackathon')}
        >
          <Icon name="plus" size={15} />
          Create hackathon
        </button>
      </div>

      {hackathons.length === 0 ? (
        <div className="pv-card">
          <div className="pv-empty">
            <span className="pv-empty__icon">
              <Icon name="calendar" size={20} />
            </span>
            <h3 className="pv-empty__title">No hackathons yet</h3>
            <p className="pv-empty__text">
              Create your first event to set a prize pool and start accepting registrations.
            </p>
            <button
              type="button"
              className="pv-btn pv-btn--primary pv-btn--sm"
              onClick={() => onNavigate?.('create-hackathon')}
            >
              <Icon name="plus" size={14} />
              Create hackathon
            </button>
          </div>
        </div>
      ) : (
        <div className="pv-grid pv-grid--cards">
          {hackathons.map((h) => (
            <HackathonCard
              key={h.id}
              hackathon={h}
              sessionWallet={sessionWallet}
              onNavigate={onNavigate}
              onDeleted={reload}
            />
          ))}
        </div>
      )}
    </div>
  )
}
