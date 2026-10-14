export default function SectionHeading({ kicker, children }) {
  return <div className="section-heading"><p className="kicker dark">{kicker}</p><h2>{children}</h2></div>
}
