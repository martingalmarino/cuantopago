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
const batch4 = ['playstation-plus', 'xbox-game-pass', 'nintendo-switch-online', 'ea-play', 'geforce-now'].map(bySlug);

describe('tanda 4: videojuegos', () => {
  it('usa títulos cortos y voseo sin precios inventados', () => {
    expect(batch4.map((guide) => guide.seo.title)).toEqual([
      'Cómo cancelar PlayStation Plus | Abonito',
      'Cómo cancelar Xbox Game Pass | Abonito',
      'Cómo cancelar Nintendo Switch Online | Abonito',
      'Cómo cancelar EA Play | Abonito',
      'Cómo cancelar GeForce NOW | Abonito',
    ]);
    const copy = text(batch4);
    expect(copy).not.toMatch(/\b(puedes|tienes|quieres|debes|selecciona|haz clic)\b/i);
    expect(copy).not.toMatch(/\$\s?\d|USD\s?\d|ARS\s?\d/);
    expect(copy).not.toMatch(/reembolso garantizado|cancellation_success|cancelación exitosa/i);
    expect(copy).not.toMatch(/usá (una )?VPN|usá VPN|con VPN|cambiá el país de la cuenta/i);
  });

  it('desconoce el cobrador manda a la ayuda de identificación', () => {
    for (const guide of batch4) {
      expect(guide.billerCheck.text.length).toBeGreaterThan(40);
      expect(guide.billerCheck.text).toMatch(/recibo|email|cuenta|SMS/i);
    }
    for (const [slug, search] of [
      ['playstation-plus', '?cobro=no-se'],
      ['xbox-game-pass', '?cobro=no-se'],
      ['geforce-now', '?cobro=no-se'],
      ['ea-play', '?alcance=servicio&cobro=no-se'],
    ] as const) {
      const config = guideConfig(bySlug(slug));
      const unknown = parseGuideState(search, config);
      expect(unknown.unknown, slug).toBe(true);
      expect(resolveRouteId(unknown, config)).toBeNull();
    }
  });

  it('cambiar de cobrador descarta combinaciones incompatibles', () => {
    const ea = guideConfig(bySlug('ea-play'));
    expect(parseGuideState('?alcance=paquete&cobro=directo', ea)).toEqual({
      intent: 'cancelar', channel: null, unknown: false, role: null, scope: 'paquete',
    });
    expect(parseGuideState('?alcance=servicio&cobro=apple', ea).channel).toBeNull();
    const ps = guideConfig(bySlug('playstation-plus'));
    expect(parseGuideState('?cobro=apple', ps).channel).toBeNull();
    expect(parseGuideState('?cobro=google-play', ps).channel).toBeNull();
  });

  it('EA incluido en un paquete no cancela el plan padre en silencio', () => {
    const guide = bySlug('ea-play');
    const bundled = routeFor(guide, '?alcance=paquete');
    expect(bundled?.id).toBe('ea-play-cancelar-paquete');
    expect(bundled?.status).toBe('official_handoff');
    expect(text(bundled)).toMatch(/plan padre|Game Pass/i);
    expect(text(bundled)).toMatch(/No canceles el paquete entero|no cancelamos el plan padre/i);
    expect(bundled?.related?.some((item) => item.href === '/xbox-game-pass/cancelar/')).toBe(true);
    const save = routeFor(guide, '?objetivo=ahorrar&alcance=paquete');
    expect(save?.id).toBe('ea-play-ahorrar-paquete');
    expect(text(save)).toMatch(/plan padre|Game Pass/i);
  });

  it('GeForce NOW separa ABYA de NVIDIA u otro operador', () => {
    const guide = bySlug('geforce-now');
    const abya = routeFor(guide, '?cobro=directo');
    const other = routeFor(guide, '?cobro=externo');
    expect(abya?.cta?.url).toContain('abya.com');
    expect(other?.cta?.url).toContain('nvidia.com');
    expect(abya?.cta?.url).not.toEqual(other?.cta?.url);
    expect(text(abya)).toMatch(/ABYA/);
    expect(text(other)).toMatch(/NVIDIA/);
    expect(text(other)).not.toMatch(/abya\.com\/gfn\/manage/);
  });

  it('Nintendo muestra el aviso de 48 horas en la baja del titular', () => {
    const guide = bySlug('nintendo-switch-online');
    const personal = routeFor(guide, '?rol=titular&alcance=personal');
    const family = routeFor(guide, '?rol=titular&alcance=familia');
    expect(text(personal?.before)).toMatch(/48 horas/);
    expect(text(family?.before)).toMatch(/48 horas/);
    expect(personal?.variants?.map((item) => item.id)).toEqual(['web', 'switch', 'switch-2']);
    const member = routeFor(guide, '?rol=miembro');
    expect(member?.id).toBe('nintendo-switch-online-cancelar-miembro');
    expect(text(member)).toMatch(/no cancela el cobro/i);
    expect(text(member)).not.toMatch(/eliminá tu cuenta|borrá tu cuenta/i);
  });

  it('prepago y renovación apagada no piden activar la renovación', () => {
    const ps = routeFor(bySlug('playstation-plus'), '?cobro=externo');
    expect(text(ps)).toMatch(/Si ya está apagada, no hace falta activarla/);
    expect(text(ps)).not.toMatch(/activá la renovación|Activar facturación periódica para cancelar/i);
    const xbox = routeFor(bySlug('xbox-game-pass'), '?cobro=directo');
    expect(text(xbox?.before)).toMatch(/Activar facturación periódica/);
    expect(text(xbox?.before)).toMatch(/no la actives para cancelar/i);
  });

  it('un clic al sitio oficial no se etiqueta como cancelación exitosa', () => {
    for (const guide of batch4) {
      for (const route of guide.routes) {
        expect(route.cta?.label ?? '').not.toMatch(/cancelé|cancelado con éxito|cancellation success/i);
        expect(text(route.after)).not.toMatch(/ya cancelaste|cancelación confirmada por Abonito/i);
      }
    }
  });

  it('responde a alias de búsqueda del directorio', () => {
    const aliases = (slug: string) => [bySlug(slug).name, ...bySlug(slug).aliases];
    expect(matchesAliases('ps plus', aliases('playstation-plus'))).toBe(true);
    expect(matchesAliases('game pass', aliases('xbox-game-pass'))).toBe(true);
    expect(matchesAliases('nso', aliases('nintendo-switch-online'))).toBe(true);
    expect(matchesAliases('ea play pro', aliases('ea-play'))).toBe(true);
    expect(matchesAliases('abya', aliases('geforce-now'))).toBe(true);
  });
});
