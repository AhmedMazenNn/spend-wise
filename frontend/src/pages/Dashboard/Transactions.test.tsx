import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

import { AuthProvider } from '../../context/AuthContext'
import { ThemeProvider } from '../../context/ThemeContext'
import '../../i18n'
import { monthToRange, TransactionsPage } from './Transactions'

vi.mock('../../components/LottieIcon', () => ({
  LottieIcon: () => null,
  LOTTIE_FILTERS: {
    slate: '',
    red: '',
    emerald: '',
    slate600: '',
    slate300: '',
    white: '',
    emerald600: '',
  },
}))

vi.mock('../../components/LoadingScreen', () => ({
  LoadingScreen: () => null,
}))

const { fetchExpensesMock } = vi.hoisted(() => ({
  fetchExpensesMock: vi.fn(),
}))

vi.mock('../../api/expenses', () => ({
  fetchExpenses: fetchExpensesMock,
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
}))

vi.mock('../../api/categories', () => ({
  fetchCategories: vi.fn().mockResolvedValue({ categories: [] }),
}))

function renderTransactions() {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <TransactionsPage />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>,
  )
}

describe('monthToRange', () => {
  it('returns the full range for a normal month', () => {
    expect(monthToRange('2026-02')).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
    })
  })

  it('handles leap years', () => {
    expect(monthToRange('2028-02')).toEqual({
      start: '2028-02-01',
      end: '2028-02-29',
    })
  })

  it('handles 31-day months', () => {
    expect(monthToRange('2026-01')).toEqual({
      start: '2026-01-01',
      end: '2026-01-31',
    })
  })
})

describe('TransactionsPage monthly filter', () => {
  beforeEach(() => {
    fetchExpensesMock.mockResolvedValue({ expenses: [], total: 0 })
  })

  it('renders the Specific Month button', () => {
    renderTransactions()
    expect(screen.getByText('Specific Month')).toBeInTheDocument()
  })

  it('reveals a month input when clicked', () => {
    renderTransactions()
    fireEvent.click(screen.getByText('Specific Month'))
    expect(document.querySelector('input[type="month"]')).toBeInTheDocument()
  })

  it('fetches the selected month as a custom date range', async () => {
    renderTransactions()
    fireEvent.click(screen.getByText('Specific Month'))
    const input = document.querySelector('input[type="month"]') as HTMLInputElement
    fireEvent.change(input, { target: { value: '2026-02' } })
    await waitFor(() => {
      expect(fetchExpensesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          period: 'custom',
          startDate: '2026-02-01',
          endDate: '2026-02-28',
        }),
      )
    })
  })
})
