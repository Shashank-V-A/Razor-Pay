import React from 'react'
import SharedHeader from '../../components/SharedHeader'
import AddressChip from '../../components/AddressChip'
import Icon from '../../components/Icon'
import { formatXlm } from '../../utils/format'

/**
 * Organizer console chrome: the shared product topbar plus a stat strip.
 * `onDisconnect` stays wired to the console's own handler so the organizer's
 * post-disconnect destination is unchanged.
 */
export default function Header({ organizerName, walletAddress, stats, onDisconnect }) {
  return (
    <>
      <SharedHeader activeTab="issuer" subtitle="Organizer" />

      <div className="pv-container pv-container--wide pv-console-header" style={{ paddingTop: 'var(--pv-space-8)' }}>
        <div className="pv-page-header" style={{ marginBottom: 0 }}>
          <div className="pv-page-header__text">
            <h1 className="pv-page-header__title">{organizerName || 'Organizer'}</h1>
            <div className="pv-row pv-row--sm" style={{ marginTop: 'var(--pv-space-4)' }}>
              <span className="pv-dim" style={{ fontSize: 'var(--pv-text-sm)' }}>
                Account
              </span>
              <AddressChip address={walletAddress} label="organizer account" lead={12} tail={18} full />
            </div>
          </div>

          <div className="pv-page-header__actions">
            <button type="button" className="pv-btn pv-btn--secondary pv-btn--sm" onClick={onDisconnect}>
              <Icon name="logout" size={14} />
              Disconnect
            </button>
          </div>
        </div>

        <div className="pv-stats" style={{ marginTop: 'var(--pv-space-8)' }}>
          <div className="pv-stat">
            <span className="pv-stat__label">
              <Icon name="calendar" size={12} />
              Hackathons
            </span>
            <span className="pv-stat__value">{stats?.hackathons || 0}</span>
          </div>
          <div className="pv-stat">
            <span className="pv-stat__label">
              <Icon name="users" size={12} />
              Participants
            </span>
            <span className="pv-stat__value">{stats?.participants || 0}</span>
          </div>
          <div className="pv-stat">
            <span className="pv-stat__label">
              <Icon name="trophy" size={12} />
              Prize pool locked
            </span>
            <span className="pv-stat__value">
              {formatXlm(stats?.prizeLocked || 0)}
              <span className="pv-stat__unit">INR</span>
            </span>
          </div>
          <div className="pv-stat">
            <span className="pv-stat__label">
              <Icon name="send" size={12} />
              Needs a payout
            </span>
            <span className="pv-stat__value">{stats?.pendingPayouts || 0}</span>
            <span className="pv-stat__meta">Winners chosen, not yet proposed</span>
          </div>
        </div>
      </div>
    </>
  )
}
