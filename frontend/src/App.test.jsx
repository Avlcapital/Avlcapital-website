// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

function renderRoute(route = '/') {
  return render(<StrictMode><MemoryRouter initialEntries={[route]}><App /></MemoryRouter></StrictMode>)
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => Promise.resolve())
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

async function fillConsultation(user) {
  await user.type(screen.getByLabelText(/full name/i), 'Amina Kamau')
  await user.type(screen.getByLabelText(/phone number/i), '+254700000000')
  await user.type(screen.getByLabelText(/email address/i), 'amina@example.com')
  await user.selectOptions(screen.getByLabelText(/interested in/i), 'Short-term loans')
  await user.click(screen.getByLabelText(/I consent/i))
}

async function fillPartner(user) {
  await user.type(screen.getByLabelText(/contact name/i), 'Jane Wanjiku')
  await user.type(screen.getByLabelText(/organization/i), 'Highway Fuels')
  await user.type(screen.getByLabelText(/your role/i), 'Owner')
  await user.selectOptions(screen.getByLabelText(/partner type/i), 'Petrol station')
  await user.type(screen.getByLabelText(/phone number/i), '+254711222333')
  await user.type(screen.getByLabelText(/email address/i), 'jane@example.com')
  await user.type(screen.getByLabelText(/business location/i), 'Nakuru')
  await user.type(screen.getByLabelText(/partnership interest/i), 'Customer finance')
  await user.click(screen.getByLabelText(/I consent/i))
}

describe('AVL routed website', () => {
  it('keeps the admin route outside public navigation and shows protected access', async () => {
    fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'unauthorized' }) })
    renderRoute('/admin')
    expect(await screen.findByRole('heading', { name: /enquiry inbox/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('minlength', '12')
    expect(screen.queryByRole('navigation', { name: /primary navigation/i })).not.toBeInTheDocument()
  })

  it('renders the authenticated inbox, message detail, and read control', async () => {
    fetch.mockImplementation(async (url, options = {}) => {
      if (url.endsWith('/admin/session')) return { ok: true, status: 200, json: async () => ({ admin: { email: 'owner@example.com' } }) }
      if (url.startsWith('/api/consultations?') && !options.method) return { ok: true, status: 200, json: async () => ({ items: [{ id: '507f1f77bcf86cd799439011', name: 'Amina', solution: 'Trade finance', createdAt: '2026-01-02T00:00:00.000Z', readAt: null }], page: 1, pages: 2, total: 21 }) }
      if (url.endsWith('507f1f77bcf86cd799439011') && !options.method) return { ok: true, status: 200, json: async () => ({ id: '507f1f77bcf86cd799439011', name: 'Amina', email: 'a@example.com', phone: '+254700000000', solution: 'Trade finance', message: 'Hello', createdAt: '2026-01-02T00:00:00.000Z', readAt: null }) }
      return { ok: true, status: 200, json: async () => ({ id: '507f1f77bcf86cd799439011', name: 'Amina', email: 'a@example.com', phone: '+254700000000', solution: 'Trade finance', message: 'Hello', createdAt: '2026-01-02T00:00:00.000Z', readAt: '2026-01-03T00:00:00.000Z' }) }
    })
    const user = userEvent.setup()
    renderRoute('/admin')
    await user.click(await screen.findByRole('button', { name: /Amina/i }))
    expect(await screen.findByText('Hello')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mark unread/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(fetch).toHaveBeenCalledWith('/api/consultations?page=2&pageSize=20', expect.any(Object))
  })

  it('shows the authenticated empty inbox state', async () => {
    fetch.mockImplementation(async (url) => ({ ok: true, status: 200, json: async () => url.endsWith('/admin/session') ? { admin: { email: 'owner@example.com' } } : { items: [], page: 1, pages: 0, total: 0 } }))
    renderRoute('/admin')
    expect(await screen.findByText(/no consultation messages yet/i)).toBeInTheDocument()
  })

  it('logs in successfully and loads the inbox', async () => {
    fetch.mockImplementation(async (url) => {
      if (url.endsWith('/admin/session')) return { ok: false, status: 401, json: async () => ({}) }
      if (url.endsWith('/admin/login')) return { ok: true, status: 200, json: async () => ({ admin: { email: 'owner@example.com' } }) }
      return { ok: true, status: 200, json: async () => ({ items: [], page: 1, pages: 0, total: 0 }) }
    })
    const user = userEvent.setup(); renderRoute('/admin')
    await user.type(await screen.findByLabelText('Email'), 'owner@example.com')
    await user.type(screen.getByLabelText('Password'), 'very-long-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText(/signed in as owner@example.com/i)).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/api/admin/login', expect.objectContaining({ method: 'POST', credentials: 'include' }))
  })

  it('supports forgot-password and OTP reset workflows', async () => {
    fetch.mockImplementation(async (url) => url.endsWith('/admin/session') ? { ok: false, status: 401, json: async () => ({}) } : { ok: true, status: 200, json: async () => ({ message: 'ok' }) })
    const user = userEvent.setup(); renderRoute('/admin')
    await user.click(await screen.findByRole('button', { name: /forgot password/i }))
    await user.type(screen.getByLabelText('Email'), 'owner@example.com')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText(/reset code has been sent/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /I have a code/i }))
    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'owner@example.com')
    await user.type(screen.getByLabelText(/six-digit code/i), '123456')
    await user.type(screen.getByLabelText(/new password/i), 'replacement-password')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText(/password reset/i)).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/api/admin/reset-password', expect.objectContaining({ method: 'POST' }))
  })

  it('shows feedback when logout fails', async () => {
    fetch.mockImplementation(async (url) => {
      if (url.endsWith('/admin/session')) return { ok: true, status: 200, json: async () => ({ admin: { email: 'owner@example.com' } }) }
      if (url.endsWith('/admin/logout')) return { ok: false, status: 500, json: async () => ({ message: 'Try again later.' }) }
      return { ok: true, status: 200, json: async () => ({ items: [], page: 1, pages: 0, total: 0 }) }
    })
    const user = userEvent.setup(); renderRoute('/admin')
    await user.click(await screen.findByRole('button', { name: /sign out/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/could not sign out.*try again later/i)
  })

  it.each([
    ['/about', /Purpose-driven lending/], ['/solutions', /Solutions for/],
    ['/why-avl', /Confidence behind/], ['/insights', /Milestones that/],
    ['/contact', /fund what/],
  ])('renders a direct visit to %s', (route, heading) => {
    renderRoute(route)
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /primary navigation/i })).toBeInTheDocument()
    expect(document.querySelector('footer')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact')
  })

  it('shows a branded fallback for an unknown route', () => {
    renderRoute('/does-not-exist')
    expect(screen.getByRole('heading', { name: /route has moved on/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /return to the AVL Capital home page/i })).toHaveAttribute('href', '/')
  })

  it('presents the official Pesa na Pesa and Bima Hima product details', () => {
    renderRoute('/solutions')
    expect(screen.getByRole('heading', { name: 'Pesa na Pesa' })).toBeInTheDocument()
    expect(screen.getAllByText('*519*25#')).toHaveLength(2)
    expect(screen.getByText('990390')).toBeInTheDocument()
    expect(screen.getByText(/financing terms of up to four months/i)).toBeInTheDocument()
    expect(screen.getByText(/borrow only after reviewing the full cost/i)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /official terms/i })).toHaveLength(2)
  })

  it('navigates, marks the active route, scrolls to top, and closes the mobile menu', async () => {
    const user = userEvent.setup()
    renderRoute()
    await user.click(screen.getByRole('button', { name: /toggle menu/i }))
    const link = screen.getByRole('link', { name: 'Solutions' })
    await user.click(link)
    expect(screen.getByRole('heading', { name: /Solutions for/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Solutions' })).toHaveClass('active')
    expect(screen.getByRole('navigation')).not.toHaveClass('open')
    expect(window.scrollTo).toHaveBeenCalled()
  })

  it('updates the illustrative repayment and retains its disclaimer', async () => {
    const user = userEvent.setup()
    renderRoute()
    const amount = screen.getByRole('slider', { name: /loan amount/i })
    const rate = screen.getByRole('spinbutton', { name: /illustrative annual rate/i })
    const term = screen.getByRole('combobox', { name: /term/i })
    expect(amount).toHaveAttribute('min', '50000')
    expect(amount).toHaveAttribute('max', '5000000')
    expect(amount).toHaveAttribute('step', '50000')
    expect(rate).toHaveAttribute('min', '1')
    expect(rate).toHaveAttribute('max', '50')
    expect([...term.options].map((option) => option.value)).toEqual(['3', '6', '12', '24', '36'])
    const estimate = document.querySelector('.estimate b')
    const initial = estimate.textContent
    await user.clear(rate)
    await user.type(rate, '10')
    expect(estimate.textContent).not.toBe(initial)
    expect(screen.getByText(/illustrative only/i)).toBeInTheDocument()
  })

  it('disables duplicate submission while pending and confirms only a 201 response', async () => {
    const user = userEvent.setup()
    renderRoute('/contact')
    const submit = screen.getByRole('button', { name: /request a consultation/i })
    await fillConsultation(user)
    let resolveRequest
    fetch.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve }))
    await user.click(submit)
    expect(submit).toBeDisabled()
    await user.click(submit)
    expect(fetch).toHaveBeenCalledTimes(1)
    resolveRequest({ status: 201, json: async () => ({ status: 'received', id: 'id' }) })
    expect(await screen.findByRole('status')).toHaveTextContent(/securely recorded/i)
  })

  it('preserves values and presents accessible server validation errors', async () => {
    const user = userEvent.setup()
    fetch.mockResolvedValue({ status: 400, json: async () => ({ error: 'validation_error', message: 'Please correct the highlighted fields.', fields: { email: 'Enter a valid email address.', name: 'Enter your full name.' } }) })
    renderRoute('/contact'); await fillConsultation(user); await user.click(screen.getByRole('button', { name: /request a consultation/i }))
    const summary = await screen.findByRole('alert')
    expect(summary).toHaveTextContent(/correct the highlighted/i)
    expect(summary).toHaveFocus()
    expect(screen.getByLabelText(/email address/i)).toHaveValue('amina@example.com')
    expect(screen.getByLabelText(/email address/i)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    await user.type(screen.getByLabelText(/email address/i), 'x')
    expect(screen.queryByText('Enter a valid email address.')).not.toBeInTheDocument()
    expect(screen.getByText('Enter your full name.')).toBeInTheDocument()
  })

  it('times out a stalled request and re-enables submission', async () => {
    const user = userEvent.setup()
    fetch.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    renderRoute('/contact'); await fillConsultation(user)
    const submit = screen.getByRole('button', { name: /request a consultation/i })
    vi.useFakeTimers()
    fireEvent.click(submit)
    expect(submit).toBeDisabled()
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
    expect(screen.getByRole('alert')).toHaveTextContent(/request timed out/i)
    expect(submit).not.toBeDisabled()
    vi.useRealTimers()
  })

  it('shows a recoverable network error and submits again only when retried', async () => {
    const user = userEvent.setup()
    fetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ status: 201, json: async () => ({ status: 'received' }) })
    renderRoute('/contact'); await fillConsultation(user)
    await user.click(screen.getByRole('button', { name: /request a consultation/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/check your connection/i)
    expect(screen.queryByText('Thank you.')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /request a consultation/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/securely recorded/i)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('shows rate-limit failures and allows a later retry', async () => {
    const user = userEvent.setup()
    fetch.mockResolvedValueOnce({ status: 429, json: async () => ({ error: 'rate_limited', message: 'Too many requests. Please try again later.' }) }).mockResolvedValueOnce({ status: 201, json: async () => ({ status: 'received' }) })
    renderRoute('/contact'); await fillConsultation(user); const submit = screen.getByRole('button', { name: /request a consultation/i })
    await user.click(submit); expect(await screen.findByRole('alert')).toHaveTextContent(/too many requests/i)
    expect(submit).not.toBeDisabled(); await user.click(submit)
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())
  })

  it('presents partnership prominently and submits a dedicated partner payload', async () => {
    const user = userEvent.setup(); fetch.mockResolvedValue({ status: 201, json: async () => ({ status: 'received', id: 'partner-id' }) })
    renderRoute('/partner')
    expect(screen.getByRole('heading', { level: 1, name: /shared growth/i })).toBeInTheDocument()
    expect(screen.getByText(/petrol stations are especially welcome/i)).toBeInTheDocument()
    await fillPartner(user); await user.click(screen.getByRole('button', { name: /start the conversation/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/partnership enquiry has been received/i)
    expect(fetch).toHaveBeenCalledWith('/api/partners', expect.objectContaining({ method: 'POST', body: expect.stringContaining('Highway Fuels') }))
  })

  it('switches to the protected partner queue and displays full lead details', async () => {
    fetch.mockImplementation(async (url, options = {}) => {
      if (url.endsWith('/admin/session')) return { ok: true, status: 200, json: async () => ({ admin: { email: 'owner@example.com' } }) }
      if (url.startsWith('/api/consultations?')) return { ok: true, status: 200, json: async () => ({ items: [], page: 1, pages: 0, total: 0 }) }
      if (url.startsWith('/api/partners?')) return { ok: true, status: 200, json: async () => ({ items: [{ id: '507f1f77bcf86cd799439011', contactName: 'Jane', organization: 'Highway Fuels', partnerType: 'Petrol station', createdAt: '2026-01-03T00:00:00.000Z', readAt: null }], page: 1, pages: 1, total: 1 }) }
      if (url.endsWith('/api/partners/507f1f77bcf86cd799439011') && !options.method) return { ok: true, status: 200, json: async () => ({ id: '507f1f77bcf86cd799439011', contactName: 'Jane', organization: 'Highway Fuels', role: 'Owner', email: 'j@example.com', phone: '+254711222333', partnerType: 'Petrol station', location: 'Nakuru', stationCount: 3, interest: 'Customer finance', createdAt: '2026-01-03T00:00:00.000Z', readAt: null }) }
      return { ok: true, status: 200, json: async () => ({ id: '507f1f77bcf86cd799439011', contactName: 'Jane', organization: 'Highway Fuels', role: 'Owner', email: 'j@example.com', phone: '+254711222333', partnerType: 'Petrol station', location: 'Nakuru', stationCount: 3, interest: 'Customer finance', createdAt: '2026-01-03T00:00:00.000Z', readAt: '2026-01-04T00:00:00.000Z' }) }
    })
    const user = userEvent.setup(); renderRoute('/admin')
    await user.click(await screen.findByRole('button', { name: 'Partner enquiries' }))
    await user.click(await screen.findByRole('button', { name: /Highway Fuels/i }))
    expect(await screen.findByText('Customer finance')).toBeInTheDocument()
    expect(screen.getByText(/Owner/)).toBeInTheDocument()
  })

  it('associates partner server field errors and succeeds when retried', async () => {
    const user = userEvent.setup()
    fetch.mockResolvedValueOnce({ status: 400, json: async () => ({ error: 'validation_error', message: 'Please correct the highlighted fields.', fields: { email: 'Enter a valid email address.' } }) }).mockResolvedValueOnce({ status: 201, json: async () => ({ status: 'received', id: 'partner-id' }) })
    renderRoute('/partner'); await fillPartner(user)
    const email = screen.getByLabelText(/email address/i)
    await user.click(screen.getByRole('button', { name: /start the conversation/i }))
    expect(await screen.findByRole('alert')).toHaveFocus()
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveAttribute('aria-describedby', 'email-error')
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    await user.type(email, 'x')
    expect(screen.queryByText('Enter a valid email address.')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /start the conversation/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/partnership enquiry has been received/i)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('ignores an out-of-order consultation response after switching to partners', async () => {
    let resolveConsultations
    fetch.mockImplementation(async (url) => {
      if (url.endsWith('/admin/session')) return { ok: true, status: 200, json: async () => ({ admin: { email: 'owner@example.com' } }) }
      if (url.startsWith('/api/consultations?')) return new Promise((resolve) => { resolveConsultations = resolve })
      if (url.startsWith('/api/partners?')) return { ok: true, status: 200, json: async () => ({ items: [{ id: 'p1', contactName: 'Jane', organization: 'Highway Fuels', partnerType: 'Petrol station', createdAt: '2026-01-03T00:00:00.000Z', readAt: null }], page: 1, pages: 1, total: 1 }) }
      return { ok: false, status: 404, json: async () => ({}) }
    })
    const user = userEvent.setup(); renderRoute('/admin')
    await waitFor(() => expect(resolveConsultations).toBeTypeOf('function'))
    await user.click(screen.getByRole('button', { name: 'Partner enquiries' }))
    expect(await screen.findByRole('button', { name: /Highway Fuels/i })).toBeInTheDocument()
    resolveConsultations({ ok: true, status: 200, json: async () => ({ items: [{ id: 'c1', name: 'Stale consultation', solution: 'Trade finance', createdAt: '2026-01-02T00:00:00.000Z', readAt: null }], page: 9, pages: 9, total: 99 }) })
    await act(async () => Promise.resolve())
    expect(screen.getByRole('button', { name: /Highway Fuels/i })).toBeInTheDocument()
    expect(screen.queryByText('Stale consultation')).not.toBeInTheDocument()
    expect(screen.getByText(/Page 1 of 1 · 1 messages/)).toBeInTheDocument()
  })

  it('starts a live chat and sends a message', async () => {
    class EventSourceStub { close() {} }
    vi.stubGlobal('EventSource', EventSourceStub)
    const conversation = { id: 'chat-1', name: 'Amina', email: 'amina@example.com', phone: '', status: 'open', createdAt: '2026-01-01T00:00:00.000Z' }
    const sent = { id: 'message-1', senderType: 'visitor', body: 'I need funding advice.', createdAt: '2026-01-01T00:01:00.000Z' }
    fetch.mockImplementation(async (url, options = {}) => {
      if (url === '/api/chat/session' && !options.method) return { ok: true, status: 204 }
      if (url === '/api/chat/session' && options.method === 'POST') return { ok: true, status: 201, json: async () => ({ conversation }) }
      if (url === '/api/chat/messages' && options.method === 'POST') return { ok: true, status: 201, json: async () => ({ message: sent }) }
      if (url === '/api/chat/messages') return { ok: true, status: 200, json: async () => ({ conversation, messages: [] }) }
      return { ok: false, status: 404, json: async () => ({}) }
    })
    const user = userEvent.setup(); renderRoute('/')
    await user.click(screen.getByRole('button', { name: /chat with us/i }))
    await user.click(await screen.findByRole('button', { name: /start a new conversation/i }))
    await user.type(await screen.findByLabelText('Name'), 'Amina')
    await user.type(screen.getByLabelText('Email'), 'amina@example.com')
    await user.click(screen.getByRole('button', { name: /start conversation/i }))
    await user.type(await screen.findByLabelText('Message'), 'I need funding advice.')
    await user.click(screen.getByRole('button', { name: /send message/i }))
    expect(await screen.findByText('I need funding advice.')).toBeInTheDocument()
  })

  it('recovers an earlier chat with an accessible one-time-code flow', async () => {
    let source
    class EventSourceStub { constructor() { source = this } close() {} emit(data) { this.onmessage({ data }) } }
    vi.stubGlobal('EventSource', EventSourceStub)
    const conversation = { id: 'chat-1', name: 'Amina', email: 'amina@example.com', status: 'open' }
    const message = { id: 'message-1', senderType: 'admin', body: 'Welcome back', createdAt: '2026-01-01T00:01:00.000Z' }
    fetch.mockImplementation(async (url) => {
      if (url === '/api/chat/session') return { ok: true, status: 204 }
      if (url.endsWith('/recovery/request')) return { ok: true, status: 202, json: async () => ({ message: 'generic' }) }
      if (url.endsWith('/recovery/verify')) return { ok: true, status: 200, json: async () => ({ conversation }) }
      if (url === '/api/chat/messages') return { ok: true, status: 200, json: async () => ({ conversation, messages: [message] }) }
      return { ok: false, status: 404, json: async () => ({}) }
    })
    const user = userEvent.setup(); renderRoute('/'); await user.click(screen.getByRole('button', { name: /chat with us/i }))
    await user.click(await screen.findByRole('button', { name: /continue an earlier conversation/i })); await user.type(screen.getByLabelText('Email'), 'AMINA@example.com'); await user.click(screen.getByRole('button', { name: /email me a code/i }))
    const code = await screen.findByLabelText(/recovery code/i); expect(code).toHaveFocus(); expect(code).toHaveAttribute('autocomplete', 'one-time-code')
    await user.type(code, '123456'); await user.click(screen.getByRole('button', { name: /restore conversation/i }))
    expect(await screen.findByRole('heading', { name: /welcome back, Amina/i })).toBeInTheDocument(); expect(screen.getByText('Welcome back')).toBeInTheDocument()
    act(() => source.emit(JSON.stringify({ type: 'message', message: { id: 'message-2', senderType: 'admin', body: 'Live reply', createdAt: '2026-01-01T00:02:00.000Z' } })))
    expect(await screen.findByText('Live reply')).toBeInTheDocument()
    act(() => source.emit('{malformed'))
    expect(await screen.findByRole('status')).toHaveTextContent(/connection interrupted/i)
    expect(fetch).toHaveBeenCalledWith('/api/chat/recovery/verify', expect.objectContaining({ method: 'POST', body: JSON.stringify({ email: 'amina@example.com', code: '123456' }) }))
  })

  it('lets an administrator reply to and close a live chat', async () => {
    const conversation = { id: '507f1f77bcf86cd799439011', name: 'Amina', email: 'amina@example.com', phone: '', status: 'open', createdAt: '2026-01-01T00:00:00.000Z', lastMessageAt: '2026-01-01T00:01:00.000Z' }
    fetch.mockImplementation(async (url, options = {}) => {
      if (url.endsWith('/admin/session')) return { ok: true, status: 200, json: async () => ({ admin: { email: 'owner@example.com' } }) }
      if (url.startsWith('/api/consultations?')) return { ok: true, status: 200, json: async () => ({ items: [], page: 1, pages: 1, total: 0 }) }
      if (url.startsWith('/api/chat/admin/conversations?')) return { ok: true, status: 200, json: async () => ({ items: [conversation], page: 1, pages: 1, total: 1 }) }
      if (url.endsWith(conversation.id) && !options.method) return { ok: true, status: 200, json: async () => ({ conversation, messages: [] }) }
      if (url.endsWith('/messages')) return { ok: true, status: 201, json: async () => ({ message: { id: 'm1', senderType: 'admin', body: 'Hello Amina', createdAt: '2026-01-01T00:02:00.000Z' } }) }
      if (url.endsWith('/status')) return { ok: true, status: 200, json: async () => ({ conversation: { ...conversation, status: 'closed' } }) }
      return { ok: false, status: 404, json: async () => ({}) }
    })
    const user = userEvent.setup(); renderRoute('/admin')
    await user.click(await screen.findByRole('button', { name: 'Live chats' }))
    await user.click(await screen.findByRole('button', { name: /Amina/i }))
    await user.type(await screen.findByLabelText('Reply'), 'Hello Amina')
    await user.click(screen.getByRole('button', { name: 'Send reply' }))
    expect(await screen.findByText('Hello Amina')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close conversation' }))
    expect(await screen.findByText(/conversation is closed/i)).toBeInTheDocument()
  })
})
