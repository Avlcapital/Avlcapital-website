import { useCallback, useEffect, useState } from 'react'

const api = async (path, options = {}) => {
  const response = await fetch(`/api${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...options.headers }, ...options })
  const body = response.status === 204 ? null : await response.json().catch(() => ({}))
  if (!response.ok) { const error = new Error(body.message || 'Something went wrong.'); error.status = response.status; throw error }
  return body
}

function AccessForm({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage('')
    const fields = Object.fromEntries(new FormData(event.currentTarget))
    try {
      if (mode === 'login') { const result = await api('/admin/login', { method: 'POST', body: JSON.stringify(fields) }); onLogin(result.admin) }
      else if (mode === 'forgot') { await api('/admin/forgot-password', { method: 'POST', body: JSON.stringify(fields) }); setMessage('If that account exists, a reset code has been sent.') }
      else { await api('/admin/reset-password', { method: 'POST', body: JSON.stringify(fields) }); setMessage('Password reset. You can now sign in.'); setMode('login') }
    } catch (error) { setMessage(error.message) } finally { setBusy(false) }
  }
  return <main className="admin-shell admin-access"><section className="admin-card"><p className="kicker">Staff access</p><h1>{mode === 'login' ? 'Consultation inbox' : mode === 'forgot' ? 'Request a reset code' : 'Reset your password'}</h1><form onSubmit={submit} aria-describedby="access-message"><label>Email<input name="email" type="email" autoComplete="email" required /></label>{mode === 'reset' && <label>Six-digit code<input name="code" inputMode="numeric" pattern="[0-9]{6}" required /></label>}{mode !== 'forgot' && <label>{mode === 'login' ? 'Password' : 'New password'}<input name="password" type="password" minLength="12" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /></label>}<button className="btn" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Continue'}</button></form><p id="access-message" role="status">{message}</p><div className="admin-switch">{mode !== 'login' && <button onClick={() => setMode('login')}>Back to sign in</button>}{mode === 'login' && <button onClick={() => setMode('forgot')}>Forgot password?</button>}{mode === 'forgot' && <button onClick={() => setMode('reset')}>I have a code</button>}</div></section></main>
}

export default function Admin() {
  const [admin, setAdmin] = useState(undefined)
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [selected, setSelected] = useState(null)
  const [message, setMessage] = useState('')
  const load = useCallback(async (page = 1) => { try { const data = await api(`/consultations?page=${page}&pageSize=20`); setItems(data.items); setPagination({ page: data.page, pages: Math.max(1, data.pages), total: data.total }) } catch (error) { if (error.status === 401) setAdmin(null); else setMessage(error.message) } }, [])
  useEffect(() => { api('/admin/session').then((data) => setAdmin(data.admin)).catch(() => setAdmin(null)) }, [])
  // Loading the protected collection is an external synchronization triggered by session state.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { if (admin) load() }, [admin, load])
  if (admin === undefined) return <main className="admin-shell"><p role="status">Checking access…</p></main>
  if (!admin) return <AccessForm onLogin={setAdmin} />
  async function open(item) { try { const detail = await api(`/consultations/${item.id}`); setSelected(detail); if (!detail.readAt) await update(detail, true) } catch (error) { setMessage(error.message) } }
  async function update(item, read) { try { const changed = await api(`/consultations/${item.id}/status`, { method: 'PATCH', body: JSON.stringify({ read }) }); setItems((current) => current.map((entry) => entry.id === changed.id ? changed : entry)); setSelected((current) => current?.id === changed.id ? changed : current) } catch (error) { setMessage(error.message) } }
  async function logout() { try { await api('/admin/logout', { method: 'POST' }); setAdmin(null); setSelected(null) } catch (error) { setMessage(`Could not sign out. ${error.message}`) } }
  async function addAdmin(event) { event.preventDefault(); const form = event.currentTarget; try { await api('/admin/accounts', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) }); form.reset(); setMessage('Administrator created.') } catch (error) { setMessage(error.message) } }
  return <main className="admin-shell"><header className="admin-bar"><div><p className="kicker">AVL Capital</p><h1>Consultation inbox</h1><small>Signed in as {admin.email}</small></div><button onClick={logout}>Sign out</button></header><p role="status">{message}</p><div className="admin-grid"><section className="admin-list" aria-label="Consultation messages"><h2>Messages</h2><p aria-live="polite">Page {pagination.page} of {pagination.pages} · {pagination.total} messages</p>{items.length === 0 ? <p>No consultation messages yet.</p> : items.map((item) => <button className={item.readAt ? '' : 'unread'} key={item.id} onClick={() => open(item)}><strong>{item.name}</strong><span>{item.solution}</span><time>{new Date(item.createdAt).toLocaleString()}</time></button>)}<nav className="admin-pages" aria-label="Inbox pages"><button disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>Previous</button><button disabled={pagination.page >= pagination.pages} onClick={() => load(pagination.page + 1)}>Next</button></nav></section><section className="admin-detail" aria-live="polite">{selected ? <><div className="admin-detail-head"><h2>{selected.name}</h2><button onClick={() => update(selected, !selected.readAt)}>Mark {selected.readAt ? 'unread' : 'read'}</button></div><p><a href={`mailto:${selected.email}`}>{selected.email}</a><br /><a href={`tel:${selected.phone}`}>{selected.phone}</a></p><p><strong>{selected.solution}</strong></p><p className="admin-message">{selected.message || 'No additional message.'}</p></> : <p>Select a message to view its details.</p>}</section></div><details className="admin-create"><summary>Add administrator</summary><form onSubmit={addAdmin}><label>Email<input name="email" type="email" required /></label><label>Temporary password<input name="password" type="password" minLength="12" required /></label><button className="btn">Create administrator</button></form></details></main>
}
