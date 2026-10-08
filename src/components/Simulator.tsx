import { useEffect, useState } from 'react';
import { track } from '../lib/analytics';
import { cloneBudget, savingsDelta, withEntryEnabled } from '../lib/budget';
import { planById, purchasablePlans, quotePlan, serviceById, todayIso } from '../lib/catalog';
import { formatMinor } from '../lib/money';
import type { BudgetState } from '../lib/types';
import { useBudget } from './useBudget';

export default function Simulator() {
  const { state, ready, update } = useBudget();
  const [scenario, setScenario] = useState<BudgetState | null>(null);

  useEffect(() => {
    if (ready) setScenario(cloneBudget(state));
  }, [ready, state]);

  if (!scenario) return <p>Cargando la simulación…</p>;
  const delta = savingsDelta(state, scenario);

  function apply() {
    if (!scenario) return;
    update(cloneBudget(scenario));
    track('savings_simulated');
  }

  return (
    <div className="stack">
      <p>Esta simulación no modifica tu lista hasta que elijas «Aplicar cambios». Tampoco da de baja nada en Netflix, Spotify ni en ningún otro servicio, y no promete un reembolso.</p>
      {scenario.entries.length === 0 && <p>No hay suscripciones para simular. <a href="/">Agregá alguna en el catálogo</a>.</p>}
      {scenario.entries.map((entry) => {
        const plan = entry.planId ? planById(entry.planId) : undefined;
        const service = entry.serviceId ? serviceById(entry.serviceId) : undefined;
        const title = entry.customName ?? service?.name ?? 'Suscripción';
        return (
          <article className="entry" key={entry.id}>
            <input type="checkbox" checked={entry.enabled} aria-label={`Incluir ${title} en la simulación`} onChange={(event) => setScenario(withEntryEnabled(scenario, entry.id, event.target.checked))} />
            <div>
              <strong>{title}</strong>
              {plan && (
                <label className="field">
                  <span>Probar otro plan verificado</span>
                  <select value={plan.id} onChange={(event) => {
                    const nextPlan = planById(event.target.value);
                    if (!nextPlan) return;
                    const quote = quotePlan(nextPlan, { asOf: todayIso() });
                    setScenario({
                      ...scenario,
                      entries: scenario.entries.map((item) => item.id === entry.id ? { ...item, planId: nextPlan.id, quote, billingIntervalMonths: nextPlan.billingPeriodMonths, billingIntervalDays: nextPlan.billingIntervalDays ?? null, usePromotion: false, userReportedFinalMinor: null } : item),
                    });
                  }}>
                    {purchasablePlans(plan.serviceId).filter((item) => (item.choiceSlots ?? 0) === 0 || item.id === plan.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
              )}
            </div>
          </article>
        );
      })}
      <section className="panel" style={{ padding: 16 }}>
        <p className="meta nums">Lista actual: {formatMinor(delta.baselineMinor, 'ARS')} / mes</p>
        <p className="meta nums">Escenario: {formatMinor(delta.scenarioMinor, 'ARS')} / mes</p>
        {delta.definitive ? (
          <p className={delta.differenceMinor > 0 ? 'save-positive nums' : 'price nums'}>Diferencia a precios actuales: {formatMinor(delta.differenceMinor, 'ARS')} por mes.</p>
        ) : (
          <p className="warning">No es un ahorro cerrado. Hay importes parciales o sin resolver ({delta.unresolved}). La diferencia de lo conocido es {formatMinor(delta.differenceMinor, 'ARS')} por mes y puede cambiar cuando completes esos datos.</p>
        )}
        <button type="button" className="btn primary" onClick={apply}>Aplicar cambios</button>
      </section>
    </div>
  );
}
