import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Report } from './Report'
import { BrowserRouter } from 'react-router-dom'

function renderReport() {
  return render(
    <BrowserRouter>
      <Report />
    </BrowserRouter>,
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
