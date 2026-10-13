import type { BillingGuide, GuideCta, GuideLink, GuideRoute } from './types';

export const APPLE_SUBSCRIPTIONS: GuideCta = {
  label: 'Abrir en Apple',
  url: 'https://account.apple.com/account/manage/section/subscriptions',
};

export const GOOGLE_PLAY_SUBSCRIPTIONS: GuideCta = {
  label: 'Abrir en Google Play',
  url: 'https://play.google.com/store/account/subscriptions',
};

export const APPLE_GUIDE_HREF = '/guias/cancelar-suscripciones-apple/';
export const GOOGLE_PLAY_GUIDE_HREF = '/guias/cancelar-suscripciones-google-play/';

/** Pasos de Apple en iPhone o iPad para una app concreta. */
export function appleSteps(app: string): string[] {
  return [
    'En el iPhone o iPad, abrí Configuración y tocá tu nombre.',
    'Tocá Suscripciones.',
    `Elegí ${app} y tocá Cancelar suscripción. Puede que tengas que bajar para ver el botón.`,
  ];
}

/** Pasos de Google Play en Android para una app concreta. */
export function googlePlaySteps(app: string): string[] {
  return [
    'En el teléfono o la tablet Android, abrí tus suscripciones en Google Play.',
    `Elegí ${app}.`,
    'Tocá Cancelar suscripción y seguí las instrucciones.',
  ];
}

export const PRIME_VIDEO_SETTINGS: GuideCta = {
  label: 'Abrir mi cuenta de Prime Video',
  url: 'https://www.primevideo.com/settings',
};

export const PRIME_VIDEO_CHANNEL_ROUTE_ID = 'prime-video-cancelar-canal';
export const PRIME_VIDEO_CHANNEL_GUIDE: GuideLink = {
  label: 'Cancelar un canal adicional de Prime Video',
  href: `/prime-video/cancelar/#ruta-${PRIME_VIDEO_CHANNEL_ROUTE_ID}`,
};

/** Pasos para dar de baja un canal que se paga dentro de Prime Video. No tocan la membresía de Prime Video. */
export function primeVideoChannelSteps(channel: string): string[] {
  return [
    'Iniciá sesión en Prime Video y abrí Cuenta y configuración.',
    'En el menú de arriba, elegí Mis suscripciones.',
    `Buscá ${channel} en la lista.`,
    'Elegí Anular suscripción. En algunas pantallas figura como Retirar.',
    'Confirmá la baja.',
  ];
}

export const PRIME_VIDEO_CHANNEL_AFTER = [
  'La pantalla de confirmación muestra hasta qué fecha seguís teniendo el canal. Anotala: Abonito no la calcula.',
  'Hasta esa fecha podés volver atrás desde Mis suscripciones.',
  'No se devuelven los cargos que ya se cobraron.',
  'Dar de baja un canal no cancela Prime Video ni los otros canales que tengas.',
];

export const PRIME_VIDEO_CHANNEL_TROUBLESHOOTING = [
  'Si el canal no figura en Mis suscripciones, no lo pagás dentro de Prime Video: puede cobrártelo el servicio directamente, una tienda de apps u otra empresa. Volvé a elegir quién te cobra.',
  'Si el canal se cobra a través de Apple, cancelalo desde las suscripciones de Apple al menos 24 horas antes de la renovación.',
];

function primeVideoChannelEligibility(service: string): string {
  return `Sólo si ${service} figura como canal en Mis suscripciones de tu cuenta de Prime Video. No confirmamos que hoy se venda así en Argentina.`;
}

/** Ruta condicional para un servicio que la persona confirma pagar como canal de Prime Video. */
export function primeVideoChannelCancelRoute(id: string, service: string, extraBefore: string[] = []): GuideRoute {
  return {
    id,
    intent: 'cancelar',
    channels: ['prime-video'],
    role: null,
    status: 'conditional',
    heading: `Cancelar ${service} si lo pagás como canal de Prime Video`,
    eligibility: primeVideoChannelEligibility(service),
    before: [
      `Esto da de baja sólo el canal ${service}. Tu suscripción a Prime Video sigue igual.`,
      'No uses Finalizar suscripción: esa opción termina Prime Video, no el canal.',
      ...extraBefore,
    ],
    steps: primeVideoChannelSteps(service),
    cta: PRIME_VIDEO_SETTINGS,
    after: PRIME_VIDEO_CHANNEL_AFTER,
    troubleshooting: PRIME_VIDEO_CHANNEL_TROUBLESHOOTING,
    related: [PRIME_VIDEO_CHANNEL_GUIDE],
    sourceIds: ['prime-video-canal'],
  };
}

/** Para pagar menos con un canal de Prime Video sólo se puede revisar la cuenta y quitar lo que no se usa. */
export function primeVideoChannelSaveRoute(id: string, service: string, related: GuideLink[]): GuideRoute {
  return {
    id,
    intent: 'ahorrar',
    channels: ['prime-video'],
    role: null,
    transition: 'inspect_account',
    status: 'conditional',
    heading: `Pagar menos en ${service} si lo pagás como canal de Prime Video`,
    eligibility: primeVideoChannelEligibility(service),
    before: [
      'El precio y las opciones del canal los define Prime Video. No confirmamos un precio del canal para Argentina.',
      `Los planes que ves en la web de ${service} no se aplican a un canal de Prime Video.`,
    ],
    steps: [
      'Iniciá sesión en Prime Video, abrí Cuenta y configuración y elegí Mis suscripciones.',
      `Revisá si seguís usando ${service} y si pagás otros canales que no mirás.`,
      'Si querés dejar de pagar alguno, elegí Anular suscripción y confirmá.',
    ],
    cta: PRIME_VIDEO_SETTINGS,
    after: [
      'El canal sigue activo hasta la fecha que muestra la confirmación.',
      `Si preferís pagarle directo a ${service}, esperá a que termine el canal antes de suscribirte, así no pagás dos veces.`,
    ],
    troubleshooting: PRIME_VIDEO_CHANNEL_TROUBLESHOOTING,
    related: [...related, PRIME_VIDEO_CHANNEL_GUIDE],
    sourceIds: ['prime-video-canal'],
  };
}

export const billingGuides: BillingGuide[] = [
  {
    id: 'apple',
    slug: 'cancelar-suscripciones-apple',
    name: 'Apple',
    h1: 'Cómo cancelar una suscripción que te cobra Apple',
    intro: 'Si te suscribiste desde una app en el iPhone, el iPad o la Mac y el cobro lo hace Apple, la baja se hace en tu cuenta de Apple, no en la app.',
    seo: {
      title: 'Cancelar suscripciones de Apple | Abonito',
      description: 'Cómo cancelar una suscripción cobrada por Apple desde el iPhone, la Mac, la web o Windows, y qué hacer si no la encontrás.',
    },
    cta: APPLE_SUBSCRIPTIONS,
    before: [
      'Entrá con la cuenta de Apple que usaste para suscribirte.',
      'Borrar la app no cancela la suscripción.',
    ],
    sections: [
      {
        heading: 'En el iPhone o el iPad',
        steps: [
          'Abrí Configuración y tocá tu nombre.',
          'Tocá Suscripciones.',
          'Tocá la suscripción.',
          'Tocá Cancelar suscripción. Puede que tengas que bajar para ver el botón.',
        ],
      },
      {
        heading: 'En la Mac',
        steps: [
          'En la App Store, hacé clic en tu nombre, abajo en la barra lateral. Si no aparece, iniciá sesión con tu cuenta de Apple.',
          'En la página que se abre, hacé clic en tu nombre.',
          'Hacé clic en Suscripciones y elegí la que querés cancelar.',
          'Hacé clic en Cancelar suscripción.',
        ],
      },
      {
        heading: 'En la web o en un Android',
        steps: [
          'Entrá a account.apple.com e iniciá sesión con tu cuenta de Apple.',
          'Seguí las instrucciones en pantalla para cancelar la suscripción.',
        ],
        note: 'Si te suscribiste a Apple Music o Apple TV desde Android y te cobra Google Play, la baja se hace en Google Play.',
      },
      {
        heading: 'En una PC con Windows',
        steps: [
          'Abrí la app Apple Music o la app Apple TV.',
          'Hacé clic en tu nombre, abajo en la barra lateral, y elegí Ver mi cuenta.',
          'En Configuración, junto a Suscripciones, hacé clic en Administrar.',
          'Buscá la suscripción, hacé clic en Editar y después en Cancelar suscripción.',
        ],
      },
    ],
    after: [
      'Si no aparece el botón Cancelar o ves un vencimiento en rojo, la suscripción ya está cancelada.',
      'Si estás en una prueba y no querés que se renueve, cancelala al menos 24 horas antes de que termine.',
    ],
    troubleshooting: [
      'Buscá en tu email «recibo de Apple» o «factura de Apple» y fijate qué cuenta de Apple figura. Si es otra cuenta tuya, iniciá sesión con esa.',
      'Si en el recibo figura la cuenta de un familiar, la baja la tiene que hacer esa persona: no podés cancelar la suscripción de otro.',
      'Si la suscripción te llegó por tu compañía de celular u otro proveedor, comunicate con esa empresa.',
      'Si no encontrás ningún recibo de Apple, es probable que te cobre otra empresa. Volvé a la guía de la plataforma y elegí «No sé quién me cobra».',
    ],
    sourceIds: ['apple-cancelar'],
    updatedAt: '2026-10-12',
  },
  {
    id: 'google-play',
    slug: 'cancelar-suscripciones-google-play',
    name: 'Google Play',
    h1: 'Cómo cancelar una suscripción que te cobra Google Play',
    intro: 'Si te suscribiste desde una app en Android y el cobro lo hace Google Play, la baja se hace en Google Play, no en la app.',
    seo: {
      title: 'Cancelar suscripciones de Google Play | Abonito',
      description: 'Cómo cancelar, pausar o cambiar una suscripción cobrada por Google Play desde Android o la computadora.',
    },
    cta: GOOGLE_PLAY_SUBSCRIPTIONS,
    before: [
      'Entrá con la cuenta de Google que tiene la suscripción.',
      'Desinstalar la app no cancela la suscripción.',
    ],
    sections: [
      {
        heading: 'En el teléfono o la tablet Android',
        steps: [
          'Abrí tus suscripciones en Google Play.',
          'Elegí la suscripción que querés cancelar.',
          'Tocá Cancelar suscripción.',
          'Seguí las instrucciones.',
        ],
      },
      {
        heading: 'En la computadora',
        steps: [
          'Entrá a tus suscripciones en play.google.com.',
          'En la suscripción, hacé clic en Administrar.',
          'Hacé clic en Cancelar suscripción.',
          'Elegí un motivo y hacé clic en Continuar.',
        ],
      },
      {
        heading: 'Si sólo querés pausar',
        steps: [
          'En tus suscripciones de Google Play, elegí la suscripción.',
          'Tocá Administrar y después Detener pagos.',
          'Elegí por cuánto tiempo y confirmá.',
        ],
        note: 'No todas las apps permiten pausar. Según la app, la pausa va de una semana a tres meses y empieza al final del período en curso.',
      },
    ],
    after: [
      'Podés seguir usando la suscripción durante el tiempo que ya pagaste.',
      'Si compraste un plan de pagos, cancelar detiene la renovación pero no los pagos que quedan de ese plan.',
      'En algunos casos Google Play permite pedir un reembolso. Depende de su política: no lo des por hecho.',
    ],
    troubleshooting: [
      'Si no ves la suscripción, puede estar en otra cuenta de Google. Probá cambiar de cuenta.',
      'Para cambiar de plan o de período (mensual o anual), abrí la app y elegí el plan nuevo. Sólo funciona si la app lo permite.',
      'Si no está en ninguna cuenta de Google, es probable que te cobre otra empresa. Volvé a la guía de la plataforma y elegí «No sé quién me cobra».',
    ],
    sourceIds: ['google-play-cancelar'],
    updatedAt: '2026-10-12',
  },
];
