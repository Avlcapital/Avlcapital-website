import { Link } from 'react-router-dom'
import hero from '../assets/avl-hero.png'
import FaqAccordion from '../components/FaqAccordion.jsx'
import ProductCards from '../components/ProductCards.jsx'
import RepaymentCalculator from '../components/RepaymentCalculator.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import { values } from '../data/content.js'

export default function Home() {
  return <>
    <section className="home-hero"><img src={hero} alt="Kenyan entrepreneur working in a Nairobi office" /><div className="shade" /><div className="wrap hero-copy"><p className="kicker">Finance that moves with you</p><h1>Capital for your <em>next move.</em></h1><p>Practical, tailored financing for ambitious individuals and businesses—delivered with clarity, speed and local insight.</p><div className="actions"><Link className="btn" to="/solutions">Explore financing ↗</Link><Link to="/about">Discover AVL ↓</Link></div></div><div className="trust"><div className="wrap"><p><small>REGULATED BY</small>Central Bank of Kenya</p><p><small>LICENSED SINCE</small>05 June 2025</p><p><small>BUILT FOR</small>People & businesses</p></div></div></section>
    <section className="section"><div className="wrap split"><SectionHeading kicker="Who we are">A stronger financial base begins with the <em>right partner.</em></SectionHeading><div className="lead"><p>AVL Capital Limited is a licensed Digital Credit Provider offering customized credit through digital and structured financing platforms.</p><p>We combine technology, market intelligence and disciplined credit appraisal to design solutions around real financial needs.</p><Link to="/about">Our approach ↗</Link></div></div><div className="wrap values">{values.map(([number, title, text]) => <article key={number}><small>{number}</small><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="section pale"><div className="wrap section-head"><SectionHeading kicker="What we finance">Solutions made for <em>real momentum.</em></SectionHeading><p>From an urgent personal need to a complex trade cycle, our expertise covers the moments when the right capital matters most.</p></div><div className="wrap"><ProductCards limit={3} /><div className="center-link"><Link className="btn" to="/solutions">View all solutions ↗</Link></div></div></section>
    <section className="calculator"><div className="wrap split"><div><p className="kicker dark">Plan ahead</p><h2>Estimate your monthly <em>repayment.</em></h2><p>Explore an indicative monthly repayment with adjustable planning inputs.</p></div><RepaymentCalculator /></div></section>
    <section className="section"><div className="wrap faq"><SectionHeading kicker="Good to know">Your questions, <em>answered.</em></SectionHeading><FaqAccordion /></div></section>
    <section className="section partner-cta"><div className="wrap split"><SectionHeading kicker="Commercial partnerships">Grow your reach with a <em>trusted finance partner.</em></SectionHeading><div className="lead"><p>Petrol-station operators and other established businesses can partner with AVL to create more value for their customers.</p><Link className="btn" to="/partner">Explore partnership ↗</Link></div></div></section>
  </>
}
