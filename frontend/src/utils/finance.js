export function calculateMonthlyRepayment(amount, months, annualRate) {
  const monthlyRate = annualRate / 1200
  if (!monthlyRate) return amount / months
  return amount * monthlyRate * (1 + monthlyRate) ** months / ((1 + monthlyRate) ** months - 1)
}

export function formatKes(value) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency', currency: 'KES', maximumFractionDigits: 0,
  }).format(value)
}
