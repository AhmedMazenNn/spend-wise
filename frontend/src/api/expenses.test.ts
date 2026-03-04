import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchExpenses } from './expenses'

vi.mock('./client', () => ({
  apiRequest: vi.fn(),
}))

describe('expenses API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchExpenses builds correct URL with custom period', async () => {
    const { apiRequest } = await import('./client')
    vi.mocked(apiRequest).mockResolvedValue({ expenses: [], total: 0 })

    await fetchExpenses({
      period: 'custom',
      startDate: '2025-03-01',
      endDate: '2025-03-31',
      limit: 100,
    })

    expect(apiRequest).toHaveBeenCalledWith(
      '/api/expenses?period=custom&startDate=2025-03-01&endDate=2025-03-31&limit=100',
      { method: 'GET' },
    )
  })
})
