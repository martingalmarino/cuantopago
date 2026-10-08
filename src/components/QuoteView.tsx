import { monthlyMinorDisplay } from '../lib/calculation';
import { monthlyHeading, resultHeading } from '../lib/labels';
import { formatPrice } from '../lib/money';
import type { CalculationResult } from '../lib/types';

export default function QuoteView({ result }: { result: CalculationResult }) {
  const monthly = monthlyMinorDisplay(result);
  const period = result.periodTotalMinor;
  const currency = result.currency === 'USD' ? 'USD' : 'ARS';
  return (
    <div aria-live="polite">
      <p className="kicker">{result.periodMonths === 1 ? resultHeading(result) : monthlyHeading(result)}</p>
      <p className="result-amount nums">
        {monthly !== null && result.currency !== 'USD' ? formatPrice(monthly, 'ARS') : period !== null && result.currency ? formatPrice(period, currency) : 'No hay datos suficientes'}
      </p>
      <p className="meta">{result.periodDays ? `Cada ${result.periodDays} días` : result.periodMonths === 12 ? 'Por año, prorrateado al mes' : result.periodMonths === 1 ? 'Por mes' : `Cada ${result.periodMonths} meses`}</p>
      {result.status === 'partial' && <p className="meta">Total parcial. La estimación no cierra todos los cargos.</p>}
      {result.status === 'unavailable' && <p className="meta">No hay datos suficientes para un total.</p>}
      {result.periodMonths !== 1 && period !== null && result.currency === 'ARS' && (
        <p className="meta nums">
          En el período se contabilizan {formatPrice(period, 'ARS')}. El equivalente mensual no es el débito del mes que viene.
        </p>
      )}
      {result.warnings.map((warning) => <p key={warning} className="warning">{warning}</p>)}
      {result.missing.length > 0 && (
        <div className="warning">
          <strong>Falta resolver: </strong>
          {result.missing.join(' ')}
        </div>
      )}
      <details className="breakdown">
        <summary>Ver desglose y supuestos</summary>
        <div>
          {result.lines.map((line) => (
            <div className="line-row" key={line.id}>
              <span>{line.label}{line.note ? `. ${line.note}` : ''}</span>
              <span className="nums">{line.amountMinor !== null && line.currency ? formatPrice(line.amountMinor, line.currency) : 'Sin monto'}</span>
            </div>
          ))}
        </div>
        {result.assumptions.length > 0 && <p className="meta">{result.assumptions[0]}</p>}
        {result.fxLabel && <p className="meta">{result.fxLabel}. No es una cotización bancaria.</p>}
      </details>
    </div>
  );
}
