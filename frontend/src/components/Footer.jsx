import { Link } from 'react-router-dom'
import Logo from './Logo.jsx'

export default function Footer() {
  return <footer><div className="wrap footer-top"><Logo /><p>Innovative, credible financial services for individuals and businesses across Kenya.</p><a href="#top" aria-label="Back to top">↑</a></div><div className="wrap footer-bottom"><span>© 2026 AVL Capital Limited</span><span>Licensed Digital Credit Provider · Regulated by the Central Bank of Kenya</span><span><Link to="/contact">Contact</Link></span></div></footer>
}
