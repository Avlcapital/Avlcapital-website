// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

function renderRoute(route = '/') {
  return render(<MemoryRouter initialEntries={[route]}><App /></MemoryRouter>)
}

beforeEach(() => { window.scrollTo = vi.fn(); global.fetch = vi.fn() })
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers() })

async function fillConsultation(user) {
  await user.type(screen.getByLabelText(/full name/i), 'Amina Kamau')
  await user.type(screen.getByLabelText(/phone number/i), '+254700000000')
  await user.type(screen.getByLabelText(/email address/i), 'amina@example.com')
  await user.selectOptions(screen.getByLabelText(/interested in/i), 'Short-term loans')
  await user.click(screen.getByLabelText(/I consent/i))
}

describe('AVL routed website', () => {
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
