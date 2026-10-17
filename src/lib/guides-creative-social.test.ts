import { describe, expect, it } from 'vitest';
import { platformGuides } from '../data/subscription-management/platform-guides';
import type { PlatformGuide } from '../data/subscription-management/types';
import { guideConfig } from './guide-validation';
import { matchesAliases, parseGuideState, resolveRouteId } from './guides';

const bySlug = (slug: string) => platformGuides.find((guide) => guide.slug === slug)!;
const routeFor = (guide: PlatformGuide, search: string) => {
  const config = guideConfig(guide);
  const id = resolveRouteId(parseGuideState(search, config), config);
  return guide.routes.find((route) => route.id === id);
};
const text = (value: unknown) => JSON.stringify(value);
const batch5 = ['adobe', 'duolingo', 'linkedin-premium', 'discord', 'twitch'].map(bySlug);

describe('tanda 5: creativo, aprendizaje y redes', () => {
  it('usa títulos cortos, voseo y sin precios inventados', () => {
    expect(batch5.map((guide) => guide.seo.title)).toEqual([
      'Cómo cancelar Adobe Creative Cloud | Abonito',
      'Cómo cancelar Super Duolingo | Abonito',
      'Cómo cancelar LinkedIn Premium | Abonito',
      'Cómo cancelar Discord Nitro | Abonito',
      'Cómo cancelar Twitch o Turbo | Abonito',
    ]);
    const copy = text(batch5);
    expect(copy).not.toMatch(/\b(puedes|tienes|quieres|debes|selecciona|haz clic)\b/i);
    expect(copy).not.toMatch(/\$\s?\d|USD\s?\d|ARS\s?\d/);
    expect(copy).not.toMatch(/cancellation_success|cancelación exitosa|Suscripción cancelada/i);
  });

  it('Adobe no trata el cobro mensual como contrato mensual', () => {
    const guide = bySlug('adobe');
    const route = routeFor(guide, '?rol=titular&alcance=personal&cobro=directo');
    expect(text(route?.before)).toMatch(/Que te cobren por mes no significa que tu contrato sea mensual/);
    expect(text(guide)).not.toMatch(/50 %|penalidad del|reembolso garantizado para Argentina/i);
  });

  it('LinkedIn trial no hereda la promesa del plan pago', () => {
    const guide = bySlug('linkedin-premium');
    const trial = routeFor(guide, '?alcance=paquete&cobro=directo');
    const paid = routeFor(guide, '?alcance=servicio&cobro=directo');
    expect(trial?.id).toBe('linkedin-premium-cancelar-paquete-directo');
    expect(text(trial?.before)).toMatch(/de inmediato/);
    expect(text(trial?.before)).toMatch(/No uses la promesa del plan pago/);
    expect(text(paid?.after)).toMatch(/fin del ciclo|fin del período|Basic/);
  });

  it('Duolingo: el miembro familiar no controla la renovación', () => {
    const guide = bySlug('duolingo');
    const member = routeFor(guide, '?rol=miembro');
    expect(member?.id).toBe('duolingo-cancelar-miembro');
    expect(text(member)).toMatch(/No controlás la renovación|no cancela el cobro/i);
    expect(text(guide.faqs)).toMatch(/¿Quién cancela el plan familiar\?/);
    expect(text(guide.faqs)).toMatch(/¿Borrar la app cancela el cobro\?/);
  });

  it('Discord Nitro no afirma cancelar todos los productos', () => {
    const guide = bySlug('discord');
    const nitro = routeFor(guide, '?alcance=servicio&cobro=directo');
    expect(text(nitro?.before)).toMatch(/no cancela Server Boost/i);
    expect(routeFor(guide, '?alcance=canal')?.status).toBe('official_handoff');
    expect(text(routeFor(guide, '?objetivo=ahorrar&alcance=servicio&cobro=directo'))).toMatch(/no se puede hacer downgrade|esperar/);
  });

  it('Twitch no manda a cancelar Amazon por un canal', () => {
    const guide = bySlug('twitch');
    const channel = routeFor(guide, '?alcance=servicio&cobro=directo');
    const prime = routeFor(guide, '?alcance=canal');
    expect(text(channel?.before)).toMatch(/No vayas a cancelar Amazon Prime/);
    expect(text(prime)).toMatch(/No canceles Amazon Prime/);
    expect(text(prime)).not.toMatch(/account\.amazon\.com\/cancel|cancelá Prime ahora/i);
    expect(prime?.status).toBe('official_handoff');
  });

  it('desconoce el cobrador y cambia de alcance sin mezclar rutas', () => {
    for (const [slug, search] of [
      ['adobe', '?rol=titular&alcance=personal&cobro=no-se'],
      ['duolingo', '?rol=titular&alcance=personal&cobro=no-se'],
      ['linkedin-premium', '?alcance=servicio&cobro=no-se'],
      ['discord', '?alcance=servicio&cobro=no-se'],
      ['twitch', '?alcance=servicio&cobro=no-se'],
    ] as const) {
      const config = guideConfig(bySlug(slug));
      const unknown = parseGuideState(search, config);
      expect(unknown.unknown, slug).toBe(true);
      expect(resolveRouteId(unknown, config)).toBeNull();
    }
    const twitch = guideConfig(bySlug('twitch'));
    expect(parseGuideState('?alcance=canal&cobro=apple', twitch).channel).toBeNull();
    expect(parseGuideState('?alcance=servicio&cobro=apple', twitch).channel).toBe('apple');
  });

  it('no etiqueta el clic oficial como cancelación exitosa', () => {
    for (const guide of batch5) {
      for (const route of guide.routes) {
        expect(route.cta?.label ?? '').not.toMatch(/cancelé|cancelado con éxito|Suscripción cancelada/i);
      }
    }
  });

  it('reconoce alias de búsqueda', () => {
    const aliases = (slug: string) => [bySlug(slug).name, ...bySlug(slug).aliases];
    expect(matchesAliases('creative cloud', aliases('adobe'))).toBe(true);
    expect(matchesAliases('duolingo max', aliases('duolingo'))).toBe(true);
    expect(matchesAliases('sales navigator', aliases('linkedin-premium'))).toBe(true);
    expect(matchesAliases('nitro basic', aliases('discord'))).toBe(true);
    expect(matchesAliases('twitch turbo', aliases('twitch'))).toBe(true);
  });
});
