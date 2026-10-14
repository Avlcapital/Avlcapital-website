export const PRODUCT_VALUES = ['Short-term loans', 'Insurance premium finance', 'Salary advances', 'Import finance', 'Trade finance', 'Financial consultancy', 'Microfinance & microcredit']

const normalize = (value) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''

export function validateConsultation(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const data = { name: normalize(source.name), phone: normalize(source.phone), email: normalize(source.email).toLowerCase(), solution: normalize(source.solution), message: typeof source.message === 'string' ? source.message.trim() : '', consent: source.consent === true, website: normalize(source.website) }
  const errors = {}
  if (!data.name) errors.name = 'Enter your full name.'
  else if (data.name.length > 100) errors.name = 'Full name must be 100 characters or fewer.'
  if (!data.phone) errors.phone = 'Enter your phone number.'
  else if (data.phone.length > 30 || !/^\+?[0-9 ()-]{7,30}$/.test(data.phone)) errors.phone = 'Enter a valid phone number.'
  if (!data.email) errors.email = 'Enter your email address.'
  else if (data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Enter a valid email address.'
  if (!PRODUCT_VALUES.includes(data.solution)) errors.solution = 'Select a valid solution.'
  if (data.message.length > 2000) errors.message = 'Message must be 2,000 characters or fewer.'
  if (!data.consent) errors.consent = 'Consent is required before we can contact you.'
  return { data, errors, valid: Object.keys(errors).length === 0 }
}
