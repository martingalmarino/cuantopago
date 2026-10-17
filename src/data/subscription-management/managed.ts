/** Índice liviano para islas del cliente. Tiene que coincidir con platformGuides (lo controla la validación). */
export const managedPlatforms: { serviceId: string; slug: string; name: string }[] = [
  { serviceId: 'netflix', slug: 'netflix', name: 'Netflix' },
  { serviceId: 'spotify', slug: 'spotify', name: 'Spotify' },
  { serviceId: 'disney-plus', slug: 'disney-plus', name: 'Disney+' },
  { serviceId: 'hbo-max', slug: 'hbo-max', name: 'HBO Max' },
  { serviceId: 'youtube-premium', slug: 'youtube-premium', name: 'YouTube Premium' },
  { serviceId: 'prime-video', slug: 'prime-video', name: 'Prime Video' },
  { serviceId: 'apple-tv', slug: 'apple-tv', name: 'Apple TV' },
  { serviceId: 'paramount-plus', slug: 'paramount-plus', name: 'Paramount+' },
  { serviceId: 'crunchyroll', slug: 'crunchyroll', name: 'Crunchyroll' },
  { serviceId: 'mubi', slug: 'mubi', name: 'MUBI' },
  { serviceId: 'google-one', slug: 'google-one', name: 'Google One' },
  { serviceId: 'icloud-plus', slug: 'icloud-plus', name: 'iCloud+' },
  { serviceId: 'dropbox', slug: 'dropbox', name: 'Dropbox' },
  { serviceId: 'microsoft-365', slug: 'microsoft-365', name: 'Microsoft 365' },
  { serviceId: 'canva', slug: 'canva', name: 'Canva' },
  { serviceId: 'playstation-plus', slug: 'playstation-plus', name: 'PlayStation Plus' },
  { serviceId: 'xbox-game-pass', slug: 'xbox-game-pass', name: 'Xbox Game Pass' },
  { serviceId: 'nintendo-switch-online', slug: 'nintendo-switch-online', name: 'Nintendo Switch Online' },
  { serviceId: 'ea-play', slug: 'ea-play', name: 'EA Play' },
  { serviceId: 'geforce-now', slug: 'geforce-now', name: 'GeForce NOW' },
];

export function guideHref(serviceId: string | null | undefined, intent: 'cancelar' | 'ahorrar' = 'cancelar'): string | null {
  const platform = managedPlatforms.find((item) => item.serviceId === serviceId);
  if (!platform) return null;
  return intent === 'ahorrar' ? `/${platform.slug}/cancelar/?objetivo=ahorrar` : `/${platform.slug}/cancelar/`;
}
