import { describe, it, expect, vi } from 'vitest'
import { monthToRange } from './Transactions'

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
