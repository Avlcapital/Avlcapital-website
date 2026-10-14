import { useEffect, useRef, useState } from 'react'
import { products } from '../data/content.js'

const REQUEST_TIMEOUT_MS = 10_000

export default function ContactForm() {
  const [status, setStatus] = useState('idle')
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const errorSummary = useRef(null)

  useEffect(() => {
    if (status === 'error') errorSummary.current?.focus()
  }, [status])

  function clearFieldError(name) {
    if (!name) return
    setErrors((current) => {
      if (!current[name]) return current
      const next = { ...current }
      delete next[name]
      return next
    })
  }

  async function submit(event) {
    event.preventDefault()
    if (status === 'submitting') return
    setStatus('submitting')
    setErrors({})
    setMessage('')
    const values = new FormData(event.currentTarget)
    const payload = Object.fromEntries(values)
    payload.consent = values.get('consent') === 'on'
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const response = await fetch('/api/consultations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal })
      const result = await response.json().catch(() => ({}))
      if (response.status === 201) {
        setStatus('success')
        return
      }
      if (response.status === 400 && result.error === 'validation_error') setErrors(result.fields || {})
      setMessage(result.message || 'We could not submit your enquiry. Please try again.')
      setStatus('error')
    } catch (error) {
      setMessage(error?.name === 'AbortError' ? 'The request timed out. Please try again.' : 'We could not reach the service. Check your connection and try again.')
      setStatus('error')
    } finally {
      clearTimeout(timeout)
    }
  }

  if (status === 'success') return <div className="success" role="status"><b>✓</b><h3>Thank you.</h3><p>Your consultation enquiry has been received and securely recorded.</p><button type="button" onClick={() => setStatus('idle')}>Send another enquiry ↗</button></div>
  const fieldError = (name) => errors[name] && <span className="field-error" id={`${name}-error`}>{errors[name]}</span>
  const describedBy = (name) => errors[name] ? `${name}-error` : undefined

  return <form onSubmit={submit} onChange={(event) => clearFieldError(event.target.name)} noValidate>
    {status === 'error' && <div className="form-error" role="alert" tabIndex="-1" ref={errorSummary}><strong>We couldn't submit your enquiry.</strong><p>{message}</p></div>}
    <div className="fields">
      <label>Full name<input required name="name" autoComplete="name" placeholder="Your name" aria-invalid={Boolean(errors.name)} aria-describedby={describedBy('name')} />{fieldError('name')}</label>
      <label>Phone number<input required name="phone" type="tel" autoComplete="tel" placeholder="+254 7XX XXX XXX" aria-invalid={Boolean(errors.phone)} aria-describedby={describedBy('phone')} />{fieldError('phone')}</label>
    </div>
    <label>Email address<input required name="email" type="email" autoComplete="email" placeholder="you@company.com" aria-invalid={Boolean(errors.email)} aria-describedby={describedBy('email')} />{fieldError('email')}</label>
    <label>I'm interested in<select required name="solution" defaultValue="" aria-invalid={Boolean(errors.solution)} aria-describedby={describedBy('solution')}><option value="" disabled>Select a solution</option>{products.map(({ title }) => <option key={title}>{title}</option>)}</select>{fieldError('solution')}</label>
    <label>Tell us briefly what you need<textarea name="message" rows="4" maxLength="2000" placeholder="Amount, purpose and preferred timeline" aria-invalid={Boolean(errors.message)} aria-describedby={describedBy('message')} />{fieldError('message')}</label>
    <label className="website-field" aria-hidden="true">Website<input name="website" type="text" tabIndex="-1" autoComplete="off" /></label>
    <label className="consent"><input required name="consent" type="checkbox" aria-invalid={Boolean(errors.consent)} aria-describedby={describedBy('consent')} /> I consent to being contacted about this enquiry.</label>{fieldError('consent')}
    <button className="btn" type="submit" disabled={status === 'submitting'}>{status === 'submitting' ? 'Submitting…' : 'Request a consultation ↗'}</button>
  </form>
}
