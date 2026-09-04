import React, { useEffect, useMemo, useState } from 'react'
import Icon from '../../components/Icon'
import AddressChip from '../../components/AddressChip'
import { hackathonBelongsToOrganizerPortal } from '../../utils/organizerPortalFilter'
import { updateHackathon } from '../../services/hackathonApi'
import { useHackathons } from '../../hooks/useHackathons'
import { formatDate } from '../../utils/format'

const STATUS_BADGE = {
  registered: { label: 'Registered', className: '' },
  shortlisted: { label: 'Shortlisted', className: 'pv-badge--accent' },
  winner: { label: 'Winner', className: 'pv-badge--success' },
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'registered', label: 'Registered' },
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'winner', label: 'Winners' },
]

export default function ParticipantManager({ hackathonId, sessionWallet, onNavigate }) {
  const { hackathons, reload } = useHackathons()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Seed from the nav param, then let the dropdown own it. The original derived
  // `hackathonId || selectedHackathon`, so the prop shadowed local state and
  // changing the dropdown appeared to do nothing.
  const [selectedId, setSelectedId] = useState(hackathonId || null)
  useEffect(() => {
    if (hackathonId) setSelectedId(hackathonId)
  }, [hackathonId])

  const myHackathons = useMemo(
    () => hackathons.filter((h) => hackathonBelongsToOrganizerPortal(h, sessionWallet)),
    [hackathons, sessionWallet],
  )

  const currentId = selectedId || myHackathons[0]?.id || ''
  const currentHackathon = useMemo(
    () => hackathons.find((h) => h.id === currentId) || null,
    [hackathons, currentId],
  )

  const all = currentHackathon?.participants || []

  const counts = useMemo(
    () => ({
      all: all.length,
      registered: all.filter((p) => p.status === 'registered').length,
      shortlisted: all.filter((p) => p.status === 'shortlisted').length,
      winner: all.filter((p) => p.status === 'winner').length,
    }),
    [all],
  )

  const participants = useMemo(() => {
    let list = all
    if (statusFilter !== 'all') list = list.filter((p) => p.status === statusFilter)
    const s = searchTerm.trim().toLowerCase()
    if (!s) return list
    return list.filter((p) =>
      [p.name, p.team, p.track, p.project, p.payoutAddress]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(s)),
    )
  }, [all, statusFilter, searchTerm])

  const setStatus = async (participantId, newStatus) => {
    if (!currentHackathon) return

    const nextParticipants = (currentHackathon.participants || []).map((p) =>
      p.id === participantId ? { ...p, status: newStatus } : p,
    )

    try {
      const result = await updateHackathon(currentId, { participants: nextParticipants })
      if (result.success) reload()
    } catch (_) {
      // Leave the UI unchanged if the write fails.
    }
  }

  if (myHackathons.length === 0) {
    return (
      <div className="pv-card">
        <div className="pv-empty">
          <span className="pv-empty__icon">
            <Icon name="users" size={20} />
          </span>
          <h3 className="pv-empty__title">No hackathons yet</h3>
          <p className="pv-empty__text">Create an event before managing participants.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pv-card">
      <div className="pv-card__header">
        <div>
          <h3 className="pv-card__title">{currentHackathon?.name || 'Select an event'}</h3>
          <p className="pv-card__subtitle">
            {counts.all} registered &middot; {counts.shortlisted} shortlisted &middot;{' '}
            {counts.winner} winner{counts.winner === 1 ? '' : 's'}
          </p>
        </div>
        {myHackathons.length > 1 ? (
          <div className="pv-card__actions">
            <label className="pv-field" style={{ minWidth: 0, width: '100%', maxWidth: 320 }}>
              <span className="pv-sr-only">Choose hackathon</span>
              <select
                className="pv-select"
                value={currentId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {myHackathons.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </div>

      <div className="pv-card__body pv-card__body--tight">
        <div className="pv-toolbar">
          <div className="pv-search">
            <span className="pv-search__icon">
              <Icon name="search" size={14} />
            </span>
            <input
              type="search"
              className="pv-input"
              placeholder="Search name, team, track or wallet"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search participants"
            />
          </div>
          <div className="pv-segmented" role="group" aria-label="Filter by status">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className="pv-segmented__item"
                aria-pressed={statusFilter === f.id}
                onClick={() => setStatusFilter(f.id)}
              >
                {f.label} <span className="pv-dim">{counts[f.id]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {participants.length === 0 ? (
        <div className="pv-empty">
          <span className="pv-empty__icon">
            <Icon name="users" size={20} />
          </span>
          <h4 className="pv-empty__title">
            {all.length === 0 ? 'No participants yet' : 'No matches'}
          </h4>
          <p className="pv-empty__text">
            {all.length === 0
              ? 'Participants appear here once they register from the participant portal.'
              : 'Try a different search term or status filter.'}
          </p>
        </div>
      ) : (
        <div className="pv-card__body pv-card__body--flush">
          <div className="pv-table-wrap">
            <table className="pv-table pv-table--hover">
              <thead>
                <tr>
                  <th scope="col">Participant</th>
                  <th scope="col">Project</th>
                  <th scope="col">Track</th>
                  <th scope="col">Payout address</th>
                  <th scope="col">Registered</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="pv-table__actions">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => {
                  const badge = STATUS_BADGE[p.status] || STATUS_BADGE.registered
                  return (
                    <tr key={p.id}>
                      <td data-label="Participant">
                        <span className="pv-table__primary">{p.name}</span>
                        {p.team ? <span className="pv-table__sub">{p.team}</span> : null}
                      </td>
                      <td data-label="Project">{p.project || <span className="pv-dim">--</span>}</td>
                      <td data-label="Track">{p.track || <span className="pv-dim">--</span>}</td>
                      <td data-label="Payout address">
                        {p.payoutAddress ? (
                          <AddressChip address={p.payoutAddress} label="payout address" />
                        ) : (
                          <span className="pv-dim">Not provided</span>
                        )}
                      </td>
                      <td data-label="Registered">{p.registeredAt ? formatDate(p.registeredAt) : <span className="pv-dim">--</span>}</td>
                      <td data-label="Status">
                        <span className={`pv-badge ${badge.className}`.trim()}>{badge.label}</span>
                      </td>
                      <td className="pv-table__actions" data-label="Actions">
                        {p.status === 'registered' ? (
                          <button
                            type="button"
                            className="pv-btn pv-btn--secondary pv-btn--xs"
                            onClick={() => setStatus(p.id, 'shortlisted')}
                          >
                            Shortlist
                          </button>
                        ) : p.status === 'shortlisted' ? (
                          <span className="pv-btn-group">
                            <button
                              type="button"
                              className="pv-btn pv-btn--soft pv-btn--xs"
                              onClick={() => onNavigate?.('winners', currentId)}
                            >
                              Mark winner
                            </button>
                            <button
                              type="button"
                              className="pv-btn pv-btn--ghost pv-btn--xs"
                              onClick={() => setStatus(p.id, 'registered')}
                            >
                              Undo
                            </button>
                          </span>
                        ) : (
                          <span className="pv-dim">--</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
