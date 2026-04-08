import { useSyncExternalStore } from 'react'

/**
 * A tiny state manager similar to Zustand to avoid adding new dependencies
 */
export function createStore<T>(
  createState: (set: (fn: (state: T) => Partial<T>) => void, get: () => T) => T,
) {
  let state: T
  const listeners = new Set<() => void>()

  const set = (fn: (state: T) => Partial<T>) => {
    const next = fn(state)
    state = { ...state, ...next }
    listeners.forEach((l) => l())
  }

  const get = () => state

  state = createState(set, get)

  return function useStore(): [T, typeof set, typeof get] {
    const currentState = useSyncExternalStore(
      (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      () => state,
    )
    return [currentState, set, get]
  }
}
