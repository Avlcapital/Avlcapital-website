import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import Logo from './Logo.jsx'

const links = [['/about', 'About'], ['/solutions', 'Solutions'], ['/why-avl', 'Why AVL'], ['/insights', 'Insights']]

export default function Header() {
  const [open, setOpen] = useState(false)
  return <header className="site-header"><div className="nav-wrap">
    <Logo />
    <button className="menu-button" type="button" aria-expanded={open} aria-controls="primary-nav" onClick={() => setOpen(!open)}><span /><span /><span className="sr-only">Toggle menu</span></button>
    <nav id="primary-nav" className={open ? 'open' : ''} aria-label="Primary navigation">
      {links.map(([to, label]) => <NavLink key={to} to={to} onClick={() => setOpen(false)}>{label}</NavLink>)}
      <NavLink className="nav-cta" to="/contact" onClick={() => setOpen(false)}>Talk to us ↗</NavLink>
    </nav>
  </div></header>
}
