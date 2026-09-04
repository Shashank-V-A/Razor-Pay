import React from 'react'
import Icon from '../../components/Icon'

const SECTIONS = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
      { id: 'hackathons', label: 'My Hackathons', icon: 'calendar' },
    ],
  },
  {
    label: 'Run the event',
    items: [
      { id: 'participants', label: 'Participants', icon: 'users' },
      { id: 'timeline', label: 'Event Timeline', icon: 'clock' },
    ],
  },
  {
    label: 'Payouts',
    items: [
      { id: 'winners', label: 'Select Winners', icon: 'trophy' },
      { id: 'payouts', label: 'Payout Proposals', icon: 'send', badgeKey: 'pendingPayouts' },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'audit', label: 'Audit Logs', icon: 'list' },
      { id: 'settings', label: 'Settings', icon: 'settings' },
    ],
  },
]

export default function Sidebar({ activeView, onViewChange, badges = {} }) {
  return (
    <aside className="pv-sidebar">
      {SECTIONS.map((section) => (
        <div className="pv-sidebar__section" key={section.label}>
          <span className="pv-sidebar__label">{section.label}</span>
          {section.items.map((item) => {
            const count = item.badgeKey ? badges[item.badgeKey] : 0
            return (
              <button
                key={item.id}
                type="button"
                className={`pv-sidebar__link ${activeView === item.id ? 'is-active' : ''}`.trim()}
                onClick={() => onViewChange(item.id)}
                aria-current={activeView === item.id ? 'page' : undefined}
              >
                <span className="pv-sidebar__icon">
                  <Icon name={item.icon} />
                </span>
                <span>{item.label}</span>
                {count > 0 ? <span className="pv-sidebar__badge">{count}</span> : null}
              </button>
            )
          })}
        </div>
      ))}
    </aside>
  )
}
