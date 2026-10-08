import { emptyBudget } from './budget';
import type { BudgetState } from './types';

export const BUDGET_STORAGE_KEY = 'cuanto-pago:budget';
const EVENT = 'cuanto-pago:budget';

export interface LoadResult {
  state: BudgetState;
  error: string | null;
  storageAvailable: boolean;
}

function browserStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probe = '__cuanto_pago_probe';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

function isBudgetState(value: unknown): value is BudgetState {
  if (!value || typeof value !== 'object') return false;
  const record = value as BudgetState;
  return record.version === 1 && Array.isArray(record.entries);
}

export function loadBudget(): LoadResult {
  const storage = browserStorage();
  if (!storage) {
    return {
      state: emptyBudget(),
      error: 'Este navegador no deja guardar datos. La lista vive solo en esta visita.',
      storageAvailable: false,
    };
  }
  const raw = storage.getItem(BUDGET_STORAGE_KEY);
  if (!raw) return { state: emptyBudget(), error: null, storageAvailable: true };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isBudgetState(parsed)) {
      return {
        state: emptyBudget(),
        error: 'No pudimos leer lo guardado en este navegador. La lista volvió a empezar.',
        storageAvailable: true,
      };
    }
    return { state: parsed, error: null, storageAvailable: true };
  } catch {
    return {
      state: emptyBudget(),
      error: 'No pudimos leer lo guardado en este navegador. La lista volvió a empezar.',
      storageAvailable: true,
    };
  }
}

export function saveBudget(state: BudgetState): { ok: boolean; error: string | null } {
  const storage = browserStorage();
  if (!storage) {
    return { ok: false, error: 'Este navegador no deja guardar datos.' };
  }
  try {
    storage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(state));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: 'No se pudo guardar la lista en este navegador.' };
  }
}

export function subscribeBudget(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}
