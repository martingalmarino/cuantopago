import { useMemo, useState } from 'react';
import { track } from '../lib/analytics';
import { calculate } from '../lib/calculation';
import { inputFromPlan, purchasablePlans, serviceById, taxRules, todayIso } from '../lib/catalog';
import { catalogEntry, customEntry } from '../lib/entries';
import { parseLocalAmount } from '../lib/money';
import { loadBudget, saveBudget } from '../lib/storage';
import type { CalculationInput, TaxInclusion } from '../lib/types';
import QuoteView from './QuoteView';

interface Props {
  serviceId?: string;
  initialPlanId?: string;
}

export default function Calculator({ serviceId, initialPlanId }: Props) {
  const servicePlans = (serviceId ? purchasablePlans(serviceId) : []).filter((plan) => (plan.choiceSlots ?? 0) === 0);
  const startingPlan = servicePlans.some((plan) => plan.id === initialPlanId) ? initialPlanId : servicePlans[0]?.id ?? '';
  const [planId, setPlanId] = useState(startingPlan ?? '');
  const [mode, setMode] = useState<'catalog' | 'final' | 'estimate'>(servicePlans.length > 0 ? 'catalog' : serviceId ? 'final' : 'estimate');
  const [finalRaw, setFinalRaw] = useState('');
  const [baseRaw, setBaseRaw] = useState('');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [months, setMonths] = useState('1');
  const [fxRaw, setFxRaw] = useState('');
  const [taxInclusion, setTaxInclusion] = useState<TaxInclusion>('unknown');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const asOf = todayIso();
  const plan = servicePlans.find((item) => item.id === planId);
  const period = Number(months);
  const safeMonths = Number.isInteger(period) && period > 0 ? period : 1;

  const shown = useMemo(() => {
    if (mode === 'catalog') {
      if (!plan) return null;
      return calculate(inputFromPlan(plan, { asOf }));
    }
    if (mode === 'final') {
      const parsed = parseLocalAmount(finalRaw);
      if (!parsed.ok) return null;
      const manual: CalculationInput = {
        label: 'Importe informado',
        amountMinor: null,
        currency: 'ARS',
        billingPeriodMonths: safeMonths,
        taxInclusion: 'unknown',
        otherChargesNoted: false,
        ruleIds: [],
        priceVerifiedAt: null,
        priceSourceUrl: null,
        rules: [],
        asOf,
        fxArsPerUsdMinor: null,
        fxSource: null,
        fxVerifiedAt: null,
        flags: {},
        userReportedFinalMinor: parsed.minor,
        userReportedMonths: safeMonths,
      };
      return calculate(manual);
    }
    const parsed = parseLocalAmount(baseRaw);
    if (!parsed.ok) return null;
    const fx = currency === 'USD' ? parseLocalAmount(fxRaw) : null;
    const manual: CalculationInput = {
      label: 'Estimación manual',
      amountMinor: parsed.minor,
      currency,
      billingPeriodMonths: safeMonths,
      taxInclusion,
      otherChargesNoted: taxInclusion !== 'included',
      ruleIds: taxInclusion === 'excluded' ? ['ar-iva-digital-21', 'ar-percepcion-rg5617'] : ['ar-percepcion-rg5617'],
      priceVerifiedAt: asOf,
      priceSourceUrl: null,
      rules: taxRules,
      asOf,
      fxArsPerUsdMinor: fx && fx.ok ? fx.minor : null,
      fxSource: fx && fx.ok ? 'user' : null,
      fxVerifiedAt: asOf,
      flags: {},
      userReportedFinalMinor: null,
      userReportedMonths: null,
      manual: true,
    };
    return calculate(manual);
  }, [asOf, baseRaw, currency, finalRaw, fxRaw, mode, plan, safeMonths, taxInclusion]);

  function add() {
    if (!shown) {
      setError('Completá un importe válido antes de agregarlo.');
      return;
    }
    const loaded = loadBudget();
    if (!loaded.storageAvailable) {
      setError(loaded.error);
      return;
    }
    const service = serviceId ? serviceById(serviceId) : undefined;
    if (mode === 'catalog' && plan) {
      const duplicate = loaded.state.entries.find((entry) => entry.planId === plan.id && entry.enabled);
      const replace = duplicate
        ? window.confirm('Ya tenés este plan. Aceptar reemplaza la cotización guardada. Cancelar agrega otra suscripción aparte.')
        : false;
      const nextEntry = catalogEntry(plan, shown);
      const entries = duplicate && replace
        ? loaded.state.entries.map((entry) => (entry.id === duplicate.id ? { ...nextEntry, id: entry.id, addedAt: entry.addedAt } : entry))
        : [...loaded.state.entries, nextEntry];
      saveBudget({ ...loaded.state, entries });
    } else {
      const created = customEntry({
        name: service?.name ?? 'Suscripción propia',
        category: service?.category ?? 'otro',
        quote: shown,
        months: shown.periodMonths,
        userReportedFinalMinor: mode === 'final' ? shown.periodTotalMinor : null,
      });
      saveBudget({ ...loaded.state, entries: [...loaded.state.entries, created] });
    }
    track('subscription_added', serviceId);
    track('calculation_completed', serviceId);
    setMessage('Listo. Se guarda en este navegador.');
    setError(null);
  }

  return (
    <section className="panel stack" style={{ padding: 16 }}>
      <h2>Calculadora</h2>
      {servicePlans.length > 0 && (
        <label className="field">
          <span>Plan</span>
          <select value={planId} onChange={(event) => { setPlanId(event.target.value); setMode('catalog'); }}>
            {servicePlans.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      )}
      <div className="row-actions">
        {servicePlans.length > 0 && <button type="button" className="chip" aria-pressed={mode === 'catalog'} onClick={() => setMode('catalog')}>Precio publicado</button>}
        <button type="button" className="chip" aria-pressed={mode === 'final'} onClick={() => setMode('final')}>Ya sé cuánto me cobran</button>
        <button type="button" className="chip" aria-pressed={mode === 'estimate'} onClick={() => setMode('estimate')}>Quiero estimar un precio</button>
      </div>
      {mode === 'final' && (
        <label className="field">
          <span>Importe final en pesos. No le sumamos impuestos de nuevo.</span>
          <input inputMode="decimal" value={finalRaw} onChange={(event) => setFinalRaw(event.target.value)} placeholder="1.234,56" />
        </label>
      )}
      {mode === 'estimate' && (
        <>
          <label className="field">
            <span>Precio base, con formato 1.234,56</span>
            <input inputMode="decimal" value={baseRaw} onChange={(event) => setBaseRaw(event.target.value)} placeholder="4.499" />
          </label>
          <label className="field">
            <span>Moneda del precio</span>
            <select value={currency} onChange={(event) => setCurrency(event.target.value as 'ARS' | 'USD')}>
              <option value="ARS">Pesos</option>
              <option value="USD">Dólares</option>
            </select>
          </label>
          {currency === 'USD' && (
            <label className="field">
              <span>Tipo de cambio ingresado por vos: pesos por cada dólar</span>
              <input inputMode="decimal" value={fxRaw} onChange={(event) => setFxRaw(event.target.value)} placeholder="1.000" />
            </label>
          )}
          <label className="field">
            <span>¿El precio ya incluye IVA? Si no lo sabés, el total queda parcial.</span>
            <select value={taxInclusion} onChange={(event) => setTaxInclusion(event.target.value as TaxInclusion)}>
              <option value="unknown">No sé</option>
              <option value="excluded">No, hay que estimarlo</option>
              <option value="included">Sí, ya está incluido</option>
            </select>
          </label>
        </>
      )}
      {mode !== 'catalog' && (
        <label className="field">
          <span>Cada cuántos meses se cobra</span>
          <input inputMode="numeric" value={months} onChange={(event) => setMonths(event.target.value)} />
        </label>
      )}
      {shown ? <QuoteView result={shown} /> : <p className="meta">Cuando ingreses un importe válido, el resultado aparece acá.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {message && <p className="warning">{message}</p>}
      <button type="button" className="btn primary" onClick={add}>Agregar a mis suscripciones</button>
    </section>
  );
}
