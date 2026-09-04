import React from 'react'
import Icon from '../../components/Icon'
import { truncateAddress } from '../../components/AddressChip'
import { formatXlm } from '../../utils/format'

export default function EscrowOverviewPanel({ escrows, selectedEscrowId, onSelectEscrow }) {
  return (
    <section className="pv-card">
      <div className="pv-card__header">
        <div>
          <h3 className="pv-card__title">Prize escrows</h3>
          <p className="pv-card__subtitle">
            {escrows.length} prize pool{escrows.length === 1 ? '' : 's'} you can fund
          </p>
        </div>
      </div>

      {escrows.length === 0 ? (
        <div className="pv-empty">
          <span className="pv-empty__icon">
            <Icon name="wallet" size={20} />
          </span>
          <h4 className="pv-empty__title">No escrows yet</h4>
          <p className="pv-empty__text">
            Prize pools appear here once an organizer publishes a hackathon.
          </p>
        </div>
      ) : (
        <div className="pv-card__body pv-card__body--tight">
          <div className="pv-stack pv-stack--sm" role="listbox" aria-label="Prize escrows">
            {escrows.map((escrow) => {
              const active = selectedEscrowId === escrow.id
              const funded = Boolean(escrow.fullyFunded)
              const partial = !funded && Number(escrow.balanceAlgo) > 0
              return (
                <button
                  key={escrow.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className="pv-card pv-card--flat"
                  onClick={() => onSelectEscrow(escrow.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: 'var(--pv-space-5) var(--pv-space-6)',
                    borderColor: active ? 'var(--pv-accent-fill)' : 'var(--pv-border)',
                    background: active ? 'var(--pv-accent-soft)' : 'var(--pv-surface)',
                  }}
                >
                  <span className="pv-row pv-row--between">
                    <span style={{ minWidth: 0 }}>
                      <span
                        className="pv-truncate"
                        style={{ display: 'block', fontWeight: 'var(--pv-weight-semibold)' }}
                      >
                        {escrow.name}
                      </span>
                      <span
                        className="pv-mono pv-dim"
                        style={{ fontSize: 'var(--pv-text-xs)' }}
                      >
                        {truncateAddress(escrow.escrowAddress, 6, 6)}
                      </span>
                    </span>
                    <span style={{ textAlign: 'right', flex: 'none' }}>
                      <span
                        className={`pv-badge ${
                          funded ? 'pv-badge--success' : partial ? 'pv-badge--warning' : 'pv-badge--warning'
                        }`}
                      >
                        {escrow.status}
                      </span>
                      <span
                        className="pv-tnum"
                        style={{
                          display: 'block',
                          marginTop: 4,
                          fontSize: 'var(--pv-text-sm)',
                          fontWeight: 'var(--pv-weight-semibold)',
                        }}
                      >
                        {formatXlm(escrow.balanceAlgo)} / {formatXlm(escrow.prizePool)} INR
                      </span>
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
