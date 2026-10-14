import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { calculateMonthlyRepayment, formatKes } from '../utils/finance.js'

export default function RepaymentCalculator() {
  const [amount, setAmount] = useState(250000)
  const [months, setMonths] = useState(12)
  const [rate, setRate] = useState(18)
  const monthly = useMemo(() => calculateMonthlyRepayment(amount, months, rate), [amount, months, rate])
  return <div className="calc-box">
    <label><span>Amount <b>{formatKes(amount)}</b></span><input aria-label="Loan amount" type="range" min="50000" max="5000000" step="50000" value={amount} onChange={(event) => setAmount(Number(event.target.value))} /></label>
    <div className="fields"><label>Term<select value={months} onChange={(event) => setMonths(Number(event.target.value))}>{[3, 6, 12, 24, 36].map((value) => <option key={value} value={value}>{value} months</option>)}</select></label><label>Illustrative annual rate<input type="number" value={rate} min="1" max="50" onChange={(event) => setRate(Number(event.target.value))} /></label></div>
    <div className="estimate"><small>Estimated monthly repayment</small><b>{formatKes(monthly)}</b><small>Principal + illustrative interest</small></div>
    <p className="disclaimer">This calculator is illustrative only. It is not a credit offer; pricing, fees, eligibility and final terms are confirmed after assessment.</p>
    <Link className="btn" to="/contact">Discuss your options ↗</Link>
  </div>
}
