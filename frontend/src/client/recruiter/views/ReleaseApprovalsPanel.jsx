import React from 'react'
import Icon from '../../components/Icon'
import AddressChip from '../../components/AddressChip'
import { formatXlm } from '../../utils/format'

/**
 * The centrepiece of the sponsor console: every pending release, with the
 * winners and amounts visible before the sponsor commits to approving.
 */
export default function ReleaseApprovalsPanel({
  pendingReleases,
  onApprove,
  isApproving,
  approveError,
}) {
  const actionable = pendingReleases.filter((r) => r.canApprove)
  const waiting = pendingReleases.filter((r) => !r.canApprove)

  return (
    <section className="pv-card">
      <div className="pv-card__header">
        <div>
          <h3 className="pv-card__title">Pending prize releases</h3>
          <p className="pv-card__subtitle">
            {actionable.length} awaiting your approval
            {waiting.length > 0 ? ` · ${waiting.length} awaiting the organizer` : ''}
          </p>
        </div>
        {actionable.length > 0 ? (
          <div className="pv-card__actions">
            <span className="pv-badge pv-badge--warning">
              <span className="pv-badge__dot pv-badge__dot--pulse" />
              Action needed
            </span>
          </div>
        ) : null}
      </div>

      {approveError ? (
        <div
          className="pv-alert pv-alert--danger"
          role="alert"
          aria-live="assertive"
          style={{ margin: 'var(--pv-space-6) var(--pv-space-7) 0' }}
        >
          <span className="pv-alert__icon">
            <Icon name="alert" size={16} />
          </span>
          <div className="pv-alert__content">
            <p className="pv-alert__text">{approveError}</p>
          </div>
        </div>
      ) : null}

      {pendingReleases.length === 0 ? (
        <div className="pv-empty">
          <span className="pv-empty__icon">
            <Icon name="checkCircle" size={20} />
          </span>
          <h4 className="pv-empty__title">Nothing waiting on you</h4>
          <p className="pv-empty__text">
            Payouts appear here once an organizer selects winners and proposes a release.
          </p>
        </div>
      ) : (
        <div className="pv-card__body pv-card__body--flush">
          {pendingReleases.map((item) => (
            <div
              key={item.id}
              style={{
                padding: 'var(--pv-space-7)',
                borderBottom: '1px solid var(--pv-border-subtle)',
              }}
            >
              <div className="pv-row pv-row--between" style={{ marginBottom: 'var(--pv-space-5)' }}>
                <div style={{ minWidth: 0 }}>
                  <strong>{item.hackathon}</strong>
                  <div className="pv-row pv-row--sm" style={{ marginTop: 'var(--pv-space-3)' }}>
                    <span className="pv-badge pv-badge--accent">{item.organizerState}</span>
                    <span className="pv-badge">{item.sponsorState}</span>
                  </div>
                </div>
                <span
                  className="pv-tnum"
                  style={{
                    fontSize: 'var(--pv-text-xl)',
                    fontWeight: 'var(--pv-weight-semibold)',
                    flex: 'none',
                  }}
                >
                  {formatXlm(item.total)} <span className="pv-dim">INR</span>
                </span>
              </div>

              {item.winners?.length > 0 ? (
                <div className="pv-table-wrap" style={{ marginBottom: 'var(--pv-space-6)' }}>
                  <table className="pv-table">
                    <thead>
                      <tr>
                        <th scope="col">Winner</th>
                        <th scope="col">Tier</th>
                        <th scope="col">Payout address</th>
                        <th scope="col" className="pv-table__num">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.winners.map((w, i) => (
                        <tr key={`${item.id}-${i}`}>
                          <td className="pv-table__primary" data-label="Winner">{w.name || 'Winner'}</td>
                          <td data-label="Tier">
                            <span className="pv-badge">{w.prizeTier || '--'}</span>
                          </td>
                          <td data-label="Payout address">
                            {w.payoutAddress ? (
                              <AddressChip address={w.payoutAddress} label="payout address" />
                            ) : (
                              <span className="pv-dim">Not specified</span>
                            )}
                          </td>
                          <td className="pv-table__num" data-label="Amount">{formatXlm(w.prizeAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {item.canApprove ? (
                <button
                  type="button"
                  className="pv-btn pv-btn--primary pv-btn--sm"
                  onClick={() => onApprove(item.id)}
                  disabled={isApproving}
                >
                  {isApproving ? (
                    <span className="pv-btn__spinner" />
                  ) : (
                    <Icon name="check" size={14} />
                  )}
                  Approve winners
                </button>
              ) : (
                <p className="pv-muted" style={{ fontSize: 'var(--pv-text-sm)' }}>
                  {item.sponsorState}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
