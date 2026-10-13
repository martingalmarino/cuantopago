import { describe, expect, it } from 'vitest';
import { PRIME_VIDEO_CHANNEL_GUIDE, PRIME_VIDEO_SETTINGS } from '../data/subscription-management/billing-guides';
import { platformGuides } from '../data/subscription-management/platform-guides';
import { guideSourceById } from '../data/subscription-management/sources';
import type { PlatformGuide } from '../data/subscription-management/types';
import { guideConfig } from './guide-validation';
import { asksChannel, matchesAliases, normalizeGuideState, parseGuideState, resolveRouteId, serializeGuideState } from './guides';

const bySlug = (slug: string) => platformGuides.find((guide) => guide.slug === slug)!;
const routeFor = (guide: PlatformGuide, search: string) => {
  const id = resolveRouteId(parseGuideState(search, guideConfig(guide)), guideConfig(guide));
  return guide.routes.find((route) => route.id === id);
};
const batch2 = ['prime-video', 'apple-tv', 'paramount-plus', 'crunchyroll', 'mubi'].map(bySlug);
const text = (value: unknown) => JSON.stringify(value);

describe('alcance: servicio, canal o paquete', () => {
  it('Prime Video pregunta qué dar de baja antes de mostrar pasos', () => {
    const guide = bySlug('prime-video');
    const config = guideConfig(guide);
    const noScope = parseGuideState('?cobro=directo', config);
    expect(noScope.channel).toBeNull();
    expect(resolveRouteId(noScope, config)).toBeNull();
    expect(asksChannel(noScope, config)).toBe(false);
    expect(routeFor(guide, '?alcance=servicio&cobro=directo')?.id).toBe('prime-video-cancelar-directo');
  });

  it('la baja de un canal de Prime Video nunca lleva a terminar la membresía', () => {
    const guide = bySlug('prime-video');
    for (const cobro of ['', '&cobro=directo', '&cobro=externo', '&cobro=no-se']) {
      const route = routeFor(guide, `?alcance=canal${cobro}`);
      expect(route?.id).toBe('prime-video-cancelar-canal');
      expect(route?.steps.join(' ')).not.toMatch(/Finalizar suscripción/);
      expect(route?.sourceIds).toEqual(['prime-video-canal']);
    }
    for (const other of platformGuides) {
      for (const route of other.routes.filter((item) => item.channels.includes('prime-video'))) {
        expect(route.status, route.id).toBe('conditional');
        expect(route.eligibility, route.id).toMatch(/No confirmamos que hoy se venda así en Argentina/);
        expect(route.cta, route.id).toEqual(PRIME_VIDEO_SETTINGS);
        expect(route.steps.join(' '), route.id).not.toMatch(/Finalizar suscripción/);
        expect(route.related, route.id).toContainEqual(PRIME_VIDEO_CHANNEL_GUIDE);
      }
    }
  });

  it('el canal de Prime Video sólo aparece en las guías que lo ofrecen', () => {
    const withChannel = platformGuides.filter((guide) => guide.channels.includes('prime-video')).map((guide) => guide.slug);
    expect(withChannel).toEqual(['paramount-plus', 'crunchyroll', 'mubi']);
    expect(parseGuideState('?cobro=prime-video', guideConfig(bySlug('netflix'))).channel).toBeNull();
  });

  it('cambiar de objetivo descarta un alcance que ya no aplica', () => {
    const config = guideConfig(bySlug('prime-video'));
    const canal = parseGuideState('?alcance=canal', config);
    const ahorrar = normalizeGuideState({ ...canal, intent: 'ahorrar', channel: 'directo' }, config);
    expect(ahorrar.scope).toBeNull();
    expect(serializeGuideState(ahorrar)).toBe('?objetivo=ahorrar&cobro=directo');
    expect(parseGuideState('?objetivo=ahorrar&alcance=canal', config).scope).toBeNull();
    expect(parseGuideState('?alcance=paquete', config).scope).toBeNull();
  });

  it('Apple TV distingue la suscripción, un canal y Apple One', () => {
    const guide = bySlug('apple-tv');
    expect(routeFor(guide, '?alcance=servicio&cobro=directo')?.id).toBe('apple-tv-cancelar-directo');
    expect(routeFor(guide, '?alcance=servicio&cobro=google-play')?.id).toBe('apple-tv-cancelar-google-play');
    expect(routeFor(guide, '?alcance=canal')?.status).toBe('conditional');
    const bundle = routeFor(guide, '?alcance=paquete&cobro=directo');
    expect(bundle?.id).toBe('apple-tv-cancelar-paquete');
    expect(bundle?.before.join(' ')).toMatch(/no se puede cancelar por separado/);
    expect(bundle?.sourceIds).toContain('apple-one-faq');
    expect(routeFor(guide, '?objetivo=ahorrar&alcance=paquete')?.id).toBe('apple-tv-ahorrar-paquete');
    expect(text(guide)).not.toMatch(/\b(Basic|Premium|Básico)\b/);
    expect(routeFor(guide, '?alcance=servicio&cobro=directo')?.before.join(' ')).toMatch(/aparato/);
  });
});

describe('cobradores y reglas por plataforma', () => {
  it('Paramount+ usa los pasos de Movistar sólo para Movistar y sin tocar la línea', () => {
    const guide = bySlug('paramount-plus');
    const movistar = routeFor(guide, '?cobro=movistar');
    expect(movistar?.sourceIds).toEqual(['paramount-movistar']);
    expect(movistar?.before.join(' ')).toMatch(/no los des de baja/);
    for (const route of guide.routes.filter((item) => !item.channels.includes('movistar'))) {
      expect(route.sourceIds, route.id).not.toContain('paramount-movistar');
    }
    const direct = routeFor(guide, '?cobro=directo');
    expect(direct?.status).toBe('official_handoff');
    expect(text(guide)).not.toMatch(/salesforce|Essential|SHOWTIME|R\$|BRL/i);
  });

  it('Crunchyroll baja de plan cancelando, esperando el vencimiento y recién después suscribiéndose', () => {
    const guide = bySlug('crunchyroll');
    const direct = routeFor(guide, '?objetivo=ahorrar&cobro=directo');
    expect(direct?.transition).toBe('cancel_then_expire_then_resubscribe');
    expect(direct?.status).toBe('verified');
    expect(direct?.steps[0]).toMatch(/Cancelá/);
    expect(direct?.steps[1]).toMatch(/Esperá/);
    expect(direct?.before.join(' ')).toMatch(/antes de que venza/);
    expect(direct?.after.join(' ')).toMatch(/no significa que puedas ver todo el catálogo/);
    expect(text(guide)).not.toMatch(/al instante y|inmediatamente/i);
    expect(routeFor(guide, '?cobro=playstation')?.status).toBe('conditional');
    expect(routeFor(guide, '?cobro=prime-video')?.before.join(' ')).toMatch(/No hace falta recuperar una contraseña/);
  });

  it('MUBI aplica los cambios al final del período y no inventa planes', () => {
    const guide = bySlug('mubi');
    const direct = routeFor(guide, '?objetivo=ahorrar&cobro=directo');
    expect(direct?.transition).toBe('next_cycle');
    expect(direct?.after.join(' ')).toMatch(/al final de tu período de renovación/);
    expect(direct?.cta?.url).toBe('https://mubi.com/subscription');
    expect(text(guide)).not.toMatch(/MUBI GO/);
    expect(routeFor(guide, '?cobro=prime-video')?.status).toBe('conditional');
  });

  it('Prime Video no presenta un plan más barato ni confunde Amazon Prime con Prime Video', () => {
    const guide = bySlug('prime-video');
    const save = routeFor(guide, '?objetivo=ahorrar&cobro=directo');
    expect(save?.transition).toBe('inspect_account');
    expect(save?.status).toBe('conditional');
    expect(save?.steps.join(' ')).toMatch(/Sólo si tu cuenta muestra un adicional sin anuncios/);
    expect(save?.before.join(' ')).toMatch(/compras distintas/);
    expect(guide.routes.flatMap((route) => route.cta ? [route.cta.label] : [])).toContain('Abrir mi cuenta de Prime Video');
  });
});

describe('contenido común de la tanda', () => {
  it('cada guía tiene «No sé quién me cobra», ambos objetivos y los títulos pedidos', () => {
    const titles = batch2.map((guide) => guide.seo.title);
    expect(titles).toEqual([
      'Cómo cancelar Prime Video | Abonito',
      'Cómo cancelar Apple TV | Abonito',
      'Cómo cancelar Paramount+ | Abonito',
      'Cómo cancelar Crunchyroll | Abonito',
      'Cómo cancelar MUBI o cambiar de plan | Abonito',
    ]);
    for (const guide of batch2) {
      const config = guideConfig(guide);
      expect(guide.updatedAt).toBe('2026-10-13');
      expect(new Set(guide.routes.map((route) => route.intent))).toEqual(new Set(['cancelar', 'ahorrar']));
      const scope = config.scope?.options.find((option) => option.askChannel)?.id;
      const unknown = parseGuideState(`?cobro=no-se${scope ? `&alcance=${scope}` : ''}`, config);
      expect(unknown.unknown, guide.slug).toBe(true);
      expect(resolveRouteId(unknown, config)).toBeNull();
      expect(guide.faqs.length).toBeGreaterThanOrEqual(5);
    }
    const questions = batch2.flatMap((guide) => guide.faqs.map((faq) => faq.question));
    expect(new Set(questions).size).toBe(questions.length);
  });

  it('las fuentes nuevas conservan la fecha de base y su alcance regional', () => {
    const ids = new Set(batch2.flatMap((guide) => guide.routes.flatMap((route) => route.sourceIds)));
    for (const id of ids) {
      const source = guideSourceById.get(id)!;
      if (source.lastReviewedAt === '2026-10-12') continue;
      expect(source.lastReviewedAt, id).toBe('2026-10-13');
      expect(source.regionalScope, id).toBeDefined();
      expect(source.evidence, id).toBeDefined();
    }
    expect(guideSourceById.get('paramount-ayuda')?.evidence).toBe('indexed_excerpt');
  });

  it('los alias encuentran las plataformas sin mezclarlas', () => {
    const aliases = (slug: string) => [bySlug(slug).name, ...bySlug(slug).aliases];
    expect(matchesAliases('Amazon', aliases('prime-video'))).toBe(true);
    expect(matchesAliases('Prime', aliases('prime-video'))).toBe(true);
    expect(matchesAliases('Apple TV+', aliases('apple-tv'))).toBe(true);
    expect(matchesAliases('appletv', aliases('apple-tv'))).toBe(true);
    expect(matchesAliases('Paramount', aliases('paramount-plus'))).toBe(true);
    expect(matchesAliases('Paramount+', aliases('paramount-plus'))).toBe(true);
    expect(matchesAliases('Crunchyroll', aliases('crunchyroll'))).toBe(true);
    expect(matchesAliases('Mubi', aliases('mubi'))).toBe(true);
    expect(matchesAliases('Amazon', aliases('apple-tv'))).toBe(false);
    expect(matchesAliases('Apple TV', aliases('prime-video'))).toBe(false);
  });
});
