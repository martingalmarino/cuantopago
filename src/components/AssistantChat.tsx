import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { MessageCircle, RotateCcw, Send, X } from 'lucide-react';
import { track } from '../lib/analytics';
import { CHAT_STORAGE_KEY, KNOWLEDGE_PATH, type Answer, type ChatContext } from '../lib/assistant/types';
import type { Assistant } from '../lib/assistant/engine';

const MAX_LENGTH = 300;
const MAX_STORED = 30;
const EXAMPLES = ['¿Cuánto sale Netflix?', 'Compará Spotify y YouTube Music', '¿Cómo cancelo Disney+?', 'USD 20 sin IVA a 1.450'];

type Message =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'bot'; answer: Answer };

interface Stored {
  messages: Message[];
  context: ChatContext;
}

const EMPTY: Stored = { messages: [], context: { serviceIds: [], intent: null } };

let loading: Promise<Assistant> | null = null;

/** El motor y el índice se descargan recién cuando alguien usa el chat. */
function loadAssistant(): Promise<Assistant> {
  loading ??= Promise.all([
    import('../lib/assistant/engine'),
    fetch(KNOWLEDGE_PATH).then((response) => {
      if (!response.ok) throw new Error('knowledge');
      return response.json();
    }),
  ]).then(([engine, kb]) => engine.createAssistant(kb, {
    loadQuotes: () => import('../lib/quotes').then((quotes) => quotes.loadQuotes()),
  }));
  loading.catch(() => {
    loading = null;
  });
  return loading;
}

function readStored(): Stored {
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Stored;
    if (!Array.isArray(parsed.messages) || !parsed.context) return EMPTY;
    return parsed;
  } catch {
    return EMPTY;
  }
}

function writeStored(value: Stored): void {
  try {
    sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ ...value, messages: value.messages.slice(-MAX_STORED) }));
  } catch {
    // Sin almacenamiento la conversación dura mientras la página está abierta.
  }
}

function isExternal(href: string): boolean {
  return /^https:\/\//.test(href);
}

function reviewed(iso: string | null): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [year, month, day] = iso.split('-');
  return ` · revisado el ${Number(day)}/${Number(month)}/${year}`;
}

function BotMessage({ answer }: { answer: Answer }) {
  const [first, ...rest] = answer.paragraphs;
  return (
    <div className="chat-bubble">
      {first && <p>{first}</p>}
      {answer.table && (
        <div className="chat-table-wrap">
          <table className="chat-table">
            <caption className="visually-hidden">{answer.table.caption}</caption>
            <thead>
              <tr>{answer.table.head.map((cell, index) => <th key={index} scope="col">{cell}</th>)}</tr>
            </thead>
            <tbody>
              {answer.table.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, index) => (index === 0 ? <th key={index} scope="row">{cell}</th> : <td key={index}>{cell}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rest.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      {answer.links.length > 0 && (
        <ul className="chat-links">
          {answer.links.map((link) => (
            <li key={link.href}>
              {isExternal(link.href)
                ? <a href={link.href} target="_blank" rel="noopener noreferrer">{link.label} ↗</a>
                : <a href={link.href}>{link.label}</a>}
            </li>
          ))}
        </ul>
      )}
      {answer.sources.length > 0 && (
        <p className="chat-sources">
          Fuentes:{' '}
          {answer.sources.map((source, index) => (
            <span key={source.href}>
              {index > 0 && '; '}
              <a href={source.href} target="_blank" rel="noopener noreferrer">{source.label}</a>
              {reviewed(source.reviewedAt)}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

interface Props {
  mode?: 'panel' | 'page';
}

export default function AssistantChat({ mode = 'panel' }: Props) {
  const isPage = mode === 'page';
  const [open, setOpen] = useState(isPage);
  const [stored, setStored] = useState<Stored>(EMPTY);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const nextId = useRef(1);
  const contextRef = useRef<ChatContext>(EMPTY.context);
  const returnFocus = useRef(false);

  useEffect(() => {
    const saved = readStored();
    nextId.current = saved.messages.reduce((max, message) => Math.max(max, message.id), 0) + 1;
    contextRef.current = saved.context;
    setStored(saved);
  }, []);

  useEffect(() => {
    if (!open && returnFocus.current) {
      returnFocus.current = false;
      fabRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (open) loadAssistant().catch(() => setError('No pude cargar los datos del chat. Revisá tu conexión y probá de nuevo.'));
  }, [open]);

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    const lastBot = stored.messages.at(-1)?.role === 'bot' && !busy ? log.querySelector<HTMLElement>('.chat-msg:last-of-type') : null;
    // Una respuesta larga se lee desde el principio, no desde el final.
    log.scrollTop = lastBot ? Math.max(0, lastBot.offsetTop - 8) : log.scrollHeight;
  }, [stored.messages.length, busy, open]);

  useEffect(() => {
    if (open && !isPage) inputRef.current?.focus();
  }, [open, isPage]);

  const close = useCallback(() => {
    returnFocus.current = true;
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open || isPage) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, isPage, close]);

  const ask = useCallback(async (raw: string) => {
    const text = raw.trim().slice(0, MAX_LENGTH);
    if (!text || busy) return;
    setInput('');
    setError(null);
    setBusy(true);
    const userMessage: Message = { id: nextId.current++, role: 'user', text };
    setStored((current) => ({ ...current, messages: [...current.messages, userMessage] }));
    try {
      const assistant = await loadAssistant();
      const reply = await assistant.respond(text, contextRef.current);
      contextRef.current = reply.context;
      const botMessage: Message = { id: nextId.current++, role: 'bot', answer: reply.answer };
      setStored((current) => {
        const next = { messages: [...current.messages, botMessage], context: reply.context };
        writeStored(next);
        return next;
      });
      track('assistant_question', reply.answer.serviceIds[0], { assistantIntent: reply.answer.intent, answered: reply.answer.answered });
    } catch {
      setError('No pude responder ahora. Revisá tu conexión y probá de nuevo.');
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }, [busy]);

  useEffect(() => {
    if (!isPage) return;
    const url = new URL(window.location.href);
    const question = url.searchParams.get('q');
    if (!question) return;
    url.searchParams.delete('q');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    // Se borra de la URL para que recargar la página no repita la pregunta.
    void ask(question);
  }, []);

  function submit(event: { preventDefault(): void }) {
    event.preventDefault();
    void ask(input);
  }

  function reset() {
    contextRef.current = EMPTY.context;
    setStored(EMPTY);
    writeStored(EMPTY);
    setError(null);
    inputRef.current?.focus();
  }

  const last = stored.messages.at(-1);
  const suggestions = stored.messages.length === 0 ? EXAMPLES : last?.role === 'bot' ? last.answer.suggestions : [];

  const panel = (
    <section
      className={isPage ? 'chat chat-page' : 'chat chat-panel'}
      role={isPage ? undefined : 'dialog'}
      aria-labelledby={titleId}
    >
      <header className="chat-head">
        <div>
          <p className="chat-title" id={titleId}>Chat Abonito</p>
          <p className="chat-note">Respondo solo con lo publicado en Abonito. No es asesoramiento impositivo.</p>
        </div>
        <div className="chat-head-actions">
          {stored.messages.length > 0 && (
            <button type="button" className="chat-icon" onClick={reset} title="Nueva conversación">
              <RotateCcw size={18} aria-hidden="true" />
              <span className="visually-hidden">Nueva conversación</span>
            </button>
          )}
          {!isPage && (
            <button type="button" className="chat-icon" onClick={close} title="Cerrar">
              <X size={20} aria-hidden="true" />
              <span className="visually-hidden">Cerrar el chat</span>
            </button>
          )}
        </div>
      </header>
      <div className="chat-log" ref={logRef} role="log" aria-live="polite" aria-relevant="additions" tabIndex={0} aria-label="Conversación">
        {stored.messages.length === 0 && (
          <div className="chat-msg bot">
            <div className="chat-bubble">
              <p>Hola. Preguntame por precios, planes, impuestos, cómo cancelar una suscripción o la cotización del dólar.</p>
            </div>
          </div>
        )}
        {stored.messages.map((message) => (
          <div key={message.id} className={`chat-msg ${message.role}`}>
            {message.role === 'user'
              ? <div className="chat-bubble"><span className="visually-hidden">Vos: </span>{message.text}</div>
              : <BotMessage answer={message.answer} />}
          </div>
        ))}
        {busy && <div className="chat-msg bot"><div className="chat-bubble chat-typing">Buscando en Abonito…</div></div>}
        {error && <p className="error" role="alert">{error}</p>}
      </div>
      {suggestions.length > 0 && !busy && (
        <div className="chat-suggestions" aria-label="Preguntas sugeridas">
          {suggestions.map((suggestion) => (
            <button key={suggestion} type="button" className="chip" onClick={() => void ask(suggestion)}>{suggestion}</button>
          ))}
        </div>
      )}
      <form className="chat-form" onSubmit={submit}>
        <label className="visually-hidden" htmlFor={`${titleId}-input`}>Tu pregunta</label>
        <input
          id={`${titleId}-input`}
          ref={inputRef}
          type="text"
          value={input}
          maxLength={MAX_LENGTH}
          autoComplete="off"
          enterKeyHint="send"
          placeholder="Escribí tu pregunta"
          onChange={(event) => setInput(event.target.value)}
        />
        <button type="submit" className="btn primary chat-send" disabled={busy || !input.trim()}>
          <Send size={18} aria-hidden="true" />
          <span className="visually-hidden">Enviar</span>
        </button>
      </form>
    </section>
  );

  if (isPage) return panel;
  return (
    <>
      {!open && (
        <button type="button" className="chat-fab" ref={fabRef} onClick={() => setOpen(true)} aria-haspopup="dialog">
          <MessageCircle size={20} aria-hidden="true" />
          <span>Chat Abonito</span>
        </button>
      )}
      {open && panel}
    </>
  );
}
