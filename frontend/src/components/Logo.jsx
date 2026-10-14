import { Link } from 'react-router-dom'
import logo from '../assets/Logo.jpeg'

export default function Logo() {
  return <Link className="logo" to="/" aria-label="AVL Capital home"><img src={logo} alt="AVL Capital — Purpose Driven Lending" /></Link>
}
