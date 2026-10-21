import Logo from '../Logo.jsx'

const navigation = [{ id: 'overview', label: 'Overview' }, { id: 'consultations', label: 'Consultations' }, { id: 'partners', label: 'Partner enquiries' }, { id: 'chats', label: 'Live chats' }, { id: 'administrators', label: 'Administrators' }]

export default function AdminShell({ admin, view, onView, onLogout, children }) {
  return <main className="admin-app"><aside className="admin-rail"><Logo /><nav aria-label="Admin navigation">{navigation.map((item) => <button key={item.id} className={view === item.id ? 'active' : ''} aria-current={view === item.id ? 'page' : undefined} onClick={() => onView(item.id)}>{item.label}</button>)}</nav><div className="admin-profile"><small>Signed in as</small><span>{admin.email}</span><button onClick={onLogout}>Sign out</button></div></aside><section className="admin-main">{children}</section></main>
}
