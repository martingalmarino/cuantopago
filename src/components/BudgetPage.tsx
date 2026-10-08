import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { cloneBudget, quoteChanged, summarizeBudget, withoutEntry } from '../lib/budget';
import { categoryLabels, planById, purchasablePlans, quotePlan, serviceById, taxRules, todayIso } from '../lib/catalog';
import { customEntry } from '../lib/entries';
import { calculate, monthlyMinorDisplay } from '../lib/calculation';
import { divHalfUp, formatMinor, parseLocalAmount } from '../lib/money';
import type { BudgetEntry } from '../lib/types';
import { useBudget } from './useBudget';

const categoryName = { ...categoryLabels, otro: 'Otro' };

export default function BudgetPage() {
  const { state, ready, error, storageAvailable, update } = useBudget();
  const [undo, setUndo] = useState<BudgetEntry | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [budgetRaw, setBudgetRaw] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const totals = summarizeBudget(state.entries);
  const maxCategory = Math.max(1, ...totals.byCategory.map((item) => divHalfUp(item.monthly.n, item.monthly.d)));

  function remove(entry: BudgetEntry) {
    setUndo(entry);
    update(withoutEntry(state, entry.id));
  }

  function setReported(entry: BudgetEntry, raw: string) {
    const parsed = parseLocalAmount(raw);
    if (!parsed.ok) {
      setFormError(parsed.message);
      return;
    }
    update({
      ...state,
      entries: state.entries.map((item) => item.id === entry.id ? {
        ...item,
        userReportedFinalMinor: parsed.minor,
        quote: { ...item.quote, status: 'user-reported', periodTotalMinor: parsed.minor, currency: 'ARS', simulated: false, missing: [], monthly: { n: parsed.minor, d: item.billingIntervalMonths || 1 } },
      } : item),
    });
    setFormError(null);
  }

  function refresh(entry: BudgetEntry) {
    if (!entry.planId) return;
    const plan = planById(entry.planId);
    if (!plan) return;
    const quote = quotePlan(plan, { asOf: todayIso() });
    update({
      ...state,
      entries: state.entries.map((item) => item.id === entry.id ? { ...item, quote, catalogRevision: quote.priceVerifiedAt ?? item.catalogRevision, archived: plan.retired } : item),
    });
  }

  function addCustom() {
    const parsed = parseLocalAmount(customAmount);
    if (!customName.trim() || !parsed.ok) {
      setFormError(!parsed.ok ? parsed.message : 'Poné un nombre.');
      return;
    }
    const quote = calculate({
      label: customName.trim(),
      amountMinor: null,
      currency: 'ARS',
      billingPeriodMonths: 1,
      taxInclusion: 'unknown',
      otherChargesNoted: false,
      ruleIds: [],
      priceVerifiedAt: null,
      priceSourceUrl: null,
      rules: taxRules,
      asOf: todayIso(),
      fxArsPerUsdMinor: null,
      fxSource: null,
      fxVerifiedAt: null,
      flags: {},
      userReportedFinalMinor: parsed.minor,
      userReportedMonths: 1,
    });
    update({
      ...state,
      entries: [...state.entries, customEntry({ name: customName.trim(), category: 'otro', quote, months: 1, userReportedFinalMinor: parsed.minor })],
    });
    setCustomName('');
    setCustomAmount('');
    setFormError(null);
  }

  function saveBudgetCap() {
    if (!budgetRaw.trim()) {
      update({ ...state, monthlyBudgetMinor: null });
      return;
    }
    const parsed = parseLocalAmount(budgetRaw);
    if (!parsed.ok) {
      setFormError(parsed.message);
      return;
    }
    update({ ...state, monthlyBudgetMinor: parsed.minor });
    setFormError(null);
  }

  const remaining = state.monthlyBudgetMinor === null ? null : state.monthlyBudgetMinor - totals.knownMonthlyDisplayMinor;

  return (
    <div className="stack">
      {!storageAvailable && <p className="error" role="alert">{error}</p>}
      {error && storageAvailable && <p className="warning">{error}</p>}
      <section className="panel" style={{ padding: 20 }}>
        <p className="kicker">{totals.status === 'partial' ? 'Total parcial por mes' : 'Total por mes'}</p>
        <p className="price nums" style={{ fontSize: 40 }}>{ready ? formatMinor(totals.knownMonthlyDisplayMinor, 'ARS') : '…'}</p>
        <p className="meta nums">Proyección de 12 meses a precios actuales: {ready ? formatMinor(totals.projectionDisplayMinor, 'ARS') : '…'}.</p>
        {totals.unresolvedCount > 0 && (
          <p className="warning">
            {totals.unresolvedCount === 1
              ? '1 entrada sigue sin un total cerrado. No la ocultamos.'
              : `${totals.unresolvedCount} entradas siguen sin un total cerrado. No las ocultamos.`}
          </p>
        )}
        <p className="meta">Se guarda en este navegador. No es el débito exacto del mes que viene.</p>
      </section>
      <section className="panel" style={{ padding: 20 }}>
        <h2>Tope mensual</h2>
        <label className="field">
          <span>Opcional, en pesos</span>
          <input value={budgetRaw} onChange={(event) => setBudgetRaw(event.target.value)} placeholder="80.000" />
        </label>
        <button type="button" className="btn" onClick={saveBudgetCap}>Guardar tope</button>
        {remaining !== null && (
          <p className={remaining < 0 ? 'error' : 'warning'}>
            {remaining < 0 ? `Te pasás ${formatMinor(Math.abs(remaining), 'ARS')} de lo conocido.` : `Quedan ${formatMinor(remaining, 'ARS')} dentro del tope, con los importes conocidos.`}
          </p>
        )}
      </section>
      <section className="panel" style={{ padding: 20 }}>
        <h2>Por rubro</h2>
        <div className="bars">
          {totals.byCategory.map((item) => {
            const value = divHalfUp(item.monthly.n, item.monthly.d);
            const width = Math.max(4, Math.round((value / maxCategory) * 100));
            return (
              <div className="bar-row" key={item.category}>
                <span>{categoryName[item.category]}</span>
                <span className="nums">{formatMinor(value, 'ARS')}</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${width}%` }} /></div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="panel" style={{ padding: 16 }}>
        <h2>Suscripciones</h2>
        {state.entries.length === 0 && <p>Todavía no agregaste ninguna. Volvé al catálogo o cargá una propia.</p>}
        {state.entries.map((entry) => {
          const plan = entry.planId ? planById(entry.planId) : undefined;
          const service = entry.serviceId ? serviceById(entry.serviceId) : undefined;
          const title = entry.customName ?? service?.name ?? 'Suscripción';
          const monthly = entry.userReportedFinalMinor !== null
            ? Math.round(entry.userReportedFinalMinor / (entry.billingIntervalMonths || 1))
            : monthlyMinorDisplay(entry.quote);
          const fresh = plan ? quotePlan(plan, { asOf: todayIso() }) : null;
          const canUpdate = fresh ? quoteChanged(entry, fresh, fresh.priceVerifiedAt ?? entry.catalogRevision) : false;
          const archived = entry.archived || (entry.planId !== null && !plan);
          return (
            <article className="entry" key={entry.id}>
              <input type="checkbox" checked={entry.enabled} aria-label={`Incluir ${title}`} onChange={(event) => update({ ...state, entries: state.entries.map((item) => item.id === entry.id ? { ...item, enabled: event.target.checked } : item) })} />
              <div>
                <strong>{title}</strong>
                {plan && <span className="meta"> · {plan.name}</span>}
                {archived && <span className="meta"> · Plan archivado</span>}
                <div className="meta nums">
                  {monthly !== null ? formatMinor(monthly, 'ARS') : 'Sin total'} / mes
                  {entry.userReportedFinalMinor !== null && ' · Lo que me cobraron'}
                  {entry.billingIntervalMonths !== 1 && ` · se cobra cada ${entry.billingIntervalMonths} meses`}
                </div>
                {entry.quote.status === 'partial' && entry.userReportedFinalMinor === null && <div className="meta">Total parcial: {entry.quote.missing[0]}</div>}
                {canUpdate && entry.userReportedFinalMinor === null && <button type="button" className="btn" onClick={() => refresh(entry)}>Actualizar cotización</button>}
                <form className="row-actions" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); setReported(entry, String(data.get('cobrado') ?? '')); }}>
                  <input name="cobrado" aria-label={`Lo que me cobraron en ${title}`} placeholder="Lo que me cobraron" />
                  <button type="submit" className="btn">Reemplazar</button>
                </form>
                {plan && (
                  <label className="field">
                    <span>Cambiar de plan</span>
                    <select value={plan.id} onChange={(event) => {
                      const nextPlan = planById(event.target.value);
                      if (!nextPlan) return;
                      const quote = quotePlan(nextPlan, { asOf: todayIso() });
                      update({ ...state, entries: state.entries.map((item) => item.id === entry.id ? { ...item, planId: nextPlan.id, quote, billingIntervalMonths: nextPlan.billingPeriodMonths, billingIntervalDays: nextPlan.billingIntervalDays ?? null, usePromotion: false, choiceIds: item.planId === nextPlan.id ? item.choiceIds : [], userReportedFinalMinor: null } : item) });
                    }}>
                      {purchasablePlans(plan.serviceId).filter((item) => (item.choiceSlots ?? 0) === 0 || item.id === plan.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </label>
                )}
              </div>
              <button type="button" className="btn ghost" aria-label={`Quitar ${title}`} onClick={() => remove(entry)}><Trash2 size={18} aria-hidden="true" /> Quitar</button>
            </article>
          );
        })}
        {undo && <p className="warning">Quitaste {undo.customName ?? serviceById(undo.serviceId ?? '')?.name ?? 'una suscripción'}. <button type="button" className="btn" onClick={() => { update({ ...state, entries: [...state.entries, undo] }); setUndo(null); }}>Deshacer</button></p>}
        {state.entries.length > 0 && (
          confirmClear
            ? <div className="error">¿Vaciar toda la lista? <button type="button" className="btn" onClick={() => { update({ ...cloneBudget(state), entries: [] }); setConfirmClear(false); }}>Sí, vaciar</button> <button type="button" className="btn ghost" onClick={() => setConfirmClear(false)}>Cancelar</button></div>
            : <button type="button" className="btn" onClick={() => setConfirmClear(true)}>Vaciar la lista</button>
        )}
      </section>
      <section className="panel stack" style={{ padding: 16 }}>
        <h2>Suscripción fuera del catálogo</h2>
        <label className="field"><span>Nombre</span><input value={customName} onChange={(event) => setCustomName(event.target.value)} /></label>
        <label className="field"><span>Lo que te cobran por mes, en pesos</span><input value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} placeholder="3.500" /></label>
        <button type="button" className="btn primary" onClick={addCustom}>Agregar</button>
        {formError && <p className="error" role="alert">{formError}</p>}
      </section>
      <p><a className="btn" href="/simular-ahorro/">Simular un cambio</a></p>
    </div>
  );
}
