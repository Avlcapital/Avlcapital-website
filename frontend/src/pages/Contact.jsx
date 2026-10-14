import ContactForm from '../components/ContactForm.jsx'
import PageHero from '../components/PageHero.jsx'

export default function Contact() { return <><PageHero kicker="Start a conversation" title={<>Let’s fund what’s <em>next.</em></>}>Tell us what you’re working toward. Our team will help you understand the options and next steps.</PageHero><section className="contact-section"><div className="wrap split"><div><h2>Request a <em>consultation.</em></h2><p>Share the purpose, amount and preferred timeline so we can start with the right context.</p></div><ContactForm /></div></section></> }
