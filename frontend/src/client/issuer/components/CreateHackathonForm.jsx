import React, { useState, useRef } from 'react'
import Icon from '../../components/Icon'
import AddressChip from '../../components/AddressChip'
import { isValidAccountId } from '../../constants/escrow'
import { INR_VAULT_ID } from '../../constants/escrow'
import { appendIssuerAuditLog } from '../../utils/issuerAuditLog'
import { createHackathon } from '../../services/hackathonApi'
import { geocodeCity, lookupCityCoordinates } from '../../utils/hackathonGlobe'

/** Field-level errors so each message renders next to the input it belongs to. */
function validate({ name, startDate, endDate, prizeTotal, venueCity, latitude, longitude }) {
  const errors = {}
  if (!name.trim()) errors.name = 'Give the event a name.'
  if (!startDate) errors.startDate = 'Pick a start date.'
  if (!endDate) errors.endDate = 'Pick an end date.'
  if (startDate && endDate && endDate < startDate) {
    errors.endDate = 'End date cannot be before the start date.'
  }
  const total = parseFloat(prizeTotal)
  if (prizeTotal === '' || Number.isNaN(total) || total < 0) {
    errors.prizeTotal = 'Enter a prize pool of 0 or more.'
  }
  if (!venueCity.trim()) errors.venueCity = 'Enter the host city so the event appears on the globe.'
  const lat = latitude === '' ? NaN : Number(latitude)
  const lng = longitude === '' ? NaN : Number(longitude)
  if (latitude !== '' && (Number.isNaN(lat) || lat < -90 || lat > 90)) {
    errors.latitude = 'Latitude must be between -90 and 90.'
  }
  if (longitude !== '' && (Number.isNaN(lng) || lng < -180 || lng > 180)) {
    errors.longitude = 'Longitude must be between -180 and 180.'
  }
  return errors
}

export default function CreateHackathonForm({ userWallet, onSave, onCancel }) {
  /** Locked to the connected organizer wallet for this browser session. */
  const organizerEscrowAddress = (userWallet || '').trim()

  const [values, setValues] = useState({
    name: '',
    startDate: '',
    endDate: '',
    prizeTotal: '',
    prizeCurrency: 'INR',
    description: '',
    venueCity: '',
    latitude: '',
    longitude: '',
  })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const geocodeRequest = useRef(0)

  const applyCityCoordinates = async (city, { forceRemote = false } = {}) => {
    const trimmed = city.trim()
    if (!trimmed) {
      setValues((prev) => ({ ...prev, latitude: '', longitude: '' }))
      return
    }

    const local = lookupCityCoordinates(trimmed)
    if (local && !forceRemote) {
      setValues((prev) => ({
        ...prev,
        latitude: String(local[0]),
        longitude: String(local[1]),
      }))
      return
    }

    const requestId = ++geocodeRequest.current
    setGeocoding(true)
    const remote = await geocodeCity(trimmed)
    if (requestId !== geocodeRequest.current) return
    setGeocoding(false)

    if (remote) {
      setValues((prev) => ({
        ...prev,
        latitude: String(remote[0]),
        longitude: String(remote[1]),
      }))
    }
  }

  const set = (field) => (e) => {
    const value = e.target.value
    setValues((prev) => ({ ...prev, [field]: value }))
    if (field === 'venueCity') {
      void applyCityCoordinates(value)
    }
    if (submitted) {
      setErrors(validate({ ...values, [field]: value }))
    }
  }

  const showError = (field) => (submitted && errors[field] ? errors[field] : '')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitted(true)
    setSaveError('')

    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    const organizerEscrow = organizerEscrowAddress.trim()
    if (!isValidAccountId(organizerEscrow)) {
      setSaveError('Sign in with a valid organizer email before creating a hackathon.')
      return
    }
    const coords =
      lookupCityCoordinates(values.venueCity.trim()) ||
      (await geocodeCity(values.venueCity.trim()))
    const latInput = values.latitude.trim()
    const lngInput = values.longitude.trim()
    const latitude = latInput !== '' ? Number(latInput) : coords?.[0]
    const longitude = lngInput !== '' ? Number(lngInput) : coords?.[1]

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setSaveError(
        'Could not resolve coordinates for this host city. Check the city name or enter latitude and longitude manually.',
      )
      return
    }

    const newHackathon = {
      id: `hack_${Date.now()}`,
      name: values.name.trim(),
      startDate: values.startDate,
      endDate: values.endDate,
      prizePool: {
        total: parseFloat(values.prizeTotal),
        currency: values.prizeCurrency || 'INR',
        locked: false,
      },
      organizerAddress: organizerEscrow,
      sponsorAddress: '',
      escrowAddress: INR_VAULT_ID,
      status: 'upcoming',
      participantCount: 0,
      participants: [],
      winnersSelected: false,
      payoutProposed: false,
      description: values.description.trim() || undefined,
      venueCity: values.venueCity.trim(),
      latitude,
      longitude,
    }

    setSaving(true)
    const result = await createHackathon(newHackathon)
    setSaving(false)

    if (!result.success || !result.hackathon) {
      setSaveError(result.error || 'Could not save hackathon.')
      return
    }

    appendIssuerAuditLog({
      action: 'create',
      hackathonId: result.hackathon.id,
      details: `Created hackathon ${result.hackathon.name} with a ${result.hackathon.prizePool.total} ${result.hackathon.prizePool.currency} prize pool.`,
    })
    onSave?.(result.hackathon.id)
  }

  const errorCount = submitted ? Object.keys(errors).length : 0

  return (
    <form className="pv-card" onSubmit={handleSubmit} noValidate>
      <div className="pv-card__header">
        <div>
          <h3 className="pv-card__title">Event details</h3>
          <p className="pv-card__subtitle">
            Prize pool is held in the INR vault until sponsor and organizer both approve.
          </p>
        </div>
      </div>

      <div className="pv-card__body">
        <div className="pv-form-stack">
          <div className="pv-field">
            <label className="pv-field__label" htmlFor="create-hack-name">
              Event name <span className="pv-field__required">*</span>
            </label>
            <input
              id="create-hack-name"
              type="text"
              className="pv-input"
              value={values.name}
              onChange={set('name')}
              placeholder="e.g. Cepheus 2026"
              maxLength={120}
              aria-invalid={showError('name') ? 'true' : undefined}
              aria-describedby={showError('name') ? 'err-name' : undefined}
            />
            {showError('name') ? (
              <span className="pv-field__error" id="err-name" role="alert">
                <Icon name="alert" size={12} />
                {showError('name')}
              </span>
            ) : null}
          </div>

          <div className="pv-form-grid">
            <div className="pv-field">
              <label className="pv-field__label" htmlFor="create-hack-start">
                Start date <span className="pv-field__required">*</span>
              </label>
              <input
                id="create-hack-start"
                type="date"
                className="pv-input"
                value={values.startDate}
                onChange={set('startDate')}
                aria-invalid={showError('startDate') ? 'true' : undefined}
                aria-describedby={showError('startDate') ? 'err-start' : undefined}
              />
              {showError('startDate') ? (
                <span className="pv-field__error" id="err-start" role="alert">
                  <Icon name="alert" size={12} />
                  {showError('startDate')}
                </span>
              ) : null}
            </div>

            <div className="pv-field">
              <label className="pv-field__label" htmlFor="create-hack-end">
                End date <span className="pv-field__required">*</span>
              </label>
              <input
                id="create-hack-end"
                type="date"
                className="pv-input"
                value={values.endDate}
                min={values.startDate || undefined}
                onChange={set('endDate')}
                aria-invalid={showError('endDate') ? 'true' : undefined}
                aria-describedby={showError('endDate') ? 'err-end' : undefined}
              />
              {showError('endDate') ? (
                <span className="pv-field__error" id="err-end" role="alert">
                  <Icon name="alert" size={12} />
                  {showError('endDate')}
                </span>
              ) : null}
            </div>
          </div>

          <div className="pv-form-grid">
            <div className="pv-field">
              <label className="pv-field__label" htmlFor="create-hack-prize-total">
                Prize pool <span className="pv-field__required">*</span>
              </label>
              <div className="pv-input-group">
                <input
                  id="create-hack-prize-total"
                  type="number"
                  min="0"
                  step="any"
                  className="pv-input"
                  value={values.prizeTotal}
                  onChange={set('prizeTotal')}
                  placeholder="0"
                  aria-invalid={showError('prizeTotal') ? 'true' : undefined}
                  aria-describedby={showError('prizeTotal') ? 'err-prize' : undefined}
                />
                <span className="pv-input-group__affix">{values.prizeCurrency}</span>
              </div>
              {showError('prizeTotal') ? (
                <span className="pv-field__error" id="err-prize" role="alert">
                  <Icon name="alert" size={12} />
                  {showError('prizeTotal')}
                </span>
              ) : (
                <span className="pv-field__hint">
                  Total across all prize tiers. You assign per-winner amounts later.
                </span>
              )}
            </div>

            <div className="pv-field">
              <label className="pv-field__label" htmlFor="create-hack-prize-currency">
                Currency
              </label>
              <select
                id="create-hack-prize-currency"
                className="pv-select"
                value={values.prizeCurrency}
                onChange={set('prizeCurrency')}
              >
                <option value="INR">INR</option>
              </select>
              <span className="pv-field__hint">Prizes settle in Indian rupees via Razorpay.</span>
            </div>
          </div>

          <div className="pv-field">
            <label className="pv-field__label" htmlFor="create-hack-venue">
              Host city <span className="pv-field__required">*</span>
            </label>
            <input
              id="create-hack-venue"
              type="text"
              className="pv-input"
              value={values.venueCity}
              onChange={set('venueCity')}
              placeholder="e.g. Bengaluru, London, Singapore"
              maxLength={80}
              aria-invalid={showError('venueCity') ? 'true' : undefined}
              aria-describedby={showError('venueCity') ? 'err-venue' : 'hint-venue'}
            />
            {showError('venueCity') ? (
              <span className="pv-field__error" id="err-venue" role="alert">
                <Icon name="alert" size={12} />
                {showError('venueCity')}
              </span>
            ) : (
              <span className="pv-field__hint" id="hint-venue">
                {geocoding
                  ? 'Looking up coordinates for this city…'
                  : 'Shown on the landing-page globe. Coordinates auto-fill from the host city.'}
              </span>
            )}
          </div>

          <div className="pv-form-grid">
            <div className="pv-field">
              <label className="pv-field__label" htmlFor="create-hack-lat">
                Latitude
              </label>
              <input
                id="create-hack-lat"
                type="number"
                step="any"
                min="-90"
                max="90"
                className="pv-input"
                value={values.latitude}
                onChange={set('latitude')}
                placeholder="12.9716"
                aria-invalid={showError('latitude') ? 'true' : undefined}
              />
              {showError('latitude') ? (
                <span className="pv-field__error" role="alert">
                  <Icon name="alert" size={12} />
                  {showError('latitude')}
                </span>
              ) : (
                <span className="pv-field__hint">Optional override (WGS84).</span>
              )}
            </div>
            <div className="pv-field">
              <label className="pv-field__label" htmlFor="create-hack-lng">
                Longitude
              </label>
              <input
                id="create-hack-lng"
                type="number"
                step="any"
                min="-180"
                max="180"
                className="pv-input"
                value={values.longitude}
                onChange={set('longitude')}
                placeholder="77.5946"
                aria-invalid={showError('longitude') ? 'true' : undefined}
              />
              {showError('longitude') ? (
                <span className="pv-field__error" role="alert">
                  <Icon name="alert" size={12} />
                  {showError('longitude')}
                </span>
              ) : (
                <span className="pv-field__hint">Optional override (WGS84).</span>
              )}
            </div>
          </div>

          <div className="pv-field">
            <label className="pv-field__label" htmlFor="create-hack-desc">
              Description
            </label>
            <textarea
              id="create-hack-desc"
              className="pv-textarea"
              value={values.description}
              onChange={set('description')}
              placeholder="One or two lines that participants will see on the event card."
              rows={3}
              maxLength={500}
            />
            <span className="pv-field__hint">
              {values.description.length}/500 characters
            </span>
          </div>

          <div className="pv-field">
            <span className="pv-field__label">Organizer / escrow address</span>
            <div>
              <AddressChip
                address={organizerEscrowAddress}
                label="organizer escrow address"
                full
              />
            </div>
            <span className="pv-field__hint">
              Locked to your organizer email for this browser session.
              the correct escrow destination.
            </span>
          </div>
        </div>
      </div>

      {errorCount > 0 || saveError ? (
        <div
          className="pv-alert pv-alert--danger"
          role="alert"
          aria-live="polite"
          style={{ margin: '0 var(--pv-space-7) var(--pv-space-7)' }}
        >
          <span className="pv-alert__icon">
            <Icon name="alert" size={16} />
          </span>
          <div className="pv-alert__content">
            <p className="pv-alert__title">
              {saveError
                ? 'Could not create the event'
                : `Fix ${errorCount} field${errorCount === 1 ? '' : 's'} to continue`}
            </p>
            {saveError ? <p className="pv-alert__text">{saveError}</p> : null}
          </div>
        </div>
      ) : null}

      <div className="pv-card__footer">
        <button type="button" className="pv-btn pv-btn--secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="pv-btn pv-btn--primary">
          <Icon name="plus" size={15} />
          Create hackathon
        </button>
      </div>
    </form>
  )
}
