import { useEffect } from 'react'
import { HolderProvider } from './context/HolderContext'
import Icon from '../components/Icon'
import AddressChip from '../components/AddressChip'
import SponsorDashboard from './components/SponsorDashboard'
import ParticipantDashboard from './components/ParticipantDashboard'
import HackathonList from './components/HackathonList'
import EventDetail from './components/EventDetail'
import { UserRole } from '../types/holder'
import { disconnectWallet } from '../wallet'

export type HolderView = 'list' | 'sponsor' | 'participant' | 'organizer' | 'event'

const ROLE_LABEL: Record<string, string> = {
  participant: 'Participant',
  sponsor: 'Sponsor',
  organizer: 'Organizer',
}

export interface ConnectedHolderViewProps {
  userWallet: string
  userRole: UserRole
  activeView: HolderView
  activeEventId?: string | null
  setActiveView: (v: HolderView) => void
  onDisconnect: () => void
  onNavigate: (view: string, params?: unknown) => void
}

export default function ConnectedHolderView({
  userWallet,
  userRole,
  activeView,
  activeEventId = null,
  setActiveView,
  onDisconnect,
  onNavigate,
}: ConnectedHolderViewProps) {
  // Sponsors land on their own view. `event` is a drill-in, so never override it.
  useEffect(() => {
    if (userRole === 'sponsor' && activeView !== 'sponsor' && activeView !== 'event') {
      setActiveView('sponsor')
    }
  }, [userRole, activeView, setActiveView])

  const tabs: { id: HolderView; label: string }[] = [{ id: 'list', label: 'Events' }]
  if (userRole === 'participant') tabs.push({ id: 'participant', label: 'My hackathons' })
  if (userRole === 'sponsor') tabs.push({ id: 'sponsor', label: 'Sponsorships' })
  if (userRole === 'organizer') tabs.push({ id: 'organizer', label: 'Organizer' })

  const handleDisconnect = async () => {
    try {
      await disconnectWallet()
    } catch (_) {
      /* Disconnect is best-effort; local session is cleared regardless. */
    }
    onDisconnect()
  }

  return (
    <HolderProvider>
      <div className="pv-stack pv-stack--lg">
        <div className="pv-card pv-card--flat">
          <div className="pv-card__body pv-card__body--tight">
            <div className="pv-row pv-row--between">
              <div className="pv-row pv-row--sm">
                <span className="pv-avatar">
                  {(ROLE_LABEL[userRole || ''] || '?').charAt(0)}
                </span>
                <div>
                  <div className="pv-row pv-row--sm" style={{ gap: 'var(--pv-space-4)' }}>
                    <strong>{ROLE_LABEL[userRole || ''] || 'Connected'}</strong>
                    <span className="pv-badge pv-badge--success">
                      <span className="pv-badge__dot" />
                      Connected
                    </span>
                  </div>
                  <div style={{ marginTop: 'var(--pv-space-3)' }}>
                    <AddressChip address={userWallet} label="your wallet" lead={8} tail={8} />
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="pv-btn pv-btn--secondary pv-btn--sm"
                onClick={handleDisconnect}
              >
                <Icon name="logout" size={14} />
                Disconnect
              </button>
            </div>
          </div>
        </div>

        {activeView !== 'event' ? (
          <nav className="pv-tabs" aria-label="Wallet sections">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className="pv-tab"
                aria-selected={activeView === tab.id}
                role="tab"
                onClick={() => setActiveView(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        ) : null}

        {activeView === 'event' ? (
          <EventDetail
            hackathonId={activeEventId}
            userWallet={userWallet}
            userRole={userRole}
            onBack={() => setActiveView(userRole === 'participant' ? 'participant' : 'list')}
          />
        ) : null}

        {activeView === 'list' ? (
          <HackathonList userWallet={userWallet} userRole={userRole} onNavigate={onNavigate} />
        ) : null}

        {activeView === 'sponsor' && userRole === 'sponsor' ? (
          <SponsorDashboard userWallet={userWallet} onNavigate={onNavigate} />
        ) : null}

        {activeView === 'participant' && userRole === 'participant' ? (
          <ParticipantDashboard userWallet={userWallet} onNavigate={onNavigate} />
        ) : null}

        {activeView === 'organizer' && userRole === 'organizer' ? (
          <div className="pv-card">
            <div className="pv-empty">
              <span className="pv-empty__icon">
                <Icon name="calendar" size={20} />
              </span>
              <h3 className="pv-empty__title">Organizer tools live in their own console</h3>
              <p className="pv-empty__text">
                Manage hackathons, select winners and create payout proposals there.
              </p>
              <a href="/issuer" className="pv-btn pv-btn--primary pv-btn--sm">
                Open organizer console
                <Icon name="arrowRight" size={14} />
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </HolderProvider>
  )
}
