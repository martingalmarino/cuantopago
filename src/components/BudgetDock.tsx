import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { track } from '../lib/analytics';
import { choicesAreValid, overlapWarnings, summarizeBudget } from '../lib/budget';
import { catalogMeta, purchasablePlans, quotePlan, serviceById, todayIso } from '../lib/catalog';
import { catalogEntry } from '../lib/entries';
import { formatMinor } from '../lib/money';
import { useBudget } from './useBudget';

export default function BudgetDock() {
  const { state, ready, update } = useBudget();
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [planId, setPlanId] = useState('');
  const [choiceIds, setChoiceIds] = useState<string[]>([]);
  const [usePromotion, setUsePromotion] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const totals = summarizeBudget(state.entries);
  const service = serviceId ? serviceById(serviceId) : undefined;
  const options = serviceId ? purchasablePlans(serviceId) : [];
  const selected = options.find((item) => item.id === planId);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest('[data-add-service]');
      if (!(button instanceof HTMLButtonElement)) return;
      const id = button.dataset.addService;
      if (!id) return;
      const list = purchasablePlans(id);
      setServiceId(id);
      setPlanId(list[0]?.id ?? '');
      setChoiceIds([]);
      setUsePromotion(false);
      setNotice(null);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  function add() {
    const plan = options.find((item) => item.id === planId);
    if (!plan || plan.amountMinor === null) {
      setNotice('Ese plan no tiene un precio verificado. Podés cargar el importe en la calculadora.');
      return;
    }
    const picked = (plan.choiceSlots ?? 0) > 0 ? choiceIds : [];
    if (!choicesAreValid(plan, picked)) {
      setNotice(`Elegí exactamente ${plan.choiceSlots} opciones. Una más no entra como incluida.`);
      return;
    }
    const overlaps = overlapWarnings(state.entries, plan, picked);
    if (overlaps.length > 0 && !window.confirm(`${overlaps.join('\n\n')}\n\nAceptar agrega el paquete y deja el otro cargo. Cancelar no agrega nada.`)) {
      return;
    }
    const quote = quotePlan(plan, { asOf: todayIso(), usePromotion: usePromotion && Boolean(plan.promotion) });
    const duplicate = state.entries.find((entry) => entry.planId === plan.id && entry.enabled);
    const replace = duplicate
      ? window.confirm('Ya tenés este plan. Aceptar reemplaza la cotización. Cancelar agrega otra suscripción.')
      : false;
    const nextEntry = catalogEntry(plan, quote, { usePromotion: usePromotion && Boolean(plan.promotion), choiceIds: picked });
    const entries = duplicate && replace
      ? state.entries.map((entry) => (entry.id === duplicate.id ? { ...nextEntry, id: entry.id, addedAt: entry.addedAt } : entry))
      : [...state.entries, nextEntry];
    update({ ...state, entries });
    track('subscription_added', plan.serviceId);
    setNotice('Se guarda en este navegador.');
    setServiceId(null);
  }

  const amount = ready ? formatMinor(totals.knownMonthlyDisplayMinor, 'ARS') : '…';
  const label = totals.status === 'partial' ? 'Total parcial' : totals.enabledCount === 0 ? 'Sin servicios' : 'Por mes';

  return (
    <div className="dock">
      <div className="summary-card">
        <p className="kicker">{label}</p>
        <p className="total nums">{amount}</p>
        <p className="meta">{totals.enabledCount} {totals.enabledCount === 1 ? 'servicio activo' : 'servicios activos'}</p>
        {totals.unresolvedCount > 0 && (
          <p className="warning">
            {totals.unresolvedCount === 1
              ? '1 servicio todavía tiene cargos sin resolver.'
              : `${totals.unresolvedCount} servicios todavía tienen cargos sin resolver.`}
          </p>
        )}
        <p className="meta nums">Proyección de 12 meses a precios actuales: {ready ? formatMinor(totals.projectionDisplayMinor, 'ARS') : '…'}</p>
        <a className="btn primary" href="/mis-suscripciones/">Ver resumen</a>
        <p className="meta">Datos del catálogo revisados el {catalogMeta.revision}. Se guarda en este navegador.</p>
        {notice && <p className="warning">{notice}</p>}
      </div>
      <div className="budget-bar">
        <div>
          <strong className="nums">{totals.enabledCount} {totals.enabledCount === 1 ? 'servicio' : 'servicios'} · {amount}/mes</strong>
          {totals.status === 'partial' && <div className="meta">Total parcial</div>}
        </div>
        <a className="btn primary" href="/mis-suscripciones/">Ver resumen</a>
      </div>
      {service && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-title">
          <div className="panel stack">
          <h2 id="add-title">Agregar {service.name}</h2>
          {options.length === 0 && (
            <>
              <p>No hay planes con precio verificado. <a href={`/calculadora/?servicio=${service.slug}`}>Cargar un importe a mano</a>.</p>
              <button type="button" className="btn ghost" onClick={() => setServiceId(null)}>Cerrar</button>
            </>
          )}
          {options.length > 0 && (
            <div className="stack">
              {options.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  className="btn"
                  aria-pressed={planId === plan.id}
                  onClick={() => { setPlanId(plan.id); setChoiceIds([]); setUsePromotion(false); }}
                  style={planId === plan.id ? { background: 'var(--selected)', borderColor: 'var(--action)' } : undefined}
                >
                  {planId === plan.id && <Check size={16} aria-hidden="true" />}
                  {plan.name}
                  {plan.amountMinor !== null && plan.currency ? ` · ${formatMinor(plan.amountMinor, plan.currency)}` : ''}
                </button>
              ))}
              {selected?.promotion && selected.currency && (
                <label className="field">
                  <span>Promo {formatMinor(selected.promotion.amountMinor, selected.promotion.currency)} por {selected.promotion.durationCycles} ciclos. No se activa sola.</span>
                  <input type="checkbox" checked={usePromotion} onChange={(event) => setUsePromotion(event.target.checked)} />
                </label>
              )}
              {(selected?.choiceSlots ?? 0) > 0 && (
                <fieldset className="stack">
                  <legend>Elegí exactamente {selected?.choiceSlots}</legend>
                  {(selected?.choiceOptions ?? []).map((option) => {
                    const checked = choiceIds.includes(option.id);
                    const full = choiceIds.length >= (selected?.choiceSlots ?? 0);
                    return (
                      <label key={option.id} className="field">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!checked && full}
                          onChange={() => {
                            setChoiceIds((current) => (
                              current.includes(option.id) ? current.filter((id) => id !== option.id) : [...current, option.id]
                            ));
                          }}
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </fieldset>
              )}
              <div className="row-actions">
                <button type="button" className="btn primary" onClick={add}>Agregar</button>
                <button type="button" className="btn ghost" onClick={() => setServiceId(null)}>Cerrar</button>
              </div>
            </div>
          )}
</div>
        </div>
      )}
    </div>
  );
}
