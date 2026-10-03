import { useSyncExternalStore } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'precept-theme';
const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

let preference: ThemePreference = typeof window === 'undefined' ? 'system' : readPreference();

function resolve(pref: ThemePreference): 'light' | 'dark' {
  if (pref !== 'system') return pref;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function apply() {
  document.documentElement.setAttribute('data-theme', resolve(preference));
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (preference === 'system') apply();
  });
}

export function setThemePreference(pref: ThemePreference) {
  preference = pref;
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    // Private mode: the choice still applies for this session.
  }
  apply();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Theme preference shared across components; index.html applies it before first paint. */
export function useTheme() {
  const pref = useSyncExternalStore(subscribe, () => preference, () => 'system' as ThemePreference);
  const resolved = useSyncExternalStore(
    subscribe,
    () => (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'),
    () => 'dark' as const
  );
  return { preference: pref, resolved, setPreference: setThemePreference };
}
