import Icon from './Icon'
import type { AgentNotification } from '../types/hackathon'

export default function AgentInbox({
  notifications,
  onOpen,
  onDismiss,
}: {
  notifications: AgentNotification[]
  onOpen?: (notice: AgentNotification) => void
  onDismiss?: (id: string) => void
}) {
  const unread = notifications.filter((n) => !n.readAt)
  if (unread.length === 0) return null

  return (
    <div className="pv-stack pv-stack--sm">
      {unread.map((notice) => (
        <div className="pv-alert pv-alert--accent" key={notice.id}>
          <span className="pv-alert__icon">
            <Icon name={notice.stage === 'released' ? 'send' : 'clock'} size={16} />
          </span>
          <div className="pv-alert__content">
            <p className="pv-alert__title">{notice.title}</p>
            <p className="pv-alert__text">{notice.body}</p>
            {notice.txUrl ? (
              <p className="pv-alert__text">
                <a href={notice.txUrl} target="_blank" rel="noreferrer">
                  View transaction
                  <Icon name="external" size={12} />
                </a>
              </p>
            ) : null}
          </div>
          <span className="pv-btn-group">
            {onOpen ? (
              <button type="button" className="pv-btn pv-btn--secondary pv-btn--sm" onClick={() => onOpen(notice)}>
                Open
              </button>
            ) : null}
            {onDismiss ? (
              <button type="button" className="pv-btn pv-btn--ghost pv-btn--sm" onClick={() => onDismiss(notice.id)}>
                Dismiss
              </button>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  )
}
