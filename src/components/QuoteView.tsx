import { monthlyMinorDisplay } from '../lib/calculation';
import { monthlyHeading, resultHeading } from '../lib/labels';
import { formatMinor } from '../lib/money';
import type { CalculationResult } from '../lib/types';

export default function QuoteView({ result }: { result: CalculationResult }) {
  const monthly = monthlyMinorDisplay(result);
  const period = result.periodTotalMinor;
  const currency = result.currency === 'USD' ? 'USD' : 'ARS';
  return (
    <div aria-live="polite">
      <p className="kicker">{result.periodMonths === 1 ? resultHeading(result) : monthlyHeading(result)}</p>
      <p className="price nums">
        {monthly !== null && result.currency !== 'USD' ? formatMinor(monthly, 'ARS') : period !== null && result.currency ? formatMinor(period, currency) : 'Precio pendiente de verificación'}
      </p>
      {result.periodMonths !== 1 && period !== null && result.currency === 'ARS' && (
        <p className="meta nums">
          En el período se contabilizan {formatMinor(period, 'ARS')} cada {result.periodMonths} meses. El equivalente mensual no es el débito del mes que viene.
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
        <summary>Ver cómo se calcula</summary>
        <ul>
          {result.lines.map((line) => (
            <li key={line.id}>
              {line.label}
              {line.amountMinor !== null && line.currency ? `: ${formatMinor(line.amountMinor, line.currency)}` : ': sin monto'}
              {line.note ? `. ${line.note}` : ''}
            </li>
          ))}
        </ul>
        {result.assumptions.length > 0 && <p className="meta">{result.assumptions[0]}</p>}
        {result.fxLabel && <p className="meta">{result.fxLabel}. No es una cotización bancaria.</p>}
      </details>
    </div>
  );
}
