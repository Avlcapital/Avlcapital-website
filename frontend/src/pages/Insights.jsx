import PageHero from '../components/PageHero.jsx'
import { milestones } from '../data/content.js'

export default function Insights() { return <><PageHero kicker="Progress with purpose" title={<>Milestones that <em>matter.</em></>}>Regulatory progress and stronger industry relationships build foundations for responsible private lending.</PageHero><section className="section"><div className="wrap timeline">{milestones.map(([label, title, text]) => <article key={label}><small>{label}</small><h3>{title}</h3><p>{text}</p></article>)}</div></section></> }
