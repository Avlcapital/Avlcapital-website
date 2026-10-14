// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

function renderRoute(route = '/') {
  return render(<MemoryRouter initialEntries={[route]}><App /></MemoryRouter>)
}

beforeEach(() => { window.scrollTo = vi.fn() })
afterEach(() => cleanup())

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

  it('requires consultation fields and confirms a valid demo submission', async () => {
    const user = userEvent.setup()
    renderRoute('/contact')
    const submit = screen.getByRole('button', { name: /request a consultation/i })
    await user.click(submit)
    expect(screen.queryByText('Thank you.')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText(/full name/i), 'Amina Kamau')
    await user.type(screen.getByLabelText(/phone number/i), '+254700000000')
    await user.type(screen.getByLabelText(/email address/i), 'amina@example.com')
    await user.selectOptions(screen.getByLabelText(/interested in/i), 'Short-term loans')
    await user.click(screen.getByLabelText(/I consent/i))
    await user.click(submit)
    expect(screen.getByRole('status')).toHaveTextContent(/captured in this demo/i)
  })
})
