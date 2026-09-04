import React, { useEffect, useMemo, useState } from 'react'
import SharedHeader from './components/SharedHeader'
import Icon from './components/Icon'
import EventVerifiedBadge from './components/EventVerifiedBadge'
import AddressChip, { truncateAddress } from './components/AddressChip'
import { getHackathonsFromStorage } from './holder/utils/roleDetection'
import { subscribeHackathonsDatasetChanged } from './utils/hackathonSync'
import { enrichHackathonLocation } from './utils/hackathonGlobe'
import { enrichHackathonFunding, payoutStatusCopy } from './utils/format'
import { fetchHackathons, fetchProposals } from './services/hackathonApi'
import {
  deriveStatus,
  eventCover,
  formatDateRange,
  formatXlm,
  prizeCurrency,
  prizeTotal,
  stellarTxUrl,
} from './utils/format'
import './styles/index.css'

function displayPartyName(name, address, fallback) {
  if (name && String(name).trim()) return String(name).trim()
  if (address && String(address).trim()) return truncateAddress(address, 6, 6)
  return fallback
}

function PastEventCard({ hackathon, proposal }) {
  const cover = eventCover(hackathon.name)
  const total = prizeTotal(hackathon)
  const currency = prizeCurrency(hackathon)
  const winners = Array.isArray(hackathon.winners) ? hackathon.winners : []
  const payoutTx =
    hackathon.payoutTxHash ||
    proposal?.txHash ||
    proposal?.executeTxHash ||
    null
  const proposeTx = proposal?.proposeTxHash || null
  const approveTx = proposal?.approveTxHash || null

  const certificates = [
    payoutTx
      ? { label: 'Payout release', hash: payoutTx }
      : null,
    proposeTx ? { label: 'Propose release', hash: proposeTx } : null,
    approveTx ? { label: 'Sponsor approval', hash: approveTx } : null,
  ].filter(Boolean)

  return (
    <article className="pv-past-event">
      <div className="pv-past-event__cover" style={{ background: cover.background }}>
        <span className="pv-event__cover-initials">{cover.initials}</span>
        <span className="pv-badge pv-event__cover-badge">Completed</span>
        <EventVerifiedBadge hackathon={hackathon} />
      </div>

      <div className="pv-past-event__body">
        <span className="pv-event__date">
          <Icon name="calendar" size={13} />
          {formatDateRange(hackathon.startDate, hackathon.endDate)}
        </span>
        <h3 className="pv-past-event__title">{hackathon.name || 'Untitled event'}</h3>
        {hackathon.description ? (
          <p className="pv-past-event__desc">{hackathon.description}</p>
        ) : null}

        <div className="pv-past-event__parties">
          <div className="pv-past-event__party">
            <span className="pv-past-event__party-label">Organizer</span>
            <span className="pv-past-event__party-name">
              {displayPartyName(hackathon.organizerName, hackathon.organizerAddress, 'Organizer')}
            </span>
            {hackathon.organizerAddress ? (
              <AddressChip address={hackathon.organizerAddress} />
            ) : null}
          </div>
          <div className="pv-past-event__party">
            <span className="pv-past-event__party-label">Sponsor</span>
            <span className="pv-past-event__party-name">
              {displayPartyName(hackathon.sponsorName, hackathon.sponsorAddress, 'Unassigned')}
            </span>
            {hackathon.sponsorAddress ? (
              <AddressChip address={hackathon.sponsorAddress} />
            ) : null}
          </div>
          <div className="pv-past-event__party">
            <span className="pv-past-event__party-label">Prize pool</span>
            <span className="pv-past-event__party-name">
              {formatXlm(total)} {currency}
            </span>
          </div>
        </div>

        <div className="pv-past-event__winners">
          <h4 className="pv-past-event__subtitle">
            <Icon name="trophy" size={14} />
            Winners
          </h4>
          {winners.length > 0 ? (
            <ul className="pv-past-event__winner-list">
              {winners.map((w) => (
                <li key={w.id || `${w.name}-${w.payoutAddress}`} className="pv-past-event__winner">
                  <div className="pv-past-event__winner-main">
                    <span className="pv-badge pv-badge--accent">{w.prizeTier || 'Prize'}</span>
                    <span className="pv-past-event__winner-name">{w.name || 'Winner'}</span>
                    {w.team ? <span className="pv-dim">· {w.team}</span> : null}
                  </div>
                  <div className="pv-past-event__winner-meta">
                    <span>
                      {formatXlm(w.prizeAmount)} {currency}
                    </span>
                    {w.payoutAddress ? <AddressChip address={w.payoutAddress} /> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pv-dim">No winners recorded.</p>
          )}
        </div>

        <div className="pv-past-event__certs">
          <h4 className="pv-past-event__subtitle">
            <Icon name="file" size={14} />
            Transaction certificates
          </h4>
          {certificates.length > 0 ? (
            <ul className="pv-past-event__cert-list">
              {certificates.map((cert) => (
                <li key={cert.hash} className="pv-past-event__cert">
                  <span>{cert.label}</span>
                  <a
                    className="pv-link"
                    href={stellarTxUrl(cert.hash)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {String(cert.hash).slice(0, 12)}…
                    <Icon name="external" size={12} />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pv-dim">
              {hackathon.payoutExecuted
                ? payoutStatusCopy(hackathon.payoutTxHash)
                : 'Payout not executed yet — certificates appear after release.'}
            </p>
          )}
        </div>
      </div>
    </article>
  )
}

export default function PastEventsPage() {
  const [hackathons, setHackathons] = useState(() =>
    getHackathonsFromStorage().map((h) => enrichHackathonFunding(enrichHackathonLocation(h))),
  )
  const [proposals, setProposals] = useState([])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  useEffect(
    () =>
      subscribeHackathonsDatasetChanged(() => {
        setHackathons(
          getHackathonsFromStorage().map((h) => enrichHackathonFunding(enrichHackathonLocation(h))),
        )
        fetchProposals()
          .then((list) => {
            if (Array.isArray(list)) setProposals(list)
          })
          .catch(() => {})
      }),
    [],
  )

  useEffect(() => {
    fetchHackathons()
      .then((list) => {
        if (Array.isArray(list)) {
          setHackathons(list.map((h) => enrichHackathonFunding(enrichHackathonLocation(h))))
        }
      })
      .catch(() => {})
    fetchProposals()
      .then((list) => {
        if (Array.isArray(list)) setProposals(list)
      })
      .catch(() => {})
  }, [])

  const pastEvents = useMemo(() => {
    return hackathons
      .filter((h) => deriveStatus(h) === 'completed')
      .sort((a, b) => new Date(b.endDate || 0) - new Date(a.endDate || 0))
  }, [hackathons])

  const proposalByHackathon = useMemo(() => {
    const map = new Map()
    for (const p of proposals) {
      const id = p?.hackathonId
      if (!id) continue
      const existing = map.get(id)
      if (!existing || (p.status === 'executed' && existing.status !== 'executed')) {
        map.set(id, p)
      }
    }
    return map
  }, [proposals])

  return (
    <div className="pv-shell">
      <a className="pv-skip-link" href="#main">
        Skip to content
      </a>

      <SharedHeader activeTab="landing" />

      <main id="main">
        <section className="pv-band pv-band--surface">
          <div className="pv-container">
            <div className="pv-section__header">
              <div>
                <h1 className="pv-section-head__title">Past events</h1>
                <p className="pv-section__desc">
                  Completed hackathons with organizers, sponsors, winners, and payout
                  receipts.
                  transaction certificates.
                </p>
              </div>
              <a href="/#events" className="pv-btn pv-btn--secondary pv-btn--sm">
                <Icon name="arrowLeft" size={14} />
                Open events
              </a>
            </div>

            {pastEvents.length > 0 ? (
              <div className="pv-past-events">
                {pastEvents.map((h) => (
                  <PastEventCard
                    key={h.id}
                    hackathon={h}
                    proposal={proposalByHackathon.get(h.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="pv-card pv-card--flat">
                <div className="pv-empty">
                  <span className="pv-empty__icon">
                    <Icon name="trophy" size={20} />
                  </span>
                  <h3 className="pv-empty__title">No past events yet</h3>
                  <p className="pv-empty__text">
                    When an organizer selects winners, the event ends and moves here from the open
                    list.
                  </p>
                  <a href="/#events" className="pv-btn pv-btn--primary pv-btn--sm">
                    Browse open events
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="pv-footer">
        <div className="pv-footer__inner">
          <span>Hackathon prize escrow powered by Razorpay INR dual-control.</span>
          <ul className="pv-footer__links">
            <li>
              <a href="/">Home</a>
            </li>
            <li>
              <a href="/past-events">Past events</a>
            </li>
            <li>
              <a href="/organizer">Organizer</a>
            </li>
            <li>
              <a href="/verifier">Sponsor</a>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  )
}
