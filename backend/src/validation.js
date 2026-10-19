export const PRODUCT_VALUES = ['Short-term loans', 'Insurance premium finance', 'Salary advances', 'Import finance', 'Trade finance', 'Financial consultancy', 'Microfinance & microcredit']
export const PARTNER_TYPE_VALUES = ['Petrol station', 'Retail business', 'Distributor', 'Employer', 'Financial institution', 'Other']

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

export function validatePartnerEnquiry(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const stationCount = typeof source.stationCount === 'number' ? String(source.stationCount) : normalize(source.stationCount)
  const data = {
    contactName: normalize(source.contactName), organization: normalize(source.organization), role: normalize(source.role),
    phone: normalize(source.phone), email: normalize(source.email).toLowerCase(), partnerType: normalize(source.partnerType),
    location: normalize(source.location), stationCount,
    interest: typeof source.interest === 'string' ? source.interest.trim() : '', consent: source.consent === true,
    website: normalize(source.website),
  }
  const errors = {}
  const required = [['contactName', 'Enter your name.'], ['organization', 'Enter your organization.'], ['role', 'Enter your role.'], ['location', 'Enter your location.'], ['interest', 'Tell us about the partnership opportunity.']]
  for (const [field, message] of required) if (!data[field]) errors[field] = message
  for (const field of ['contactName', 'organization', 'role', 'location']) if (data[field]?.length > 120) errors[field] = `${field === 'contactName' ? 'Name' : field[0].toUpperCase() + field.slice(1)} must be 120 characters or fewer.`
  if (!data.phone) errors.phone = 'Enter your phone number.'
  else if (data.phone.length > 30 || !/^\+?[0-9 ()-]{7,30}$/.test(data.phone)) errors.phone = 'Enter a valid phone number.'
  if (!data.email) errors.email = 'Enter your email address.'
  else if (data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Enter a valid email address.'
  if (!PARTNER_TYPE_VALUES.includes(data.partnerType)) errors.partnerType = 'Select a valid partner type.'
  if (data.stationCount && (!/^\d+$/.test(data.stationCount) || Number(data.stationCount) < 1 || Number(data.stationCount) > 10_000)) errors.stationCount = 'Enter a station count between 1 and 10,000.'
  if (data.interest.length > 2000) errors.interest = 'Partnership interest must be 2,000 characters or fewer.'
  if (!data.consent) errors.consent = 'Consent is required before we can contact you.'
  return { data, errors, valid: Object.keys(errors).length === 0 }
}

export function validateChatProfile(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const data = { name: normalize(source.name), email: normalize(source.email).toLowerCase(), phone: normalize(source.phone) }
  const errors = {}
  if (!data.name) errors.name = 'Enter your name.'
  else if (data.name.length > 100) errors.name = 'Name must be 100 characters or fewer.'
  if (!data.email) errors.email = 'Enter your email address.'
  else if (data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Enter a valid email address.'
  if (data.phone && (data.phone.length > 30 || !/^\+?[0-9 ()-]{7,30}$/.test(data.phone))) errors.phone = 'Enter a valid phone number.'
  return { data, errors, valid: Object.keys(errors).length === 0 }
}

export function validateChatMessage(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const data = { body: typeof source.body === 'string' ? source.body.trim() : '' }
  const errors = {}
  if (!data.body) errors.body = 'Enter a message.'
  else if (data.body.length > 2000) errors.body = 'Message must be 2,000 characters or fewer.'
  return { data, errors, valid: Object.keys(errors).length === 0 }
}

export function validateChatRecovery(input, requireCode = false) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const data = { email: normalize(source.email).toLowerCase(), code: normalize(source.code) }
  const errors = {}
  if (!data.email || data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Enter a valid email address.'
  if (requireCode && !/^\d{6}$/.test(data.code)) errors.code = 'Enter the six-digit code.'
  return { data, errors, valid: Object.keys(errors).length === 0 }
}
