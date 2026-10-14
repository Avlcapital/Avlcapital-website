import { useState } from 'react'
import { products } from '../data/content.js'

export default function ContactForm() {
  const [sent, setSent] = useState(false)
  if (sent) return <div className="success" role="status"><b>✓</b><h3>Thank you.</h3><p>Your enquiry has been captured in this demo. Connect this form to email or CRM before launch.</p><button type="button" onClick={() => setSent(false)}>Send another enquiry ↗</button></div>
  return <form onSubmit={(event) => { event.preventDefault(); setSent(true) }}><div className="fields"><label>Full name<input required name="name" autoComplete="name" placeholder="Your name" /></label><label>Phone number<input required name="phone" type="tel" autoComplete="tel" placeholder="+254 7XX XXX XXX" /></label></div><label>Email address<input required name="email" type="email" autoComplete="email" placeholder="you@company.com" /></label><label>I'm interested in<select required name="solution" defaultValue=""><option value="" disabled>Select a solution</option>{products.map(({ title }) => <option key={title}>{title}</option>)}</select></label><label>Tell us briefly what you need<textarea name="message" rows="4" placeholder="Amount, purpose and preferred timeline" /></label><label className="consent"><input required name="consent" type="checkbox" /> I consent to being contacted about this enquiry.</label><button className="btn" type="submit">Request a consultation ↗</button></form>
}
