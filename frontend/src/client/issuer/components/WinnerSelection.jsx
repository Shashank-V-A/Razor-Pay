import React, { useEffect, useMemo, useState } from 'react'
import Icon from '../../components/Icon'
import { hackathonBelongsToOrganizerPortal } from '../../utils/organizerPortalFilter'
import { updateHackathon } from '../../services/hackathonApi'
import { useHackathons } from '../../hooks/useHackathons'
import { appendIssuerAuditLog } from '../../utils/issuerAuditLog'
import { celebrateWinnersNow } from '../../hooks/useWinnerCelebration'
import { formatXlm, isEscrowFullyFunded, prizeCurrency, prizeTotal } from '../../utils/format'
import { canSelectWinners, fundingGapXlm } from '../../utils/payoutWorkflow'

const PRIZE_TIERS = [
  { value: '1st', label: '1st place' },
  { value: '2nd', label: '2nd place' },
  { value: '3rd', label: '3rd place' },
  { value: 'special', label: 'Special prize' },
]

import { isValidPayoutDestination } from '../../constants/escrow'

export default function WinnerSelection({ hackathonId, sessionWallet, onSave }) {
  const { hackathons, reload } = useHackathons()
  const myHackathons = useMemo(
    () => hackathons.filter((h) => hackathonBelongsToOrganizerPortal(h, sessionWallet)),
    [hackathons, sessionWallet],
  )

  // Local selection so the picker actually works. Seeded from the nav param,
  // then owned by the user -- the original pinned it to the prop forever and
  // wired onChange to an empty function.
  const [selectedId, setSelectedId] = useState(hackathonId || null)
  useEffect(() => {
    if (hackathonId) setSelectedId(hackathonId)
  }, [hackathonId])

  const hackathon = useMemo(() => {
    const wanted = selectedId || myHackathons[0]?.id
    return hackathons.find((h) => h.id === wanted) || null
  }, [hackathons, myHackathons, selectedId])

  const participants = hackathon?.participants || []
  const pool = prizeTotal(hackathon || {})
  const currency = prizeCurrency(hackathon || {})
  const funded = hackathon ? isEscrowFullyFunded(hackathon) : false
  const maySelectWinners = hackathon ? canSelectWinners(hackathon) : false
  const fundingGap = hackathon ? fundingGapXlm(hackathon) : 0

  const [winners, setWinners] = useState({})
  const [saved, setSaved] = useState(false)
  const [touched, setTouched] = useState(false)

  // Re-seed from whatever is already stored when the event changes.
  useEffect(() => {
    const existing = hackathon?.winners || []
    const seeded = {}
    for (const w of existing) {
      if (!w?.id) continue
      seeded[w.id] = {
        prizeTier: w.prizeTier || '',
        payoutAddress: w.payoutAddress || '',
        prizeAmount: w.prizeAmount ?? '',
      }
    }
    setWinners(seeded)
    setSaved(false)
    setTouched(false)
  }, [hackathon?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleWinner = (id, checked) => {
    setTouched(true)
    setSaved(false)
    setWinners((prev) => {
      if (!checked) {
        const next = { ...prev }
        delete next[id]
        return next
      }
      const participant = participants.find((x) => x.id === id)
      return {
        ...prev,
        [id]: prev[id] || {
          prizeTier: '',
          payoutAddress: participant?.payoutAddress || '',
          prizeAmount: '',
        },
      }
    })
  }

  const updateWinner = (id, field, value) => {
    setTouched(true)
    setSaved(false)
    setWinners((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }))
  }

  const selectedIds = Object.keys(winners)
  const allocated = selectedIds.reduce((sum, id) => sum + (Number(winners[id]?.prizeAmount) || 0), 0)
  const overAllocated = pool > 0 && allocated > pool

  const errors = useMemo(() => {
    const list = []
    for (const id of selectedIds) {
      const w = winners[id]
      const name = participants.find((p) => p.id === id)?.name || 'Winner'
      if (!w.prizeTier) list.push(`${name}: choose a prize tier.`)
      if (!isValidPayoutDestination(String(w.payoutAddress || '').trim())) {
        list.push(`${name}: payout destination must be a UPI ID (name@bank) or bank account number.`)
      }
      if (!(Number(w.prizeAmount) > 0)) list.push(`${name}: prize amount must be greater than 0.`)
    }
    if (overAllocated) {
      list.push(
        `Allocated ${formatXlm(allocated)} ${currency} exceeds the ${formatXlm(pool)} ${currency} prize pool.`,
      )
    }
    return list
  }, [selectedIds, winners, participants, overAllocated, allocated, pool, currency])

  const canSave = selectedIds.length > 0 && errors.length === 0 && maySelectWinners

  const handleSave = async () => {
    setTouched(true)
    if (!canSave || !hackathon) return

    const winnerList = selectedIds.map((participantId) => {
      const p = participants.find((x) => x.id === participantId)
      const data = winners[participantId]
      return {
        id: participantId,
        name: p?.name,
        team: p?.team,
        prizeTier: data.prizeTier,
        payoutAddress: String(data.payoutAddress).trim(),
        prizeAmount: Number(data.prizeAmount) || 0,
      }
    })

    try {
      const nextParticipants = (hackathon.participants || []).map((p) =>
        winnerList.some((w) => w.id === p.id) ? { ...p, status: 'winner' } : p,
      )

      const result = await updateHackathon(hackathon.id, {
        winners: winnerList,
        winnersSelected: winnerList.length > 0,
        status: winnerList.length > 0 ? 'completed' : hackathon.status,
        participants: nextParticipants,
      })

      if (!result.success) return

      appendIssuerAuditLog({
        action: 'select_winners',
        hackathonId: hackathon.id,
        details: `Selected ${winnerList.length} winner(s) for ${hackathon.name}, allocating ${formatXlm(allocated)} ${currency}.`,
        wallet: sessionWallet,
      })
      reload()
      setSaved(true)
      celebrateWinnersNow()
      onSave?.(hackathon.id)
    } catch (_) {
      // Storage failures surface through the unchanged UI state.
    }
  }

  if (myHackathons.length === 0) {
    return (
      <div className="pv-card">
        <div className="pv-empty">
          <span className="pv-empty__icon">
            <Icon name="trophy" size={20} />
          </span>
          <h3 className="pv-empty__title">No hackathons to judge</h3>
          <p className="pv-empty__text">Create an event and register participants first.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pv-stack pv-stack--lg">
      {hackathon && !funded ? (
        <div className="pv-alert pv-alert--warning" role="status">
          <span className="pv-alert__icon">
            <Icon name="lock" size={16} />
          </span>
          <div className="pv-alert__content">
            <p className="pv-alert__title">Prize pool not fully funded yet</p>
            <p className="pv-alert__text">
              The sponsor must lock at least {formatXlm(pool)} {currency} in escrow before you can
              select winners. Currently funded: {formatXlm(pool - fundingGap)} {currency}
              {fundingGap > 0 ? ` (${formatXlm(fundingGap)} ${currency} short)` : ''}.
            </p>
          </div>
        </div>
      ) : null}

      <div className="pv-card">
        <div className="pv-card__header">
          <div>
            <h3 className="pv-card__title">{hackathon?.name || 'Select an event'}</h3>
            <p className="pv-card__subtitle">
              Prize pool {formatXlm(pool)} {currency} &middot; {participants.length} participant
              {participants.length === 1 ? '' : 's'}
            </p>
          </div>
          {myHackathons.length > 1 ? (
            <div className="pv-card__actions">
              <label className="pv-field pv-field--grow">
                <span className="pv-sr-only">Choose hackathon</span>
                <select
                  className="pv-select"
                  value={hackathon?.id || ''}
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

        {participants.length === 0 ? (
          <div className="pv-empty">
            <span className="pv-empty__icon">
              <Icon name="users" size={20} />
            </span>
            <h4 className="pv-empty__title">No participants yet</h4>
            <p className="pv-empty__text">
              Participants appear here once they register from the participant portal.
            </p>
          </div>
        ) : (
          <div className="pv-card__body pv-card__body--flush">
            <div className="pv-table-wrap">
              <table className="pv-table">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: 44 }}>
                      <span className="pv-sr-only">Winner</span>
                    </th>
                    <th scope="col">Participant</th>
                    <th scope="col">Project</th>
                    <th scope="col">Prize tier</th>
                    <th scope="col">Payout address</th>
                    <th scope="col" className="pv-table__num">
                      Prize ({currency})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p) => {
                    const win = winners[p.id]
                      const addrInvalid =
                      touched && win && !isValidPayoutDestination(String(win.payoutAddress || '').trim())
                    return (
                      <tr key={p.id}>
                        <td data-label="Winner">
                          <input
                            type="checkbox"
                            checked={!!win}
                            disabled={!maySelectWinners}
                            onChange={(e) => toggleWinner(p.id, e.target.checked)}
                            aria-label={`Mark ${p.name} as a winner`}
                          />
                        </td>
                        <td data-label="Participant">
                          <span className="pv-table__primary">{p.name}</span>
                          {p.team ? <span className="pv-table__sub">{p.team}</span> : null}
                        </td>
                        <td data-label="Project">{p.project || <span className="pv-dim">--</span>}</td>
                        <td data-label="Prize tier">
                          {win ? (
                            <select
                              className="pv-select"
                              value={win.prizeTier || ''}
                              onChange={(e) => updateWinner(p.id, 'prizeTier', e.target.value)}
                              aria-invalid={touched && !win.prizeTier ? 'true' : undefined}
                              aria-label={`Prize tier for ${p.name}`}
                            >
                              <option value="">Select tier</option>
                              {PRIZE_TIERS.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="pv-dim">--</span>
                          )}
                        </td>
                        <td data-label="Payout address">
                          {win ? (
                            <input
                              type="text"
                              className="pv-input pv-input--mono"
                              placeholder="name@okaxis"
                              spellCheck={false}
                              value={win.payoutAddress || ''}
                              onChange={(e) => updateWinner(p.id, 'payoutAddress', e.target.value)}
                              aria-invalid={addrInvalid ? 'true' : undefined}
                              aria-label={`Payout address for ${p.name}`}
                            />
                          ) : (
                            <span className="pv-dim">--</span>
                          )}
                        </td>
                        <td className="pv-table__num" data-label={`Prize (${currency})`}>
                          {win ? (
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="pv-input"
                              style={{ textAlign: 'right' }}
                              placeholder="0"
                              value={win.prizeAmount}
                              onChange={(e) => updateWinner(p.id, 'prizeAmount', e.target.value)}
                              aria-invalid={
                                touched && !(Number(win.prizeAmount) > 0) ? 'true' : undefined
                              }
                              aria-label={`Prize amount for ${p.name}`}
                            />
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

        {participants.length > 0 ? (
          <div className="pv-card__footer">
            <div className="pv-row pv-row--sm">
              <span className="pv-muted">
                {selectedIds.length} winner{selectedIds.length === 1 ? '' : 's'} &middot; allocated{' '}
                <strong className={overAllocated ? '' : 'pv-tnum'}
                  style={overAllocated ? { color: 'var(--pv-danger-text)' } : undefined}
                >
                  {formatXlm(allocated)} {currency}
                </strong>
                {pool > 0 ? ` of ${formatXlm(pool)} ${currency}` : ''}
              </span>
              {saved ? (
                <span className="pv-badge pv-badge--success">
                  <Icon name="check" size={12} />
                  Saved
                </span>
              ) : null}
            </div>
            <button
              type="button"
              className="pv-btn pv-btn--primary"
              onClick={handleSave}
              disabled={selectedIds.length === 0 || !maySelectWinners}
            >
              Save winners
            </button>
          </div>
        ) : null}
      </div>

      {touched && errors.length > 0 ? (
        <div className="pv-alert pv-alert--danger" role="alert" aria-live="polite">
          <span className="pv-alert__icon">
            <Icon name="alert" size={16} />
          </span>
          <div className="pv-alert__content">
            <p className="pv-alert__title">
              Fix {errors.length} issue{errors.length === 1 ? '' : 's'} before saving
            </p>
            <ul className="pv-alert__text" style={{ paddingLeft: '1.1em', listStyle: 'disc' }}>
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  )
}
