// FRONTEND/src/useStore.ts
import { useSyncExternalStore } from 'react';
import { store } from './store';

/**
 * Custom hook to access the global store.
 * 
 * Returns:
 *   - All state properties: currentUser, users, degreeApplications, ...
 *   - All store methods: login, register, setUser, logout, uploadDocument, ...
 * 
 * Usage:
 *   const { currentUser, setUser, login } = useStore();
 */
export function useStore() {
  const state = useSyncExternalStore(
    store.subscribe,
    () => store.getState(),
  );

  return {
    ...state,   // state properties (currentUser, users, ...)
    ...store,   // store methods (login, setUser, logout, ...)
  };
}