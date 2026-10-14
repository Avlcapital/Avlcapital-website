import { Link } from 'react-router-dom'
import { products } from '../data/content.js'

export default function ProductCards({ limit }) {
  return <div className="cards">{products.slice(0, limit).map((product, index) => <article key={product.title}><div className="card-top"><b>{product.icon}</b><small>{String(index + 1).padStart(2, '0')}</small></div><span>{product.audience}</span><h3>{product.title}</h3><p>{product.description}</p><Link to="/contact">Enquire ↗</Link></article>)}</div>
}
