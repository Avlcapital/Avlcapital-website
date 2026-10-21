export async function adminApi(path, options = {}) {
  const response = await fetch(`/api${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...options.headers }, ...options })
  const body = response.status === 204 ? null : await response.json().catch(() => ({}))
  if (!response.ok) { const error = new Error(body?.message || 'Something went wrong.'); error.status = response.status; throw error }
  return body
}

export const queueUrl = (path, { page = 1, q = '', filter = 'all' }) => {
  const params = new URLSearchParams({ page, pageSize: 20 })
  if (q.trim()) params.set('q', q.trim())
  if (filter !== 'all') params.set(path.includes('/chat/') ? 'status' : 'read', filter)
  return `${path}?${params}`
}
