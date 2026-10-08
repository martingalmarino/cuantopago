import { useEffect, useState } from 'react';
import { formatChange, formatQuote, formatUpdated, loadQuotes, quoteShortName, type DollarQuote } from '../lib/quotes';

interface Props {
  mode: 'bar' | 'board';
}

function tone(percent: number | undefined): string {
  if (percent === undefined || percent === 0) return 'flat';
  return percent > 0 ? 'up' : 'down';
}

export default function DollarQuotes({ mode }: Props) {
  const [quotes, setQuotes] = useState<DollarQuote[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const read = () => {
      loadQuotes()
        .then((next) => {
          if (!active) return;
          setQuotes(next);
          setFailed(false);
        })
        .catch(() => {
          if (active) setFailed(true);
        });
    };
    read();
    const timer = window.setInterval(read, 5 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  if (failed && !quotes) {
    return <p className={mode === 'bar' ? 'quote-status' : 'warning'}>No pudimos leer las cotizaciones.</p>;
  }
  if (!quotes) {
    return <p className="quote-status">{mode === 'bar' ? 'Cargando cotizaciones…' : 'Cargando las cotizaciones…'}</p>;
  }

  if (mode === 'bar') {
    return (
      <div className="quote-bar" aria-label="Cotizaciones del dólar">
        <div className="quote-bar-inner">
          {quotes.map((quote) => (
            <span className="quote-chip" key={quote.origin}>
              <span>{quoteShortName[quote.origin] ?? quote.name}</span>
              <strong className="nums">{formatQuote(quote.sell)}</strong>
              {quote.change && <span className={tone(quote.change.percent)}>{formatChange(quote.change.percent)}</span>}
            </span>
          ))}
          <a href="/cotizaciones/">Ver cotizaciones</a>
        </div>
      </div>
    );
  }

  return (
    <div className="quote-grid">
      {quotes.map((quote) => (
        <article className="quote-card" key={quote.origin}>
          <h2>{quote.name}</h2>
          <p className="quote-sell nums">{formatQuote(quote.sell)}</p>
          <p className="meta nums">Compra {formatQuote(quote.buy)}</p>
          {quote.change && <p className={tone(quote.change.percent)}>{formatChange(quote.change.percent)}</p>}
          {quote.updatedAt && <p className="meta">Actualizado {formatUpdated(quote.updatedAt)}</p>}
        </article>
      ))}
    </div>
  );
}
