import { describe, expect, it } from 'vitest';
import { billingGuides } from '../data/subscription-management/billing-guides';
import { guideHref, managedPlatforms } from '../data/subscription-management/managed';
import { platformGuides } from '../data/subscription-management/platform-guides';
import { guideSources } from '../data/subscription-management/sources';
import type { PlatformGuide } from '../data/subscription-management/types';
import { services, todayIso } from './catalog';
import { guideConfig, validateGuides } from './guide-validation';
import {
  INTENTS,
  isOfficialUrl,
  matchesAliases,
  memberUsesScope,
  parseGuideState,
  resolveRouteId,
  scopeOptionsFor,
  serializeGuideState,
  stateForRoute,
} from './guides';

const bySlug = (slug: string) => platformGuides.find((guide) => guide.slug === slug)!;
const routeIntent = (guide: PlatformGuide, id: string | null) => guide.routes.find((route) => route.id === id)?.intent;

describe('guías para gestionar suscripciones', () => {
  it('pasan la validación de esquema, fuentes, rutas y enlaces', () => {
    expect(validateGuides(services, todayIso())).toEqual([]);
  });

  it('cubren todas las plataformas con los dos objetivos', () => {
    expect(platformGuides.map((guide) => guide.slug)).toEqual([
      'netflix', 'spotify', 'disney-plus', 'hbo-max', 'youtube-premium',
      'prime-video', 'apple-tv', 'paramount-plus', 'crunchyroll', 'mubi',
      'google-one', 'icloud-plus', 'dropbox', 'microsoft-365', 'canva',
      'playstation-plus', 'xbox-game-pass', 'nintendo-switch-online', 'ea-play', 'geforce-now',
    ]);
    for (const guide of platformGuides) {
      const config = guideConfig(guide);
      for (const intent of INTENTS) {
        const search = intent === 'ahorrar' ? '?objetivo=ahorrar' : '';
        const base = parseGuideState(search, config);
        expect(base.intent).toBe(intent);
        const role = config.hasRole ? '&rol=titular' : '';
        const scopes = scopeOptionsFor(intent, config);
        for (const option of scopes.length ? scopes : [null]) {
          const scope = option ? `&alcance=${option.id}` : '';
          const channels = option && !option.askChannel ? [null] : guide.channels;
          for (const channel of channels) {
            const state = parseGuideState(`?objetivo=${intent}${scope}${channel ? `&cobro=${channel}` : ''}${role}`, config);
            const id = resolveRouteId(state, config);
            expect(id, `${guide.slug} ${intent} ${option?.id ?? ''} ${channel ?? ''}`).not.toBeNull();
            expect(routeIntent(guide, id)).toBe(intent);
          }
        }
        if (config.hasRole) {
          const memberScopes = memberUsesScope(intent, config) ? scopes.map((item) => `&alcance=${item.id}`) : [''];
          for (const scope of memberScopes) {
            const member = resolveRouteId(parseGuideState(`?objetivo=${intent}&rol=miembro${scope}`, config), config);
            expect(guide.routes.find((route) => route.id === member)?.role, `${guide.slug} ${intent} ${scope}`).toBe('miembro');
          }
        }
      }
    }
  });

  it('descartan parámetros inválidos y combinaciones que la plataforma no ofrece', () => {
    const netflix = guideConfig(bySlug('netflix'));
    expect(parseGuideState('?objetivo=hackear&cobro=javascript:alert(1)&rol=miembro', netflix)).toEqual({
      intent: 'cancelar', channel: null, unknown: false, role: null, scope: null,
    });
    expect(parseGuideState('?cobro=apple', netflix).channel).toBeNull();
    expect(resolveRouteId(parseGuideState('?cobro=google-play', netflix), netflix)).toBeNull();
    expect(parseGuideState('?destino=https://evil.example', netflix)).toEqual({ intent: 'cancelar', channel: null, unknown: false, role: null, scope: null });
    expect(parseGuideState('?alcance=canal&cobro=directo', netflix)).toEqual({ intent: 'cancelar', channel: 'directo', unknown: false, role: null, scope: null });
  });

  it('pide el rol antes de mostrar pasos donde importa', () => {
    const spotify = guideConfig(bySlug('spotify'));
    expect(resolveRouteId(parseGuideState('?cobro=directo', spotify), spotify)).toBeNull();
    expect(resolveRouteId(parseGuideState('?cobro=directo&rol=titular', spotify), spotify)).toBe('spotify-cancelar-directo');
    const member = parseGuideState('?cobro=directo&rol=miembro', spotify);
    expect(member.channel).toBeNull();
    expect(resolveRouteId(member, spotify)).toBe('spotify-cancelar-miembro');
  });

  it('el flujo «No sé quién me cobra» vuelve a una ruta al elegir el canal', () => {
    const hbo = guideConfig(bySlug('hbo-max'));
    const unknown = parseGuideState('?cobro=no-se', hbo);
    expect(unknown.unknown).toBe(true);
    expect(resolveRouteId(unknown, hbo)).toBeNull();
    expect(serializeGuideState(unknown)).toBe('?cobro=no-se');
    expect(resolveRouteId({ ...unknown, unknown: false, channel: 'google-play' }, hbo)).toBe('hbo-max-cancelar-google-play');
  });

  it('serializa y vuelve a leer el mismo estado', () => {
    const youtube = guideConfig(bySlug('youtube-premium'));
    const state = { intent: 'ahorrar', channel: 'apple', unknown: false, role: 'titular', scope: null } as const;
    expect(parseGuideState(serializeGuideState(state), youtube)).toEqual(state);
    expect(serializeGuideState({ intent: 'cancelar', channel: null, unknown: false, role: null, scope: null })).toBe('');
  });

  it('cada ruta se puede abrir desde su ancla', () => {
    for (const guide of platformGuides) {
      const config = guideConfig(guide);
      for (const route of guide.routes) {
        const state = stateForRoute(route.id, config);
        expect(state && resolveRouteId(state, config), route.id).toBe(route.id);
      }
    }
  });

  it('sólo enlaza a destinos oficiales con HTTPS', () => {
    const urls = [
      ...guideSources.map((source) => source.url),
      ...platformGuides.flatMap((guide) => [guide.billerCheck.url, ...guide.routes.flatMap((route) => (route.cta ? [route.cta.url] : []))]),
      ...billingGuides.map((guide) => guide.cta.url),
    ];
    for (const url of urls) expect(isOfficialUrl(url), url).toBe(true);
    expect(isOfficialUrl('http://www.netflix.com/cancelplan')).toBe(false);
    expect(isOfficialUrl('https://netflix.com.evil.example/')).toBe(false);
    expect(isOfficialUrl('https://user:pass@www.netflix.com/')).toBe(false);
  });

  it('no usa el texto prohibido en botones ni promete pruebas en cuentas', () => {
    const copy = JSON.stringify([platformGuides, billingGuides]);
    expect(copy).not.toMatch(/Cancelar ahora/i);
    expect(copy).not.toMatch(/Probado en una cuenta/i);
    for (const guide of platformGuides) {
      for (const route of guide.routes) if (route.cta) expect(route.cta.label).toMatch(/^(Abrir |Administrar mi suscripción$|Ver los pasos oficiales$)/);
    }
  });

  it('reconoce los alias de búsqueda', () => {
    const aliases = (slug: string) => [bySlug(slug).name, ...bySlug(slug).aliases];
    expect(matchesAliases('Disney', aliases('disney-plus'))).toBe(true);
    expect(matchesAliases('disney+', aliases('disney-plus'))).toBe(true);
    expect(matchesAliases('HBO', aliases('hbo-max'))).toBe(true);
    expect(matchesAliases('Max', aliases('hbo-max'))).toBe(true);
    expect(matchesAliases('HBO Max', aliases('hbo-max'))).toBe(true);
    expect(matchesAliases('Youtube Premium', aliases('youtube-premium'))).toBe(true);
    expect(matchesAliases('YouTube', aliases('youtube-premium'))).toBe(true);
    expect(matchesAliases('Paramount', aliases('netflix'))).toBe(false);
  });

  it('el índice liviano coincide con las guías y arma los enlaces', () => {
    expect(managedPlatforms.map((item) => item.slug)).toEqual(platformGuides.map((guide) => guide.slug));
    expect(guideHref('netflix')).toBe('/netflix/cancelar/');
    expect(guideHref('hbo-max', 'ahorrar')).toBe('/hbo-max/cancelar/?objetivo=ahorrar');
    expect(guideHref('prime-video')).toBe('/prime-video/cancelar/');
    expect(guideHref('apple-one')).toBeNull();
  });

  it('la validación rechaza fuentes inexistentes, URLs externas y fechas inválidas', () => {
    const broken = structuredClone(platformGuides[0]);
    broken.routes[0].sourceIds = ['no-existe'];
    broken.routes[0].cta = { label: 'Abrir en Netflix', url: 'https://acortador.example/x' };
    broken.updatedAt = '2026-02-30';
    const sources = structuredClone(guideSources);
    sources[0].lastReviewedAt = '2999-01-01';
    const errors = validateGuides(services, '2026-10-12', {
      sources,
      platforms: [broken, ...platformGuides.slice(1)],
      billing: billingGuides,
      managed: managedPlatforms,
    });
    expect(errors.some((error) => error.includes('no-existe'))).toBe(true);
    expect(errors.some((error) => error.includes('URL no oficial'))).toBe(true);
    expect(errors.some((error) => error.includes('Fecha inválida'))).toBe(true);
    expect(errors.some((error) => error.includes('fecha futura'))).toBe(true);
  });
});
