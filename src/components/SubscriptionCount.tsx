import { useEffect, useState } from 'react';
import { loadBudget, subscribeBudget } from '../lib/storage';

export default function SubscriptionCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const read = () => setCount(loadBudget().state.entries.filter((entry) => entry.enabled).length);
    read();
    return subscribeBudget(read);
  }, []);
  return <span className="count-badge nums">{count === null ? '…' : count}</span>;
}
