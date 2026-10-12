/** Índice liviano para islas del cliente. Tiene que coincidir con platformGuides (lo controla la validación). */
export const managedPlatforms: { serviceId: string; slug: string; name: string }[] = [
  { serviceId: 'netflix', slug: 'netflix', name: 'Netflix' },
  { serviceId: 'spotify', slug: 'spotify', name: 'Spotify' },
  { serviceId: 'disney-plus', slug: 'disney-plus', name: 'Disney+' },
  { serviceId: 'hbo-max', slug: 'hbo-max', name: 'HBO Max' },
  { serviceId: 'youtube-premium', slug: 'youtube-premium', name: 'YouTube Premium' },
];

export function guideHref(serviceId: string | null | undefined, intent: 'cancelar' | 'ahorrar' = 'cancelar'): string | null {
  const platform = managedPlatforms.find((item) => item.serviceId === serviceId);
  if (!platform) return null;
  return intent === 'ahorrar' ? `/${platform.slug}/cancelar/?objetivo=ahorrar` : `/${platform.slug}/cancelar/`;
}
