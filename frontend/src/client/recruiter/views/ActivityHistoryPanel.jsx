import React from 'react'
import Icon from '../../components/Icon'
import { stellarTxUrl } from '../../utils/format'

export default function ActivityHistoryPanel({ activities }) {
  return (
    <section className="pv-card">
      <div className="pv-card__header">
        <div>
          <h3 className="pv-card__title">Activity</h3>
          <p className="pv-card__subtitle">Funding and approvals from this session</p>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="pv-empty">
          <span className="pv-empty__icon">
            <Icon name="list" size={20} />
          </span>
          <h4 className="pv-empty__title">No activity yet</h4>
          <p className="pv-empty__text">
            Funding an escrow or approving a release will show up here. This list is per-session and
            resets on reload.
          </p>
        </div>
      ) : (
        <div className="pv-card__body pv-card__body--flush">
          {activities.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                gap: 'var(--pv-space-5)',
                padding: 'var(--pv-space-6) var(--pv-space-7)',
                borderBottom: '1px solid var(--pv-border-subtle)',
              }}
            >
              <span
                style={{
                  flex: 'none',
                  marginTop: 2,
                  color: item.tone === 'success' ? 'var(--pv-success-text)' : 'var(--pv-accent-text)',
                }}
              >
                <Icon name={item.icon || 'checkCircle'} size={16} />
              </span>
              <div style={{ minWidth: 0 }}>
                <span
                  className="pv-dim"
                  style={{ fontSize: 'var(--pv-text-xs)', display: 'block' }}
                >
                  {item.timestamp}
                </span>
                <strong style={{ display: 'block', marginTop: 2 }}>{item.title}</strong>
                <p
                  className="pv-muted"
                  style={{
                    marginTop: 'var(--pv-space-2)',
                    fontSize: 'var(--pv-text-sm)',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {item.description}
                </p>
                {item.txHash ? (
                  <a
                    href={stellarTxUrl(item.txHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="pv-mono"
                    style={{
                      fontSize: 'var(--pv-text-xs)',
                      display: 'inline-block',
                      marginTop: 'var(--pv-space-3)',
                    }}
                  >
                    {String(item.txHash).slice(0, 12)}...
                    <Icon name="external" size={11} />
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
