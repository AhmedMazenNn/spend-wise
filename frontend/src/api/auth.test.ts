import { describe, it, expect, beforeEach } from 'vitest'
import { getStoredUser, clearAuth } from './auth'

describe('auth', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('getStoredUser returns null when no user', () => {
    expect(getStoredUser()).toBeNull()
  })

  it('getStoredUser returns parsed user when stored', () => {
    const user = { id: '1', name: 'Test', email: 'test@test.com' }
    localStorage.setItem('user', JSON.stringify(user))
    expect(getStoredUser()).toEqual(user)
  })

  it('clearAuth removes user from storage', () => {
    localStorage.setItem('user', '{}')
    localStorage.setItem('token', 'abc')
    clearAuth()
    expect(localStorage.getItem('user')).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })
})
