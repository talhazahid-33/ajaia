import { useSyncExternalStore } from 'react';

export const USER_STORAGE_KEY = 'ajaia.user';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedUser: AuthUser | null = null;

function subscribeHydrated() {
  return () => {};
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeUser(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (raw === cachedRaw) {
    return cachedUser;
  }

  cachedRaw = raw;
  if (!raw) {
    cachedUser = null;
    return null;
  }

  try {
    cachedUser = JSON.parse(raw) as AuthUser;
    return cachedUser;
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    cachedRaw = null;
    cachedUser = null;
    return null;
  }
}

export function getServerUser(): AuthUser | null {
  return null;
}

export function useCurrentUser() {
  const hydrated = useSyncExternalStore(subscribeHydrated, () => true, () => false);
  const user = useSyncExternalStore(subscribeUser, getUser, getServerUser);

  return {
    user: hydrated ? user : null,
    ready: hydrated,
  };
}

export function saveUser(user: AuthUser) {
  const raw = JSON.stringify(user);
  localStorage.setItem(USER_STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedUser = user;
  emit();
}

export function clearUser() {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(USER_STORAGE_KEY);
  cachedRaw = null;
  cachedUser = null;
  emit();
}
