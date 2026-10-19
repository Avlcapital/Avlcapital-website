import { useEffect, useRef, useState } from 'react'

const REQUEST_TIMEOUT_MS = 10_000
const partnerTypes = ['Petrol station', 'Retail business', 'Distributor', 'Employer', 'Financial institution', 'Other']

export default function PartnerEnquiryForm() {
  const [status, setStatus] = useState('idle')
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [partnerType, setPartnerType] = useState('')
  const errorSummary = useRef(null)
  useEffect(() => { if (status === 'error') errorSummary.current?.focus() }, [status])
  function clearFieldError(name) { if (!name) return; setErrors((current) => { if (!current[name]) return current; const next = { ...current }; delete next[name]; return next }) }
  async function submit(event) {
    event.preventDefault()
    if (status === 'submitting') return
    setStatus('submitting'); setErrors({}); setMessage('')
    const values = new FormData(event.currentTarget)
    const payload = Object.fromEntries(values); payload.consent = values.get('consent') === 'on'
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const response = await fetch('/api/partners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal })
      const result = await response.json().catch(() => ({}))
      if (response.status === 201) { setStatus('success'); return }
      if (response.status === 400 && result.error === 'validation_error') setErrors(result.fields || {})
      setMessage(result.message || 'We could not submit your partnership enquiry. Please try again.'); setStatus('error')
    } catch (error) { setMessage(error?.name === 'AbortError' ? 'The request timed out. Please try again.' : 'We could not reach the service. Check your connection and try again.'); setStatus('error') }
    finally { clearTimeout(timeout) }
  }
  if (status === 'success') return <div className="success" role="status"><b>✓</b><h3>Thank you for reaching out.</h3><p>Your partnership enquiry has been received. Our team will review the opportunity and contact you.</p><button type="button" onClick={() => setStatus('idle')}>Send another enquiry ↗</button></div>
  const fieldError = (name) => errors[name] && <span className="field-error" id={`${name}-error`}>{errors[name]}</span>
  const describedBy = (name) => errors[name] ? `${name}-error` : undefined
  return <form className="partner-form" onSubmit={submit} onChange={(event) => clearFieldError(event.target.name)} noValidate>
    {status === 'error' && <div className="form-error" role="alert" tabIndex="-1" ref={errorSummary}><strong>We couldn't submit your partnership enquiry.</strong><p>{message}</p></div>}
    <div className="fields"><label>Contact name<input required name="contactName" autoComplete="name" aria-invalid={Boolean(errors.contactName)} aria-describedby={describedBy('contactName')} />{fieldError('contactName')}</label><label>Organization<input required name="organization" autoComplete="organization" aria-invalid={Boolean(errors.organization)} aria-describedby={describedBy('organization')} />{fieldError('organization')}</label></div>
    <div className="fields"><label>Your role<input required name="role" autoComplete="organization-title" aria-invalid={Boolean(errors.role)} aria-describedby={describedBy('role')} />{fieldError('role')}</label><label>Partner type<select required name="partnerType" value={partnerType} onChange={(event) => setPartnerType(event.target.value)} aria-invalid={Boolean(errors.partnerType)} aria-describedby={describedBy('partnerType')}><option value="" disabled>Select partner type</option>{partnerTypes.map((type) => <option key={type}>{type}</option>)}</select>{fieldError('partnerType')}</label></div>
    <div className="fields"><label>Phone number<input required name="phone" type="tel" autoComplete="tel" placeholder="+254 7XX XXX XXX" aria-invalid={Boolean(errors.phone)} aria-describedby={describedBy('phone')} />{fieldError('phone')}</label><label>Email address<input required name="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={describedBy('email')} />{fieldError('email')}</label></div>
    <div className="fields"><label>Business location<input required name="location" autoComplete="address-level2" placeholder="Town or county" aria-invalid={Boolean(errors.location)} aria-describedby={describedBy('location')} />{fieldError('location')}</label>{partnerType === 'Petrol station' && <label>Number of stations <small>(optional)</small><input name="stationCount" type="number" min="1" max="10000" aria-invalid={Boolean(errors.stationCount)} aria-describedby={describedBy('stationCount')} />{fieldError('stationCount')}</label>}</div>
    <label>Partnership interest<textarea required name="interest" rows="5" maxLength="2000" placeholder="Tell us about your business and the opportunity you would like to explore." aria-invalid={Boolean(errors.interest)} aria-describedby={describedBy('interest')} />{fieldError('interest')}</label>
    <label className="website-field" aria-hidden="true">Website<input name="website" type="text" tabIndex="-1" autoComplete="off" /></label>
    <label className="consent"><input required name="consent" type="checkbox" aria-invalid={Boolean(errors.consent)} aria-describedby={describedBy('consent')} /> I consent to being contacted about this partnership enquiry.</label>{fieldError('consent')}
    <button className="btn" type="submit" disabled={status === 'submitting'}>{status === 'submitting' ? 'Submitting…' : 'Start the conversation ↗'}</button>
  </form>
}
