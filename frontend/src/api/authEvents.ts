// src/api/authEvents.ts
type AuthEvent = 'unauthorized'

const listeners = new Set<(event: AuthEvent) => void>()

export function onAuthEvent(cb: (event: AuthEvent) => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function emitAuthEvent(event: AuthEvent) {
  for (const cb of listeners) cb(event)
}