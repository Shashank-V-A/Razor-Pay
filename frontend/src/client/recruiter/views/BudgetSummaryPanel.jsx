import React from 'react'
import Icon from '../../components/Icon'
import { formatXlm } from '../../utils/format'

const TILES = [
  {
    key: 'committed',
    label: 'Committed',
    icon: 'wallet',
    meta: 'INR you deposited for your events',
  },
  {
    key: 'locked',
    label: 'Locked in escrow',
    icon: 'lock',
    meta: 'Awaiting winners or approvals',
  },
  {
    key: 'released',
    label: 'Released',
    icon: 'checkCircle',
    meta: 'Paid out to winners in INR',
  },
]

export default function BudgetSummaryPanel({ stats }) {
  return (
    <section className="pv-card">
      <div className="pv-card__header">
        <div>
          <h3 className="pv-card__title">Budget overview</h3>
          <p className="pv-card__subtitle">Committed, locked and released</p>
        </div>
      </div>
      <div className="pv-card__body pv-card__body--tight">
        <div className="pv-stats">
          {TILES.map((tile) => (
            <div className="pv-stat" key={tile.key}>
              <span className="pv-stat__label">
                <Icon name={tile.icon} size={12} />
                {tile.label}
              </span>
              <span className="pv-stat__value">
                {formatXlm(stats[tile.key])}
                <span className="pv-stat__unit">INR</span>
              </span>
              <span className="pv-stat__meta">{tile.meta}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
