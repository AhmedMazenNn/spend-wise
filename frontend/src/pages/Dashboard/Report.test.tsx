import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Report } from './Report'
import { BrowserRouter } from 'react-router-dom'

import { AuthProvider } from '../../context/AuthContext'
import { ThemeProvider } from '../../context/ThemeContext'
import '../../i18n'

function renderReport() {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Report />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>,
  )
}

describe('Report', () => {
  it('renders Expense Report heading', async () => {
    renderReport()
    expect(screen.getByText('Expense Report')).toBeInTheDocument()
  })

  it('renders filter controls', () => {
    renderReport()
    expect(screen.getByText('Month')).toBeInTheDocument()
    expect(screen.getByText('Specific Date')).toBeInTheDocument()
    expect(screen.getByText('Date Range')).toBeInTheDocument()
  })

  it('renders Export button', () => {
    renderReport()
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
  })
})
