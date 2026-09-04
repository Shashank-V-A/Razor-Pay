import React from 'react'
import AddressChip from '../../components/AddressChip'

export default function SponsorProfilePanel({ sponsorName, defaultWallet }) {
  return (
    <section className="pv-card">
      <div className="pv-card__header">
        <div>
          <h3 className="pv-card__title">Sponsor profile</h3>
          <p className="pv-card__subtitle">Identity and vault account</p>
        </div>
      </div>
      <div className="pv-card__body pv-card__body--tight">
        <div className="pv-kv-row">
          <span className="pv-kv-row__key">Organization</span>
          <span className="pv-kv-row__val">{sponsorName}</span>
        </div>
        <div className="pv-kv-row">
          <span className="pv-kv-row__key">Account</span>
          <span className="pv-kv-row__val">
            <AddressChip address={defaultWallet} label="sponsor account" full />
          </span>
        </div>
        <div className="pv-kv-row">
          <span className="pv-kv-row__key">Network</span>
          <span className="pv-kv-row__val">Razorpay INR (test)</span>
        </div>
      </div>
    </section>
  )
}
