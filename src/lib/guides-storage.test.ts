import { describe, expect, it } from 'vitest';
import { platformGuides } from '../data/subscription-management/platform-guides';
import type { PlatformGuide } from '../data/subscription-management/types';
import { guideConfig } from './guide-validation';
import { asksChannel, matchesAliases, memberUsesScope, parseGuideState, resolveRouteId, stateForRoute } from './guides';

const bySlug = (slug: string) => platformGuides.find((guide) => guide.slug === slug)!;
const routeFor = (guide: PlatformGuide, search: string) => {
  const config = guideConfig(guide);
  const id = resolveRouteId(parseGuideState(search, config), config);
  return guide.routes.find((route) => route.id === id);
};
const text = (value: unknown) => JSON.stringify(value);
const batch3 = ['google-one', 'icloud-plus', 'dropbox', 'microsoft-365', 'canva'].map(bySlug);
const storage = ['google-one', 'icloud-plus', 'dropbox', 'microsoft-365'].map(bySlug);

describe('tanda 3: almacenamiento y productividad', () => {
  it('usa los títulos pedidos y descripciones cortas', () => {
    expect(batch3.map((guide) => guide.seo.title)).toEqual([
      'Cómo cancelar Google One o bajar de plan | Abonito',
      'Cómo cancelar iCloud+ o reducir tu plan | Abonito',
      'Cómo cancelar Dropbox o cambiar de plan | Abonito',
      'Cómo cancelar Microsoft 365 | Abonito',
      'Cómo cancelar Canva Pro o cambiar de plan | Abonito',
    ]);
    for (const guide of batch3) expect(guide.seo.description.length).toBeLessThanOrEqual(160);
  });

  it('escribe con voseo y sin prometer reembolsos, pruebas en cuentas ni planes educativos', () => {
    const copy = text(batch3);
    expect(copy).not.toMatch(/\b(puedes|tienes|quieres|debes|selecciona|haz clic)\b/i);
    expect(copy).not.toMatch(/Probado en una cuenta/i);
    expect(copy).not.toMatch(/reembolso garantizado|te devolvemos|siempre te devuelven/i);
    expect(copy).not.toMatch(/educaci[oó]n|education|sin fines de lucro|ONG/i);
    expect(copy).not.toMatch(/\$\s?\d|USD\s?\d/);
  });

  it('el aviso de almacenamiento está antes del botón en cada baja o reducción del titular', () => {
    for (const guide of storage) {
      expect(guide.impact?.heading).toBe('Antes de reducir tu almacenamiento');
      const points = text(guide.impact);
      expect(points).toMatch(/copia/);
      expect(points).toMatch(/no borramos ni movemos archivos/);
      expect(points).not.toMatch(/se borran (todos )?(de inmediato|inmediatamente|al instante)/i);
      expect(points).not.toMatch(/(quedan|se conservan|se guardan) para siempre|sin riesgo/i);
      const personal = guide.routes.filter((route) => route.role === 'titular' && route.scope !== 'equipo' && route.scope !== 'empresa');
      for (const route of personal) expect(route.impact, route.id).toBe(true);
    }
    expect(bySlug('canva').impact?.heading).toBe('Qué conservás y qué no');
  });

  it('Google One nunca manda a borrar la cuenta ni un servicio', () => {
    const guide = bySlug('google-one');
    expect(text(guide)).not.toMatch(/myaccount\.google\.com|deleteservices/);
    for (const route of guide.routes.filter((item) => item.intent === 'cancelar')) {
      for (const step of route.steps) expect(step).not.toMatch(/eliminar/i);
    }
    expect(text(guide.routes.find((route) => route.id === 'google-one-cancelar-directo'))).toMatch(/no sigas/);
    const member = routeFor(guide, '?rol=miembro');
    expect(member?.id).toBe('google-one-cancelar-miembro');
    expect(member?.steps[0]).toMatch(/quién paga/);
    expect(text(member)).toMatch(/no cancela el plan de quien paga/);
    expect(text(guide)).toMatch(/Workspace/);
  });

  it('iCloud+ muestra pasos por dispositivo y separa Apple One del plan aparte', () => {
    const guide = bySlug('icloud-plus');
    expect(guide.channels).toEqual(['directo']);
    expect(parseGuideState('?alcance=servicio&cobro=google-play', guideConfig(guide)).channel).toBeNull();
    const cancel = routeFor(guide, '?rol=titular&alcance=servicio');
    expect(cancel?.variants?.map((item) => item.id)).toEqual(['ios-18-4', 'ios-18', 'ios-17', 'mac-tahoe', 'mac-sonoma', 'windows', 'sin-dispositivo']);
    const noDevice = cancel?.variants?.find((item) => item.id === 'sin-dispositivo');
    expect(text(noDevice)).toMatch(/no significa que te devuelvan dinero/);
    const reduce = routeFor(guide, '?objetivo=ahorrar&rol=titular&alcance=servicio');
    expect(reduce?.variants?.some((item) => item.id === 'sin-dispositivo')).toBe(false);
    expect(text(reduce?.variants)).toMatch(/plan pago con menos espacio/);
    expect(text(cancel?.variants)).toMatch(/plan gratuito/);
    expect(routeFor(guide, '?rol=titular&alcance=paquete')?.id).toBe('icloud-plus-cancelar-paquete');
    expect(text(routeFor(guide, '?rol=titular&alcance=paquete'))).toMatch(/cancelar sólo ese plan/);
    expect(text(guide)).toMatch(/No es la capacidad de tu iPhone/);
    expect(routeFor(guide, '?rol=miembro')?.id).toBe('icloud-plus-cancelar-miembro');
  });

  it('Dropbox separa plan personal, Family y equipo, y miembro de administrador', () => {
    const guide = bySlug('dropbox');
    const config = guideConfig(guide);
    expect(routeFor(guide, '?rol=titular&alcance=personal&cobro=apple')?.id).toBe('dropbox-cancelar-personal-apple');
    expect(routeFor(guide, '?rol=titular&alcance=equipo&cobro=apple')?.id).toBe('dropbox-cancelar-equipo');
    expect(asksChannel(parseGuideState('?rol=titular&alcance=equipo', config), config)).toBe(false);
    expect(memberUsesScope('cancelar', config)).toBe(true);
    expect(resolveRouteId(parseGuideState('?rol=miembro', config), config)).toBeNull();
    expect(routeFor(guide, '?rol=miembro&alcance=familia')?.id).toBe('dropbox-cancelar-miembro-familia');
    expect(routeFor(guide, '?rol=miembro&alcance=equipo')?.id).toBe('dropbox-cancelar-miembro-equipo');
    expect(routeFor(guide, '?rol=miembro&alcance=personal')?.id).toBe('dropbox-cancelar-miembro');
    expect(text(routeFor(guide, '?rol=miembro&alcance=equipo'))).not.toMatch(/Abandonar el plan/);
    expect(text(guide.routes.find((route) => route.id === 'dropbox-cancelar-personal-directo'))).toMatch(/Dropbox Sign/);
    expect(text(guide.impact)).toMatch(/30 días/);
    expect(text(guide.impact)).toMatch(/no borra la cuenta/);
  });

  it('Microsoft 365 no trata la renovación ya apagada como baja pendiente ni da pasos personales a empresas', () => {
    const guide = bySlug('microsoft-365');
    const direct = routeFor(guide, '?rol=titular&alcance=personal&cobro=directo');
    expect(text(direct?.before)).toMatch(/Activar facturación periódica.*no tenés que cancelar nada/);
    expect(text(direct)).toMatch(/no garantiza un reembolso/);
    const business = routeFor(guide, '?rol=titular&alcance=empresa&cobro=directo');
    expect(business?.id).toBe('microsoft-365-cancelar-empresa');
    expect(business?.status).toBe('official_handoff');
    expect(business?.cta?.url).toMatch(/^https:\/\/learn\.microsoft\.com\//);
    expect(text(business)).not.toMatch(/account\.microsoft\.com/);
    expect(routeFor(guide, '?rol=miembro&alcance=empresa')?.id).toBe('microsoft-365-cancelar-miembro-empresa');
    expect(routeFor(guide, '?rol=miembro&alcance=personal')?.id).toBe('microsoft-365-cancelar-miembro');
    expect(text(guide)).toMatch(/no una suscripción aparte/);
  });

  it('Canva no le dice a un miembro que cancele el plan del equipo', () => {
    const guide = bySlug('canva');
    const member = routeFor(guide, '?rol=miembro');
    expect(member?.id).toBe('canva-cancelar-miembro');
    for (const step of member?.steps ?? []) expect(step).not.toMatch(/Cancelar plan|Cancelar suscripción/);
    expect(text(member)).toMatch(/propietario o a un administrador/);
    expect(routeFor(guide, '?rol=titular&alcance=equipo')?.id).toBe('canva-cancelar-equipo');
    expect(text(guide.impact)).toMatch(/no garantiza que puedas seguir usando todo/);
    expect(text(guide)).toMatch(/no se puede volver a contratar ese mismo plan/);
    expect(text(guide)).toMatch(/No está disponible para todas las cuentas/);
  });

  it('las anclas de cada ruta llevan a esa ruta', () => {
    for (const guide of batch3) {
      const config = guideConfig(guide);
      for (const route of guide.routes) {
        const state = stateForRoute(route.id, config);
        expect(state && resolveRouteId(state, config), route.id).toBe(route.id);
      }
    }
  });

  it('descarta valores que la guía no ofrece', () => {
    const config = guideConfig(bySlug('canva'));
    const state = parseGuideState('?objetivo=borrar&cobro=movistar&rol=dueño&alcance=empresa', config);
    expect(state).toEqual({ intent: 'cancelar', channel: null, unknown: false, role: null, scope: null });
  });

  it('reconoce los alias de búsqueda', () => {
    const aliases = (slug: string) => [bySlug(slug).name, ...bySlug(slug).aliases];
    expect(matchesAliases('almacenamiento Google', aliases('google-one'))).toBe(true);
    expect(matchesAliases('iCloud', aliases('icloud-plus'))).toBe(true);
    expect(matchesAliases('icloud+', aliases('icloud-plus'))).toBe(true);
    expect(matchesAliases('Office 365', aliases('microsoft-365'))).toBe(true);
    expect(matchesAliases('Canva Pro', aliases('canva'))).toBe(true);
    expect(matchesAliases('Dropbox', aliases('dropbox'))).toBe(true);
  });
});
