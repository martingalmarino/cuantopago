import { useEffect, useState } from 'react';
import { emptyBudget } from '../lib/budget';
import { loadBudget, saveBudget, subscribeBudget } from '../lib/storage';
import type { BudgetState } from '../lib/types';

export function useBudget() {
  const [state, setState] = useState<BudgetState>(emptyBudget());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    const loaded = loadBudget();
    setState(loaded.state);
    setError(loaded.error);
    setStorageAvailable(loaded.storageAvailable);
    setReady(true);
    return subscribeBudget(() => setState(loadBudget().state));
  }, []);

  function update(next: BudgetState) {
    setState(next);
    const saved = saveBudget(next);
    if (!saved.ok) setError(saved.error);
  }

  return { state, ready, error, storageAvailable, update };
}
