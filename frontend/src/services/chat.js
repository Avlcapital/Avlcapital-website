const request = async (path, options = {}) => {
  const response = await fetch(`/api/chat${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...options.headers }, ...options })
  if (response.status === 204) return null
  const body = await response.json().catch(() => ({}))
  if (!response.ok) { const error = new Error(body.message || 'Chat is unavailable.'); error.status = response.status; error.fields = body.fields; throw error }
  return body
}

export const chatApi = {
  session: () => request('/session'),
  start: (profile) => request('/session', { method: 'POST', body: JSON.stringify(profile) }),
  requestRecovery: (email) => request('/recovery/request', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyRecovery: (email, code) => request('/recovery/verify', { method: 'POST', body: JSON.stringify({ email, code }) }),
  messages: () => request('/messages'),
  send: (body) => request('/messages', { method: 'POST', body: JSON.stringify({ body }) }),
  stream: (onEvent, onError) => { const source = new EventSource('/api/chat/stream'); source.onmessage = ({ data }) => onEvent(JSON.parse(data)); source.onerror = onError; return () => source.close() },
}
