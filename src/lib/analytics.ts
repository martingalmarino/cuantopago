type AnalyticsEvent = 'service_view' | 'calculation_completed' | 'subscription_added' | 'savings_simulated';

/** Apagado si no hay PUBLIC_ANALYTICS_ENDPOINT. Nunca manda importes, nombres propios ni la lista. */
export function track(event: AnalyticsEvent, serviceId?: string): void {
  const endpoint = import.meta.env.PUBLIC_ANALYTICS_ENDPOINT;
  if (!endpoint || typeof navigator === 'undefined') return;
  const body = JSON.stringify({ event, serviceId: serviceId ?? null });
  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
    return;
  }
  void fetch(endpoint, { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true });
}
