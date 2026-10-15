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

describe('AVL routed website', () => {
  it('keeps the admin route outside public navigation and shows protected access', async () => {
    fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'unauthorized' }) })
    renderRoute('/admin')
    expect(await screen.findByRole('heading', { name: /consultation inbox/i })).toBeInTheDocument()
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
})
