type AnalyticsEvent =
  | 'service_view'
  | 'calculation_completed'
  | 'subscription_added'
  | 'savings_simulated'
  | 'guide_view'
  | 'guide_intent_select'
  | 'guide_scope_select'
  | 'guide_biller_select'
  | 'guide_unknown_biller'
  | 'guide_official_link_click'
  | 'guide_copy_steps'
  | 'assistant_question';

/** Sólo valores de listas cerradas: plataforma, intención, canal y id de ruta. */
export interface GuideEventProps {
  intent?: 'cancelar' | 'ahorrar';
  channel?: 'directo' | 'apple' | 'google-play' | 'externo' | 'movistar' | 'playstation' | 'prime-video' | 'no-se';
  scope?: 'servicio' | 'canal' | 'paquete';
  routeId?: string;
  /** Tipo de pregunta que reconoció el chat. Nunca el texto que escribió la persona. */
  assistantIntent?: string;
  answered?: boolean;
}

/** Apagado si no hay PUBLIC_ANALYTICS_ENDPOINT. Nunca manda importes, nombres propios, la lista ni lo que se escribe en el chat. */
export function track(event: AnalyticsEvent, serviceId?: string, props: GuideEventProps = {}): void {
  const endpoint = import.meta.env.PUBLIC_ANALYTICS_ENDPOINT;
  if (!endpoint || typeof navigator === 'undefined') return;
  const body = JSON.stringify({
    event,
    serviceId: serviceId ?? null,
    intent: props.intent ?? null,
    channel: props.channel ?? null,
    scope: props.scope ?? null,
    routeId: props.routeId ?? null,
    assistantIntent: props.assistantIntent ?? null,
    answered: props.answered ?? null,
  });
  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
    return;
  }
  void fetch(endpoint, { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true });
}
