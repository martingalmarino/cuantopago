import type { BillingChannel, GuideIntent, GuideRole, ProductScope } from '../data/subscription-management/types';

export const INTENTS: GuideIntent[] = ['cancelar', 'ahorrar'];
export const CHANNELS: BillingChannel[] = ['directo', 'apple', 'google-play', 'externo', 'movistar', 'playstation', 'prime-video'];
export const ROLES: GuideRole[] = ['titular', 'miembro'];
export const SCOPES: ProductScope[] = ['servicio', 'canal', 'paquete'];
export const UNKNOWN_CHANNEL = 'no-se';

/** Únicos dominios a los que pueden apuntar fuentes y botones. */
export const OFFICIAL_HOSTS = [
  'help.netflix.com',
  'www.netflix.com',
  'support.spotify.com',
  'www.spotify.com',
  'help.disneyplus.com',
  'www.disneyplus.com',
  'help.hbomax.com',
  'hbomax.com',
  'support.google.com',
  'www.youtube.com',
  'support.apple.com',
  'account.apple.com',
  'play.google.com',
  'www.primevideo.com',
  'tv.apple.com',
  'www.apple.com',
  'apps.apple.com',
  'www.paramountplus.com',
  'support.paramountplus.com',
  'ayuda.movistar.com.ar',
  'help.crunchyroll.com',
  'www.crunchyroll.com',
  'es.help.mubi.com',
  'mubi.com',
];

export function isOfficialUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && OFFICIAL_HOSTS.includes(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export const intentLabels: Record<GuideIntent, string> = {
  cancelar: 'Quiero cancelar',
  ahorrar: 'Quiero pagar menos',
};

export function channelLabel(channel: BillingChannel, provider: string): string {
  switch (channel) {
    case 'directo': return `${provider}, directamente`;
    case 'apple': return 'Apple (App Store)';
    case 'google-play': return 'Google Play';
    case 'externo': return 'Otra empresa';
    case 'movistar': return 'Movistar';
    case 'playstation': return 'PlayStation';
    case 'prime-video': return 'Prime Video, como canal';
  }
}

export const statusLabels = {
  verified: 'Fuente oficial revisada',
  conditional: 'Depende de tu cuenta',
  official_handoff: 'Te llevamos a la ayuda oficial',
} as const;

/** Lo mínimo que necesita el navegador para elegir una ruta. */
export interface GuideConfig {
  channels: BillingChannel[];
  hasRole: boolean;
  scope?: { intents: GuideIntent[]; options: { id: ProductScope; askChannel: boolean }[] } | null;
  routes: { id: string; intent: GuideIntent; channels: BillingChannel[]; role: GuideRole | null; scope?: ProductScope | null }[];
}

export interface GuideState {
  intent: GuideIntent;
  channel: BillingChannel | null;
  unknown: boolean;
  role: GuideRole | null;
  scope: ProductScope | null;
}

/** Opciones de alcance que valen para ese objetivo. Vacío si la guía no pregunta alcance ahí. */
export function scopeOptionsFor(intent: GuideIntent, config: GuideConfig) {
  return config.scope?.intents.includes(intent) ? config.scope.options : [];
}

/** Si hay que preguntar quién cobra. No se pregunta a miembros ni en alcances con una sola ruta. */
export function asksChannel(state: GuideState, config: GuideConfig): boolean {
  if (state.role === 'miembro') return false;
  const options = scopeOptionsFor(state.intent, config);
  if (!options.length) return true;
  const option = options.find((item) => item.id === state.scope);
  return option ? option.askChannel : false;
}

/** Lee la URL. Todo valor que no esté en la lista cerrada de la plataforma se descarta. */
export function parseGuideState(search: string, config: GuideConfig): GuideState {
  const params = new URLSearchParams(search);
  const rawIntent = params.get('objetivo');
  const rawChannel = params.get('cobro');
  const rawRole = params.get('rol');
  const rawScope = params.get('alcance');
  const intent = INTENTS.includes(rawIntent as GuideIntent) ? rawIntent as GuideIntent : 'cancelar';
  const role = config.hasRole && ROLES.includes(rawRole as GuideRole) ? rawRole as GuideRole : null;
  const scope = scopeOptionsFor(intent, config).find((item) => item.id === rawScope)?.id ?? null;
  const base = { intent, channel: null, unknown: false, role, scope };
  if (!asksChannel(base, config)) return base;
  const channel = config.channels.includes(rawChannel as BillingChannel) ? rawChannel as BillingChannel : null;
  const unknown = channel === null && rawChannel === UNKNOWN_CHANNEL;
  return { ...base, channel, unknown };
}

export function serializeGuideState(state: GuideState): string {
  const params = new URLSearchParams();
  if (state.intent !== 'cancelar') params.set('objetivo', state.intent);
  if (state.role) params.set('rol', state.role);
  if (state.scope) params.set('alcance', state.scope);
  if (state.role !== 'miembro') {
    if (state.channel) params.set('cobro', state.channel);
    else if (state.unknown) params.set('cobro', UNKNOWN_CHANNEL);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** Descarta lo que dejó de valer, por ejemplo el canal al pasar a un alcance que no lo pregunta. */
export function normalizeGuideState(state: GuideState, config: GuideConfig): GuideState {
  return parseGuideState(serializeGuideState(state), config);
}

export function resolveRouteId(state: GuideState, config: GuideConfig): string | null {
  if (config.hasRole && !state.role) return null;
  if (state.role === 'miembro') {
    return config.routes.find((route) => route.intent === state.intent && route.role === 'miembro')?.id ?? null;
  }
  const options = scopeOptionsFor(state.intent, config);
  if (options.length && !options.some((item) => item.id === state.scope)) return null;
  const scope = options.length ? state.scope : null;
  const candidates = config.routes.filter((route) => route.intent === state.intent
    && route.role !== 'miembro'
    && (route.scope ?? null) === scope);
  if (!asksChannel(state, config)) return candidates.find((route) => route.channels.length === 0)?.id ?? null;
  if (!state.channel) return null;
  const channel = state.channel;
  return candidates.find((route) => route.channels.includes(channel))?.id ?? null;
}

/** Estado que lleva a una ruta concreta, para anclas tipo #ruta-id. */
export function stateForRoute(routeId: string, config: GuideConfig): GuideState | null {
  const route = config.routes.find((item) => item.id === routeId);
  if (!route) return null;
  return {
    intent: route.intent,
    channel: route.role === 'miembro' ? null : route.channels[0] ?? null,
    unknown: false,
    role: config.hasRole ? (route.role ?? 'titular') : null,
    scope: route.scope ?? null,
  };
}

export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\+/g, 'plus')
    .replace(/[^a-z0-9]/g, '');
}

export function matchesAliases(query: string, aliases: string[]): boolean {
  const needle = normalizeSearch(query);
  if (!needle) return true;
  return aliases.some((alias) => normalizeSearch(alias).includes(needle));
}
