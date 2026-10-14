import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero.jsx'

export default function NotFound() { return <PageHero kicker="404 · Page not found" title={<>That route has <em>moved on.</em></>}><span>We couldn’t find the page you requested. </span><Link className="inline-link" to="/">Return to the AVL Capital home page ↗</Link></PageHero> }
