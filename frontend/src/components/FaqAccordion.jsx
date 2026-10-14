import { useState } from 'react'
import { faqs } from '../data/content.js'

export default function FaqAccordion() {
  const [open, setOpen] = useState(0)
  return <div className="faq-list">{faqs.map(([question, answer], index) => { const active = open === index; return <article className={active ? 'active' : ''} key={question}><h3><button type="button" aria-expanded={active} aria-controls={`faq-${index}`} onClick={() => setOpen(active ? -1 : index)}><span>{question}</span><b>{active ? '−' : '+'}</b></button></h3><p id={`faq-${index}`} hidden={!active}>{answer}</p></article> })}</div>
}
