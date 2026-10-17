import { SIMULATOR } from './billing-guides';
import type { GuideCta, GuideVariant, PlatformGuide } from './types';

const BATCH_4_UPDATED = '2026-10-17';
const SAVE_PROOF = 'Guardá el email o la pantalla de confirmación con la fecha de fin.';
const NO_REFUND_PROMISE = 'Cancelar la renovación no garantiza un reembolso.';
const CONFIRM_IN_ACCOUNT = 'Después, volvé a entrar a tu cuenta o a suscripciones y comprobá que la renovación quedó desactivada o que figura la fecha de fin.';
const CARD_IS_NOT_BILLER = 'Ver el nombre de la tarjeta o del procesador de pago no alcanza: necesitás el comercio o la empresa que figura en el recibo o en la suscripción.';
const ABONITO_ORIENTA = 'Abonito te orienta. El cambio se realiza en el sitio del proveedor.';

// PlayStation Plus

const PS_ACCOUNT: GuideCta = { label: 'Administrar mi suscripción', url: 'https://www.playstation.com/acct/management' };
const PS_CHANGE_HELP: GuideCta = { label: 'Ver los pasos oficiales', url: 'https://www.playstation.com/es-ar/support/subscriptions/change-ps-plus/' };
const PS_COMPARE = { label: 'Comparar planes de PlayStation Plus', href: '/playstation-plus/' };

const psCancelVariants: GuideVariant[] = [
  {
    id: 'web',
    label: 'En la web',
    steps: [
      'Iniciá sesión en Administración de cuentas de PlayStation.',
      'Seleccioná Suscripción.',
      'Elegí PlayStation Plus y seleccioná Cancelar debajo de esa suscripción.',
      'Si más adelante querés mantenerla, podés usar Reactivar suscripción mientras siga vigente.',
    ],
  },
  {
    id: 'ps5',
    label: 'En una PS5',
    steps: [
      'Andá a Configuración > Usuarios y cuentas.',
      'Seleccioná Cuenta > Pagos y suscripciones > Suscripciones.',
      'Elegí PlayStation Plus > Cancelar suscripción.',
    ],
  },
  {
    id: 'ps4',
    label: 'En una PS4',
    steps: [
      'Andá a Configuración > Administración de cuentas > Información de la cuenta > Suscripciones.',
      'Elegí PlayStation Plus.',
      'Seleccioná Cancelar suscripción.',
    ],
  },
];

const psChangeVariants: GuideVariant[] = [
  {
    id: 'web',
    label: 'En la web',
    steps: [
      'Iniciá sesión en Administración de cuentas de PlayStation.',
      'Seleccioná Suscripción.',
      'Elegí tu suscripción a PlayStation Plus y después Cambiar plan.',
      'Revisá sólo los niveles y las frecuencias que te muestra tu cuenta y elegí una opción más barata si te conviene.',
    ],
  },
  {
    id: 'ps5',
    label: 'En una PS5',
    steps: [
      'Andá a Configuración > Usuarios y cuentas.',
      'Seleccioná Cuenta > Pago y suscripciones > Suscripciones.',
      'Elegí PlayStation Plus > Cambiar plan.',
      'Elegí un plan y una frecuencia de los que te ofrece la cuenta.',
    ],
  },
  {
    id: 'ps4',
    label: 'En una PS4',
    steps: [
      'Andá a Configuración > Administración de cuentas > Información de la cuenta > Suscripciones a PlayStation.',
      'Elegí PlayStation Plus > Cambiar plan.',
      'Elegí un plan y una frecuencia de los que te ofrece la cuenta.',
    ],
  },
];

const playstationPlus: PlatformGuide = {
  platformId: 'playstation-plus',
  slug: 'playstation-plus',
  name: 'PlayStation Plus',
  providerName: 'PlayStation',
  aliases: ['playstation plus', 'ps plus', 'ps+', 'psplus', 'playstation+', 'sony plus'],
  existingLogoRef: '/brands/playstation.svg',
  catalogHref: '/playstation-plus/',
  h1: 'Cómo cancelar PlayStation Plus o cambiar de plan',
  intro: 'Cancelá la renovación de PlayStation Plus o cambiá de plan desde la cuenta de PlayStation. Jugá en un celular no implica que te cobre Apple o Google Play.',
  seo: {
    title: 'Cómo cancelar PlayStation Plus | Abonito',
    description: 'Pasos para cancelar PlayStation Plus o bajar de plan en la web, PS5 o PS4, y qué hacer si usaste un código prepago.',
  },
  channels: ['directo', 'externo'],
  channelHints: {
    directo: 'Te cobra PlayStation por una suscripción con renovación en tu cuenta.',
    externo: 'Canjeaste un código, cupón o tiempo prepago, o te figura otro comercio en el recibo.',
  },
  roleQuestion: null,
  billerCheck: {
    text: `Buscá el recibo del último cobro de PlayStation Plus en tu email o en el historial de la cuenta. Si dice PlayStation o Sony, elegí PlayStation. Si es un código o cupón, elegí esa opción. ${CARD_IS_NOT_BILLER}`,
    label: 'Abrir Administración de cuentas',
    url: 'https://www.playstation.com/acct/management',
    sourceId: 'ps-plus-cancelar',
  },
  routes: [
    {
      id: 'playstation-plus-cancelar-directo',
      intent: 'cancelar',
      channels: ['directo'],
      role: null,
      status: 'verified',
      heading: 'Cancelar PlayStation Plus si te cobra PlayStation',
      before: [
        'Usá la cuenta de PlayStation que paga la suscripción.',
        'Los juegos comprados por separado no se cancelan con esta baja: sólo los beneficios de la membresía.',
        NO_REFUND_PROMISE,
      ],
      steps: [],
      variants: psCancelVariants,
      cta: PS_ACCOUNT,
      after: [
        'La suscripción se desactiva a partir de la fecha del próximo pago. Hasta entonces seguís con el acceso que ya pagaste.',
        SAVE_PROOF,
        CONFIRM_IN_ACCOUNT,
        ABONITO_ORIENTA,
      ],
      troubleshooting: [
        'Si no ves PlayStation Plus, puede estar en otra cuenta de PlayStation o tratarse de un código prepago.',
        'En la app de PlayStation también podés abrir Administración de suscripciones desde el ícono de PlayStation Store.',
        'Si necesitás más ayuda, usá el artículo oficial de PlayStation.',
      ],
      related: [PS_COMPARE],
      sourceIds: ['ps-plus-cancelar'],
    },
    {
      id: 'playstation-plus-cancelar-externo',
      intent: 'cancelar',
      channels: ['externo'],
      role: null,
      status: 'conditional',
      heading: 'Cancelar si usaste un código o un cupón de PlayStation Plus',
      eligibility: 'Canjear un código no dice por sí solo si la renovación automática quedó activa.',
      before: [
        'Entrá a la cuenta donde canjeaste el código y mirá la fecha de vencimiento y si la renovación está encendida.',
        'No inventamos conversiones de tiempo ni reembolsos por el código.',
      ],
      steps: [
        'Abrí Administración de cuentas de PlayStation e iniciá sesión.',
        'Seleccioná Suscripción y abrí PlayStation Plus.',
        'Revisá la fecha de vencimiento o del próximo cobro y si aparece la opción de cancelar o desactivar la renovación.',
        'Si la renovación está activa y querés que no se cobren más, cancelala. Si ya está apagada, no hace falta activarla.',
      ],
      cta: PS_ACCOUNT,
      after: [
        'El tiempo prepago sigue hasta la fecha que muestra la cuenta.',
        SAVE_PROOF,
        CONFIRM_IN_ACCOUNT,
      ],
      troubleshooting: [
        'Si el recibo es de otra empresa y no de PlayStation, gestioná la baja con esa empresa.',
        'Si no queda claro, abrí la ayuda oficial de PlayStation.',
      ],
      related: [PS_COMPARE],
      sourceIds: ['ps-plus-cancelar'],
    },
    {
      id: 'playstation-plus-ahorrar-directo',
      intent: 'ahorrar',
      channels: ['directo'],
      role: null,
      transition: 'next_cycle',
      status: 'verified',
      heading: 'Pagar menos en PlayStation Plus',
      before: [
        'Elegí sólo un nivel y una frecuencia que tu cuenta muestre de verdad. No uses precios de ejemplo de otros países.',
        'No cambies el país de la cuenta ni uses VPN para conseguir otro catálogo.',
      ],
      steps: [],
      variants: psChangeVariants,
      cta: PS_ACCOUNT,
      after: [
        'Si bajás de nivel, el cambio rige en la próxima fecha de pago. Ahí perdés los beneficios exclusivos del plan anterior.',
        'Una mejora puede cobrar un ajuste proporcional: la cuenta lo muestra antes de confirmar.',
        CONFIRM_IN_ACCOUNT,
      ],
      troubleshooting: [
        'Si no ves Cambiar plan, tu cuenta puede no ofrecer otro nivel ahora. Revisá la ayuda oficial.',
        'Pagar por más meses no es bajar de plan: puede salir menos por mes, pero pagás por adelantado.',
      ],
      related: [PS_COMPARE, SIMULATOR],
      sourceIds: ['ps-plus-cambiar'],
    },
    {
      id: 'playstation-plus-ahorrar-externo',
      intent: 'ahorrar',
      channels: ['externo'],
      role: null,
      transition: 'inspect_account',
      status: 'conditional',
      heading: 'Pagar menos si el tiempo viene de un código',
      eligibility: 'Las opciones dependen de lo que muestre la cuenta después del canje.',
      before: ['Primero confirmá en Suscripción qué plan tenés y hasta cuándo.'],
      steps: [
        'Abrí Administración de cuentas > Suscripción > PlayStation Plus.',
        'Si aparece Cambiar plan, revisá las opciones reales de tu cuenta.',
        'Si sólo ves la fecha de fin, esperá a que termine el tiempo prepago o consultá la ayuda oficial antes de comprar otra cosa.',
      ],
      cta: PS_CHANGE_HELP,
      after: ['No prometemos un plan más barato inmediato después de un código.'],
      troubleshooting: ['Si te cobra otra empresa el recibo, las opciones las define esa empresa.'],
      related: [PS_COMPARE],
      sourceIds: ['ps-plus-cambiar'],
    },
  ],
  faqs: [
    { question: '¿Sigo usando PlayStation Plus después de cancelar?', answer: 'Sí, hasta la fecha del próximo pago. Después se desactiva.' },
    { question: '¿Se borran los juegos que compré?', answer: 'No. Cancelar la membresía no da de baja los juegos comprados por separado. Sí perdés los beneficios del catálogo y del online que dependen de Plus.' },
    { question: '¿Puedo cancelar desde el celular?', answer: 'Sí, desde la app de PlayStation o desde la web. Eso no significa que te cobre Apple o Google Play.' },
    { question: '¿Qué hago con un cupón?', answer: 'Canjealo en la cuenta correcta y después mirá en Suscripción si la renovación quedó activa. El canje no alcanza para saberlo.' },
  ],
  updatedAt: BATCH_4_UPDATED,
};

// Xbox Game Pass

const MS_SERVICES: GuideCta = { label: 'Administrar mi suscripción', url: 'https://account.microsoft.com/services' };
const MS_CANCEL_HELP: GuideCta = { label: 'Ver los pasos oficiales', url: 'https://support.microsoft.com/es-es/accounts-billing/subscriptions/cancel-your-microsoft-subscription' };
const XBOX_COMPARE = { label: 'Comparar planes de Xbox Game Pass', href: '/xbox-game-pass/' };
const XBOX_PLANS_NOTE = 'Los nombres y beneficios de cada plan (PC, consola, multijugador online, juegos en la nube) los muestra tu cuenta o la página oficial. No inventamos qué plan podés bajar ahora.';

const xboxGamePass: PlatformGuide = {
  platformId: 'xbox-game-pass',
  slug: 'xbox-game-pass',
  name: 'Xbox Game Pass',
  providerName: 'Microsoft',
  aliases: ['xbox game pass', 'game pass', 'xbox gamepass', 'pc game pass', 'game pass ultimate'],
  existingLogoRef: '/brands/xbox.png',
  catalogHref: '/xbox-game-pass/',
  h1: 'Cómo cancelar Xbox Game Pass o pagar menos',
  intro: 'Desactivá la facturación periódica o revisá un plan más barato según quién te cobra: Microsoft, un operador, un código o otra empresa.',
  seo: {
    title: 'Cómo cancelar Xbox Game Pass | Abonito',
    description: 'Cómo cancelar Xbox Game Pass o cambiar de plan en la cuenta de Microsoft, y qué hacer si te cobra un operador o un código.',
  },
  channels: ['directo', 'externo'],
  channelHints: {
    directo: 'Te cobra Microsoft o Xbox con tu cuenta Microsoft.',
    externo: 'Te lo cobra un operador, un código o regalo, o otra empresa.',
  },
  roleQuestion: null,
  billerCheck: {
    text: `Buscá el recibo o el SMS del cobro. Si dice Microsoft o Xbox, elegí Microsoft. Si es un operador, un código o un regalo, elegí esa opción. ${CARD_IS_NOT_BILLER}`,
    label: 'Abrir Servicios de Microsoft',
    url: 'https://account.microsoft.com/services',
    sourceId: 'xbox-ms-cancelar',
  },
  routes: [
    {
      id: 'xbox-game-pass-cancelar-directo',
      intent: 'cancelar',
      channels: ['directo'],
      role: null,
      status: 'verified',
      heading: 'Cancelar Game Pass si te cobra Microsoft',
      before: [
        'Iniciá sesión con la cuenta Microsoft que compró Game Pass.',
        'Si ves «Activar facturación periódica» en lugar de Administrar, la renovación ya está apagada: no la actives para cancelar. Seguí usando el servicio hasta la fecha de vencimiento que muestra la cuenta.',
        'Distinguí la fecha de vencimiento de la fecha del próximo cobro antes de confirmar.',
      ],
      steps: [
        'Entrá a account.microsoft.com/services e iniciá sesión.',
        'Buscá Xbox Game Pass (o el nombre exacto del plan que figura) y seleccioná Administrar.',
        'Si tu objetivo es que no se renueve, usá Desactivar la facturación periódica cuando la cuenta lo ofrezca.',
        'Si aparecen otras opciones de cancelación, leé la fecha desde la que rige el cambio antes de confirmar.',
        'Seguí las pantallas hasta el final y guardá la confirmación.',
      ],
      cta: MS_SERVICES,
      after: [
        'Con la facturación periódica desactivada, mantenés el acceso hasta el final del período ya pago.',
        SAVE_PROOF,
        CONFIRM_IN_ACCOUNT,
        ABONITO_ORIENTA,
      ],
      troubleshooting: [
        'Si la suscripción no aparece, puede estar en otra cuenta Microsoft o cobrártela un operador o un código.',
        'Si la compraste en Apple o Google Play, cancelala en esa tienda, no en la cuenta Microsoft.',
        'Si no podés completar la baja, usá la ayuda oficial de Microsoft.',
      ],
      related: [XBOX_COMPARE],
      sourceIds: ['xbox-ms-cancelar', 'xbox-game-pass-planes'],
    },
    {
      id: 'xbox-game-pass-cancelar-externo',
      intent: 'cancelar',
      channels: ['externo'],
      role: null,
      status: 'official_handoff',
      heading: 'Cancelar Game Pass si te cobra un operador, un código u otra empresa',
      before: [
        'Microsoft no gestiona el cobro de un operador ni de todos los códigos: tenés que ir a quien te factura.',
        'Un código o regalo puede o no renovarse: mirá en el mensaje del canje o en la cuenta si hay renovación.',
      ],
      steps: [
        'Identificá en el recibo, SMS o email el nombre del operador, tienda o comercio.',
        'Entrá a la ayuda o a la cuenta de esa empresa y buscá la suscripción de Game Pass o Xbox.',
        'Si es un código en tu cuenta Microsoft, abrí Servicios y suscripciones y comprobá si hay renovación activa antes de asumir que no se cobra más.',
        'No desactives otras suscripciones de Microsoft que sí uses.',
      ],
      cta: MS_CANCEL_HELP,
      after: ['La fecha de fin y el reembolso, si existen, los define quien te cobra.', SAVE_PROOF],
      troubleshooting: [
        'Si al final el plan figura en account.microsoft.com/services, volvé a elegir Microsoft como quien te cobra.',
        'No encontramos un menú único para todos los operadores argentinos: usá la ayuda de tu proveedor.',
      ],
      related: [XBOX_COMPARE],
      sourceIds: ['xbox-ms-cancelar', 'xbox-game-pass-planes'],
    },
    {
      id: 'xbox-game-pass-ahorrar-directo',
      intent: 'ahorrar',
      channels: ['directo'],
      role: null,
      transition: 'inspect_account',
      status: 'conditional',
      heading: 'Pagar menos en Game Pass si te cobra Microsoft',
      eligibility: 'Cambiar de plan depende de las opciones que muestre tu cuenta ahora.',
      before: [XBOX_PLANS_NOTE, 'Ultimate puede incluir EA Play: bajar de plan puede afectar ese beneficio.'],
      steps: [
        'Entrá a account.microsoft.com/services con la cuenta que paga.',
        'Abrí Administrar junto a Game Pass.',
        'Revisá si ofrece cambiar de plan o de opciones de pago.',
        'Compará PC, consola, multijugador online y juegos en la nube según lo que uses de verdad.',
        'Leé la fecha de vigencia y cualquier conversión antes de confirmar.',
      ],
      cta: MS_SERVICES,
      after: ['Si no hay un plan más barato disponible ahora, podés desactivar la renovación y elegir otro plan al vencer.', CONFIRM_IN_ACCOUNT],
      troubleshooting: [
        'No copies nombres viejos de planes: usá los que ves en la cuenta o en xbox.com.',
        'Si no aparece cambiar de plan, la cuenta puede no permitir el cambio inmediato.',
      ],
      related: [XBOX_COMPARE, SIMULATOR, { label: 'Cómo cancelar EA Play', href: '/ea-play/cancelar/' }],
      sourceIds: ['xbox-ms-cambiar', 'xbox-game-pass-planes'],
    },
    {
      id: 'xbox-game-pass-ahorrar-externo',
      intent: 'ahorrar',
      channels: ['externo'],
      role: null,
      transition: 'inspect_account',
      status: 'official_handoff',
      heading: 'Pagar menos si Game Pass te lo cobra otra empresa',
      before: ['Las opciones de plan las define quien te factura, no siempre Microsoft.'],
      steps: [
        'Identificá al operador o comercio del recibo.',
        'Consultá en su ayuda o app qué planes ofrece y desde cuándo rige un cambio.',
        'Si el plan también aparece en tu cuenta Microsoft, revisá ahí la fecha de fin sin activar la renovación.',
      ],
      cta: MS_CANCEL_HELP,
      after: ['No prometemos un downgrade inmediato en planes de terceros.'],
      troubleshooting: ['Si Microsoft te muestra el plan en Servicios, volvé a elegir Microsoft.'],
      related: [XBOX_COMPARE],
      sourceIds: ['xbox-game-pass-planes'],
    },
  ],
  faqs: [
    { question: '¿Qué significa «Activar facturación periódica»?', answer: 'Que la renovación automática ya está apagada. No hace falta tocarla para cancelar: el plan vence en la fecha mostrada.' },
    { question: '¿Pierdo los juegos al cancelar?', answer: 'Dejás de acceder a la biblioteca de Game Pass cuando expire la suscripción. Los juegos comprados por separado son otra licencia.' },
    { question: '¿Ultimate incluye EA Play?', answer: 'En la ficha de Abonito y en la página oficial se indica ese solapamiento. Si bajás de plan, revisá si seguís teniendo EA Play.' },
    { question: '¿Me sirve cancelar en la consola?', answer: 'Microsoft también permite gestionar suscripciones desde la consola. Acá priorizamos la cuenta web porque los menús de consola no los pudimos leer en la ayuda de Xbox.' },
  ],
  updatedAt: BATCH_4_UPDATED,
};

// Nintendo Switch Online

const NINTENDO_PORTAL: GuideCta = { label: 'Administrar mi suscripción', url: 'https://accounts.nintendo.com/portal' };
const NINTENDO_CANCEL_HELP: GuideCta = { label: 'Ver los pasos oficiales', url: 'https://es-americas-support.nintendo.com/app/answers/detail/a_id/24803/' };
const NINTENDO_CHANGE_HELP: GuideCta = { label: 'Ver los pasos oficiales', url: 'https://es-americas-support.nintendo.com/app/answers/detail/a_id/24804/' };
const NINTENDO_COMPARE = { label: 'Comparar Nintendo Switch Online', href: '/nintendo-switch-online/' };
const NINTENDO_48H = 'Nintendo pide desactivar la renovación automática al menos 48 horas antes de que termine la membresía. Si queda menos tiempo, revisá el estado de la renovación y la ayuda oficial: no garantizamos evitar el próximo cobro.';

const nintendoCancelVariants: GuideVariant[] = [
  {
    id: 'web',
    label: 'En la web',
    steps: [
      'Entrá a accounts.nintendo.com/portal e iniciá sesión con la cuenta que compró la membresía.',
      'Seleccioná Nintendo Switch Online.',
      'En Suscripción activa, elegí Cancela tu suscripción desactivando la renovación automática.',
      'Confirmá para desactivar la renovación.',
    ],
  },
  {
    id: 'switch',
    label: 'En Nintendo Switch',
    steps: [
      'Abrí Nintendo eShop desde el menú HOME.',
      'Seleccioná la cuenta que compró el plan.',
      'Tocá tu ícono arriba a la derecha.',
      'Resaltá Nintendo Switch Online a la izquierda y elegí Cancelar la suscripción al desactivar la renovación automática.',
    ],
  },
  {
    id: 'switch-2',
    label: 'En Nintendo Switch 2',
    steps: [
      'Abrí Nintendo eShop desde el menú HOME.',
      'Seleccioná la cuenta que compró el plan.',
      'Tocá tu ícono arriba a la derecha.',
      'Bajá y elegí Cancela tu suscripción desactivando la renovación automática.',
    ],
  },
];

const nintendoSwitchOnline: PlatformGuide = {
  platformId: 'nintendo-switch-online',
  slug: 'nintendo-switch-online',
  name: 'Nintendo Switch Online',
  providerName: 'Nintendo',
  aliases: ['nintendo switch online', 'nso', 'nintendo online', 'switch online', 'paquete de expansión', 'expansion pack'],
  existingLogoRef: '/brands/nintendo.png',
  catalogHref: '/nintendo-switch-online/',
  h1: 'Cómo cancelar Nintendo Switch Online o cambiar de plan',
  intro: 'Desactivá la renovación automática de Nintendo Switch Online. Quien compró la membresía es quien la gestiona; un familiar beneficiario no cancela el cobro.',
  seo: {
    title: 'Cómo cancelar Nintendo Switch Online | Abonito',
    description: 'Cómo desactivar la renovación de Nintendo Switch Online en la web o en la consola, con el aviso de 48 horas y qué pasa en familia.',
  },
  channels: ['directo'],
  channelHints: {
    directo: 'La membresía está en una Cuenta Nintendo y la renovación la gestiona Nintendo.',
  },
  roleQuestion: {
    legend: '¿Compraste vos la membresía?',
    options: [
      { id: 'titular', label: 'Sí, la pagué yo', hint: 'Sos quien compró el plan individual o familiar.' },
      { id: 'miembro', label: 'No, me la comparte la familia', hint: 'Usás el plan de otra persona del grupo familiar.' },
    ],
  },
  scopeQuestion: {
    legend: '¿Qué tipo de membresía es?',
    intents: ['cancelar', 'ahorrar'],
    options: [
      { id: 'personal', label: 'Individual', hint: 'Cubre una Cuenta Nintendo.', askChannel: false },
      { id: 'familia', label: 'Familiar', hint: 'Cubre el grupo familiar (hasta 8 personas).', askChannel: false },
    ],
  },
  billerCheck: {
    text: 'La membresía de Nintendo Switch Online se gestiona en la Cuenta Nintendo que la compró. Si no sabés cuál es, pedile a quien paga que revise accounts.nintendo.com/portal.',
    label: 'Abrir la Cuenta Nintendo',
    url: 'https://accounts.nintendo.com/portal',
    sourceId: 'nintendo-cancelar',
  },
  routes: [
    {
      id: 'nintendo-switch-online-cancelar-personal',
      intent: 'cancelar',
      channels: [],
      role: 'titular',
      scope: 'personal',
      status: 'verified',
      heading: 'Desactivar la renovación de una membresía individual',
      before: [
        NINTENDO_48H,
        'Cancelar acá significa apagar la renovación automática. Seguis con el servicio hasta que termine el período pago.',
        'La copia de seguridad en la nube deja de estar disponible cuando termina la membresía. Los datos guardados en la consola siguen. Nintendo habla de un plazo para recuperar nubes si volvés a suscribirte: consultá la ayuda oficial para el detalle actual.',
        'El Paquete de expansión y la membresía estándar se distinguen en la cuenta: desactivá la renovación del plan que figue activo.',
      ],
      steps: [],
      variants: nintendoCancelVariants,
      cta: NINTENDO_PORTAL,
      after: [
        'Una vez desactivada, la renovación no se puede volver a encender en esa suscripción: habría que comprar de nuevo más adelante.',
        SAVE_PROOF,
        CONFIRM_IN_ACCOUNT,
        ABONITO_ORIENTA,
      ],
      troubleshooting: [
        'Si no ves la opción, comprobá que estés en la cuenta compradora.',
        'Si quedan menos de 48 horas, revisá ya el estado y contactá la ayuda de Nintendo si el cobro ya está en camino.',
      ],
      related: [NINTENDO_COMPARE],
      sourceIds: ['nintendo-cancelar', 'nintendo-faq'],
    },
    {
      id: 'nintendo-switch-online-cancelar-familia',
      intent: 'cancelar',
      channels: [],
      role: 'titular',
      scope: 'familia',
      status: 'verified',
      heading: 'Desactivar la renovación de una membresía familiar',
      before: [
        NINTENDO_48H,
        'Cuando termine la membresía familiar, el resto del grupo también pierde el servicio.',
        'No borres la Cuenta Nintendo ni saques a alguien del grupo como sustituto de apagar la renovación: eso no cancela el cobro de quien paga.',
      ],
      steps: [],
      variants: nintendoCancelVariants,
      cta: NINTENDO_PORTAL,
      after: [
        'Avisá a las otras personas del grupo la fecha de fin.',
        SAVE_PROOF,
        CONFIRM_IN_ACCOUNT,
      ],
      troubleshooting: [
        'Sólo la cuenta que compró el plan familiar puede desactivar la renovación.',
        'Si un miembro quiere dejar de usar el servicio sin cancelar el cobro, eso es otra conversación con quien paga.',
      ],
      related: [NINTENDO_COMPARE],
      sourceIds: ['nintendo-cancelar', 'nintendo-faq'],
    },
    {
      id: 'nintendo-switch-online-cancelar-miembro',
      intent: 'cancelar',
      channels: [],
      role: 'miembro',
      status: 'official_handoff',
      heading: 'Si usás el plan de otra persona',
      before: [
        'Quien compró la membresía es quien puede desactivar la renovación.',
        'Salir del grupo familiar o borrar tu cuenta no cancela el cobro de esa persona.',
      ],
      steps: [
        'Pedile a quien paga que desactive la renovación desde su Cuenta Nintendo o la eShop.',
        'Si sólo querés dejar de usar el servicio, hablalo con esa persona: no hace falta eliminar tu cuenta.',
      ],
      cta: NINTENDO_CANCEL_HELP,
      after: ['Mientras la membresía familiar siga activa, podés seguir usando el servicio si seguís en el grupo.'],
      troubleshooting: ['Si vos pagás el plan, volvé a elegir que la compraste vos.'],
      related: [NINTENDO_COMPARE],
      sourceIds: ['nintendo-cancelar'],
    },
    {
      id: 'nintendo-switch-online-ahorrar-personal',
      intent: 'ahorrar',
      channels: [],
      role: 'titular',
      scope: 'personal',
      transition: 'inspect_account',
      status: 'conditional',
      heading: 'Cambiar un plan individual de Nintendo Switch Online',
      eligibility: 'No hay un cambio automático para todos los casos. Algunas bajadas exigen esperar al fin del período.',
      before: [
        'Individual vs familiar y estándar vs Paquete de expansión son dimensiones distintas.',
        'No compres otra membresía encima sin leer si tu cuenta lo permite: a veces no se puede o quedan dos planes a la vez.',
      ],
      steps: [
        'Abrí el artículo oficial sobre cambiar un plan de membresía.',
        'Elegí el plan que tenés ahora y el que querés.',
        'Si Nintendo indica que hay que esperar al fin del período, desactivá antes la renovación automática para que no se renueve el plan caro.',
        'Si ofrece un cambio con descuento por días restantes (por ejemplo a familiar o a Paquete de expansión), seguí sólo esa pantalla oficial: no usamos montos de ejemplo de la ayuda.',
      ],
      cta: NINTENDO_CHANGE_HELP,
      after: ['Confirmá en la cuenta qué plan quedó activo y la fecha de renovación.'],
      troubleshooting: [
        'Si ya estás en una membresía familiar, no podés comprar una individual encima.',
        'Los códigos de descarga tienen reglas propias: pueden fallar o no combinar planes.',
      ],
      related: [NINTENDO_COMPARE, SIMULATOR],
      sourceIds: ['nintendo-cambiar', 'nintendo-comprar'],
    },
    {
      id: 'nintendo-switch-online-ahorrar-familia',
      intent: 'ahorrar',
      channels: [],
      role: 'titular',
      scope: 'familia',
      transition: 'inspect_account',
      status: 'conditional',
      heading: 'Cambiar un plan familiar de Nintendo Switch Online',
      eligibility: 'Pasar de familiar o de Paquete de expansión familiar a otro plan suele exigir esperar a que termine el actual.',
      before: [
        'Si compraste el plan familiar, en varios casos Nintendo indica esperar a que acabe para comprar otro.',
        'Desactivá la renovación si no querés que se renueve el plan actual.',
      ],
      steps: [
        'Abrí la ayuda oficial de cambio de plan y seguí el caso familiar que te corresponde.',
        'Si la opción es esperar al fin del período, desactivá la renovación ahora.',
        'Avisá al grupo familiar qué va a pasar cuando termine.',
      ],
      cta: NINTENDO_CHANGE_HELP,
      after: ['No prometemos un downgrade inmediato desde familiar o Expansion Pack.'],
      troubleshooting: ['Si alguien del grupo compró el plan, esa persona es quien debe gestionar el cambio.'],
      related: [NINTENDO_COMPARE],
      sourceIds: ['nintendo-cambiar'],
    },
    {
      id: 'nintendo-switch-online-ahorrar-miembro',
      intent: 'ahorrar',
      channels: [],
      role: 'miembro',
      transition: 'inspect_account',
      status: 'official_handoff',
      heading: 'Pagar menos si no sos quien compra el plan',
      before: ['Los cambios de plan los hace quien paga.'],
      steps: [
        'Pedile a quien administra el grupo familiar que revise la ayuda oficial de cambio de plan.',
        'No compres otra membresía por tu cuenta sin comprobar elegibilidad: si ya estás en un familiar, no podés pasar a individual así nomás.',
      ],
      cta: NINTENDO_CHANGE_HELP,
      after: ['Si querés un plan propio, puede hacer falta salir del grupo y esperar o comprar cuando Nintendo lo permita.'],
      troubleshooting: ['Si vos pagás, volvé a elegir que compraste la membresía.'],
      related: [NINTENDO_COMPARE],
      sourceIds: ['nintendo-cambiar', 'nintendo-comprar'],
    },
  ],
  faqs: [
    { question: '¿Qué son las 48 horas?', answer: 'Nintendo indica desactivar la renovación al menos 48 horas antes del fin de la membresía. Si queda menos, revisá el estado y la ayuda oficial.' },
    { question: '¿Se borran mis partidas al cancelar?', answer: 'No se borran los guardados locales de la consola. La copia en la nube deja de estar disponible cuando termina la membresía.' },
    { question: '¿Puedo bajar del Paquete de expansión ya?', answer: 'No siempre. En varios casos hay que esperar al fin del período. Usá el artículo oficial de cambio de plan para tu caso.' },
    { question: '¿Puedo salir del grupo familiar para cancelar?', answer: 'Salir del grupo no cancela el cobro de quien paga. Sólo deja de darte acceso a vos.' },
  ],
  updatedAt: BATCH_4_UPDATED,
};

// EA Play

const EA_MEMBERSHIP: GuideCta = { label: 'Administrar mi suscripción', url: 'https://myaccount.ea.com/am/ui/subscription-membership?locale=es' };
const EA_CANCEL_HELP: GuideCta = { label: 'Ver los pasos oficiales', url: 'https://help.ea.com/es/articles/ea-account/how-to-cancel-ea-play/' };
const EA_MANAGE_HELP: GuideCta = { label: 'Ver los pasos oficiales', url: 'https://help.ea.com/es/articles/ea-account/manage-ea-play-on-pc-membership/' };
const EA_COMPARE = { label: 'Comparar EA Play', href: '/ea-play/' };
const GAME_PASS_GUIDE = { label: 'Cancelar o cambiar Xbox Game Pass', href: '/xbox-game-pass/cancelar/' };

const eaPlay: PlatformGuide = {
  platformId: 'ea-play',
  slug: 'ea-play',
  name: 'EA Play',
  providerName: 'EA',
  aliases: ['ea play', 'ea play pro', 'electronic arts play', 'ea+'],
  existingLogoRef: '/brands/ea.svg',
  catalogHref: '/ea-play/',
  h1: 'Cómo cancelar EA Play o cambiar de plan',
  intro: 'EA Play se cancela donde lo contrataste: EA app, Steam, Epic, PlayStation, Microsoft o dentro de otro plan como Game Pass. No mezcles esos caminos.',
  seo: {
    title: 'Cómo cancelar EA Play | Abonito',
    description: 'Cómo cancelar EA Play según si lo pagás en EA, Steam, Epic, PlayStation, Xbox o si viene con Game Pass.',
  },
  channels: ['directo', 'playstation', 'externo'],
  channelHints: {
    directo: 'Lo contrataste en la EA app o en la Cuenta EA en la PC.',
    playstation: 'Lo compraste en PlayStation Store o dentro de un juego en PlayStation.',
    externo: 'Lo pagás en Steam, Epic o Microsoft/Xbox por separado, o no estás seguro cuál de esos es.',
  },
  roleQuestion: null,
  scopeQuestion: {
    legend: '¿EA Play lo pagás aparte o viene incluido?',
    intents: ['cancelar', 'ahorrar'],
    options: [
      { id: 'servicio', label: 'Lo pago aparte', hint: 'Hay un cobro de EA Play en EA, Steam, Epic, PlayStation o Microsoft.', askChannel: true },
      { id: 'paquete', label: 'Viene con otro plan', hint: 'Por ejemplo con un Xbox Game Pass que lo incluye.', askChannel: false },
    ],
  },
  billerCheck: {
    text: `Revisá el recibo o la tienda donde te uniste a EA Play. También podés abrir la Cuenta EA en Membresías y suscripciones: si no ves la membresía ahí, suele estar en Steam, Epic, PlayStation o Microsoft. ${CARD_IS_NOT_BILLER}`,
    label: 'Abrir Membresías de EA',
    url: 'https://myaccount.ea.com/am/ui/subscription-membership?locale=es',
    sourceId: 'ea-play-cancelar',
  },
  routes: [
    {
      id: 'ea-play-cancelar-directo',
      intent: 'cancelar',
      channels: ['directo'],
      role: null,
      scope: 'servicio',
      status: 'verified',
      heading: 'Cancelar EA Play si lo pagás en la Cuenta EA',
      before: [
        'Usá la misma Cuenta EA con la que te uniste.',
        'Al cancelar seguís con los beneficios hasta el fin del período. Después no podés jugar los títulos de The Play List salvo que los hayas comprado aparte o te vuelvas a unir.',
        'Tener el juego instalado no significa que la membresía siga activa.',
      ],
      steps: [
        'Entrá a tu Cuenta EA e iniciá sesión.',
        'Abrí la pestaña Membresías y suscripciones.',
        'En Tu membresía, seleccioná Cancelar membresía.',
        'En la página que se abre, confirmá otra vez Cancelar membresía.',
      ],
      cta: EA_MEMBERSHIP,
      after: [
        'La próxima fecha de facturación aparece en la información de facturación de EA Play.',
        'Hasta esa fecha podés revertir la cancelación según lo que muestre la cuenta.',
        SAVE_PROOF,
        CONFIRM_IN_ACCOUNT,
        ABONITO_ORIENTA,
      ],
      troubleshooting: [
        'Si te uniste por Steam o Epic, no vas a ver la membresía acá: volvé a elegir quién te cobra.',
        'Los reembolsos de EA Play no son la regla: EA indica que en general no se reembolsan.',
      ],
      related: [EA_COMPARE],
      sourceIds: ['ea-play-cancelar', 'ea-play-gestionar'],
    },
    {
      id: 'ea-play-cancelar-playstation',
      intent: 'cancelar',
      channels: ['playstation'],
      role: null,
      scope: 'servicio',
      status: 'verified',
      heading: 'Cancelar EA Play si te lo cobra PlayStation',
      before: [
        'Cancelá sólo la suscripción de EA Play, no PlayStation Plus ni otras.',
        'Usá la cuenta de PlayStation que compró EA Play.',
      ],
      steps: [
        'Iniciá sesión en Administración de cuentas de PlayStation.',
        'Seleccioná Suscripción.',
        'Buscá EA Play y desactivá la renovación automática o cancelá esa suscripción.',
      ],
      cta: PS_ACCOUNT,
      after: [
        'Seguís con el acceso hasta el fin del período pago, salvo que PlayStation cancele de inmediato por soporte.',
        SAVE_PROOF,
        CONFIRM_IN_ACCOUNT,
      ],
      troubleshooting: [
        'También podés hacerlo en PS5 o PS4 desde Pagos y suscripciones, eligiendo EA Play.',
        'Precios y códigos de PlayStation se resuelven con el soporte de PlayStation.',
      ],
      related: [EA_COMPARE, PS_COMPARE],
      sourceIds: ['ea-play-cancelar', 'ps-plus-cancelar'],
    },
    {
      id: 'ea-play-cancelar-externo',
      intent: 'cancelar',
      channels: ['externo'],
      role: null,
      scope: 'servicio',
      status: 'official_handoff',
      heading: 'Cancelar EA Play en Steam, Epic o Microsoft',
      before: [
        'EA no cancela por vos las compras hechas en Steam, Epic o Xbox: tenés que usar esa tienda.',
        'Si lo pagás en Microsoft, elegí sólo EA Play: no canceles todo Game Pass ni otras suscripciones.',
      ],
      steps: [
        'Identificá en el recibo si el comercio es Steam, Epic Games o Microsoft.',
        'Si es Steam, abrí la ayuda de Steam (help.steampowered.com) y gestioná la suscripción desde tu cuenta de Steam.',
        'Si es Epic, abrí la ayuda de Epic (epicgames.com/help) y pedí cancelar la membresía ahí.',
        'Si es Microsoft o Xbox, entrá a account.microsoft.com/services, abrí Administrar junto a EA Play y cancelá esa membresía.',
      ],
      cta: EA_CANCEL_HELP,
      after: ['Guardá la confirmación de la tienda que te cobra.', CONFIRM_IN_ACCOUNT],
      troubleshooting: [
        'Si la membresía aparece en la Cuenta EA, volvé a elegir EA app.',
        'Los enlaces de Steam y Epic que publica EA son las puertas de entrada oficiales; los menús exactos pueden cambiar.',
      ],
      related: [EA_COMPARE, GAME_PASS_GUIDE],
      sourceIds: ['ea-play-cancelar'],
    },
    {
      id: 'ea-play-cancelar-paquete',
      intent: 'cancelar',
      channels: [],
      role: null,
      scope: 'paquete',
      status: 'official_handoff',
      heading: 'EA Play viene incluido en otro plan',
      before: [
        'Si EA Play llega con Xbox Game Pass u otro paquete, la decisión es sobre ese plan padre.',
        'Cancelar el paquete afecta todos sus beneficios, no sólo EA Play.',
        'Puede coexistir un cobro aparte de EA Play con el beneficio del paquete: revisá ambos en tus cuentas.',
      ],
      steps: [
        'Confirmá en tu recibo o en la cuenta si hay un cobro aparte de EA Play además del Game Pass u otro plan.',
        'Si sólo viene incluido, gestioná el plan padre. Para Game Pass, usá la guía de Xbox Game Pass.',
        'No canceles el paquete entero si sólo querías revisar EA Play y el resto del plan te sirve.',
      ],
      cta: EA_CANCEL_HELP,
      after: ['Abonito no cancela el plan padre por este enlace: te lleva a orientarte.'],
      troubleshooting: [
        'Si tenés un cobro aparte de EA Play, volvé a elegir «Lo pago aparte».',
        'Ultimate y otros planes pueden incluir EA Play: mirá la ficha de Game Pass en Abonito.',
      ],
      related: [GAME_PASS_GUIDE, EA_COMPARE],
      sourceIds: ['ea-play-cancelar', 'xbox-game-pass-planes'],
    },
    {
      id: 'ea-play-ahorrar-directo',
      intent: 'ahorrar',
      channels: ['directo'],
      role: null,
      scope: 'servicio',
      transition: 'inspect_account',
      status: 'conditional',
      heading: 'Pagar menos en EA Play desde la Cuenta EA',
      eligibility: 'Bajar de EA Play Pro a EA Play es un escenario de PC con Cuenta EA.',
      before: [
        'En Membresías y suscripciones podés ver si tenés EA Play o EA Play Pro.',
        'No ofrezcas Pro como bajada en consolas: esa comparación es de PC.',
      ],
      steps: [
        'Entrá a la Cuenta EA > Membresías y suscripciones.',
        'Seleccioná EA Play.',
        'Usá Gestionar membresía para ver si podés pasar a un nivel inferior o cambiar el período.',
        'Leé la fecha de vigencia y el compromiso (mensual o anual) antes de confirmar. Un anual no es un ahorro automático.',
      ],
      cta: EA_MEMBERSHIP,
      after: ['Confirmá en la cuenta qué membresía quedó activa.', CONFIRM_IN_ACCOUNT],
      troubleshooting: [
        'Si no ves Gestionar membresía, puede que te cobre Steam, Epic o una consola.',
        'EA no garantiza un ahorro: sólo muestra las opciones de tu cuenta.',
      ],
      related: [EA_COMPARE, SIMULATOR],
      sourceIds: ['ea-play-gestionar'],
    },
    {
      id: 'ea-play-ahorrar-playstation',
      intent: 'ahorrar',
      channels: ['playstation'],
      role: null,
      scope: 'servicio',
      transition: 'inspect_account',
      status: 'conditional',
      heading: 'Pagar menos en EA Play de PlayStation',
      eligibility: 'Las opciones dependen de lo que muestre la cuenta de PlayStation.',
      before: ['No uses el menú de EA Play Pro de PC para una compra de consola.'],
      steps: [
        'Abrí Suscripción en Administración de cuentas de PlayStation.',
        'Elegí EA Play y revisá si ofrece cambiar plan o sólo cancelar la renovación.',
        'Si no hay un plan más barato, desactivar la renovación evita el próximo cobro al vencer.',
      ],
      cta: PS_ACCOUNT,
      after: ['No prometemos un downgrade de Pro en consolas.'],
      troubleshooting: ['Precios y facturación de PlayStation se consultan con su soporte.'],
      related: [EA_COMPARE],
      sourceIds: ['ea-play-cancelar', 'ps-plus-cancelar'],
    },
    {
      id: 'ea-play-ahorrar-externo',
      intent: 'ahorrar',
      channels: ['externo'],
      role: null,
      scope: 'servicio',
      transition: 'inspect_account',
      status: 'official_handoff',
      heading: 'Pagar menos si EA Play está en Steam, Epic o Microsoft',
      before: ['Cada tienda define sus planes. EA no gestiona esos cambios desde la Cuenta EA.'],
      steps: [
        'Identificá la tienda del recibo.',
        'Abrí la ayuda o la cuenta de Steam, Epic o Microsoft y revisá las opciones de esa suscripción.',
        'Compará períodos sólo si la tienda los muestra; no asumas un ahorro.',
      ],
      cta: EA_MANAGE_HELP,
      after: ['Si no hay plan más barato, cancelar la renovación es la forma de dejar de pagar al vencer.'],
      troubleshooting: ['Si la membresía está en la Cuenta EA, volvé a elegir EA app.'],
      related: [EA_COMPARE, GAME_PASS_GUIDE],
      sourceIds: ['ea-play-gestionar', 'ea-play-cancelar'],
    },
    {
      id: 'ea-play-ahorrar-paquete',
      intent: 'ahorrar',
      channels: [],
      role: null,
      scope: 'paquete',
      transition: 'inspect_account',
      status: 'official_handoff',
      heading: 'Pagar menos si EA Play viene con otro plan',
      before: [
        'El ahorro o la baja se decide en el plan padre (por ejemplo Game Pass), no cancelando «sólo EA Play» dentro del paquete.',
        'Revisá también si tenés un cobro aparte de EA Play.',
      ],
      steps: [
        'Si el beneficio viene con Game Pass, abrí la guía de Game Pass y compará los planes que muestra tu cuenta.',
        'Si además pagás EA Play aparte, tratá ese cobro con la opción «Lo pago aparte».',
      ],
      cta: EA_CANCEL_HELP,
      after: ['No cancelamos el plan padre en silencio: la decisión es tuya en la cuenta del proveedor.'],
      troubleshooting: ['Si no tenés Game Pass ni otro paquete, volvé a elegir «Lo pago aparte».'],
      related: [GAME_PASS_GUIDE, EA_COMPARE, SIMULATOR],
      sourceIds: ['ea-play-cancelar', 'xbox-game-pass-planes'],
    },
  ],
  faqs: [
    { question: '¿Sigo jugando después de cancelar?', answer: 'Hasta que termine el período pago. Después necesitás comprar el juego o volver a unirte para los títulos de la membresía.' },
    { question: '¿Se borran mis partidas?', answer: 'EA indica que si no borrás los archivos guardados, conservás el progreso al volver a unirte o al comprar el juego.' },
    { question: '¿Puedo bajar de Pro en la consola?', answer: 'La gestión de Pro a EA Play que describe EA es de PC con Cuenta EA. En consolas revisá lo que muestre esa tienda.' },
    { question: '¿Game Pass Ultimate incluye EA Play?', answer: 'Puede incluirlo según el plan. En ese caso, cancelar Ultimate afecta más que EA Play. Usá la guía de Game Pass.' },
  ],
  updatedAt: BATCH_4_UPDATED,
};

// GeForce NOW

const ABYA_MANAGE: GuideCta = { label: 'Administrar mi suscripción', url: 'https://abya.com/gfn/manage' };
const NVIDIA_MEMBERSHIPS: GuideCta = { label: 'Abrir membresías de NVIDIA', url: 'https://www.nvidia.com/en-us/geforce-now/memberships/' };
const NVIDIA_FAQ: GuideCta = { label: 'Abrir las preguntas frecuentes de NVIDIA', url: 'https://www.nvidia.com/en-us/geforce-now/faq/' };
const GFN_COMPARE = { label: 'Ver GeForce NOW en Abonito', href: '/geforce-now/' };

const geforceNow: PlatformGuide = {
  platformId: 'geforce-now',
  slug: 'geforce-now',
  name: 'GeForce NOW',
  providerName: 'GeForce NOW',
  aliases: ['geforce now', 'gfn', 'abya', 'nvidia geforce now', 'geforce now abya'],
  existingLogoRef: '/brands/geforcenow.png',
  catalogHref: '/geforce-now/',
  h1: 'Cómo cancelar GeForce NOW o cambiar de plan',
  intro: 'En Argentina el servicio lo opera ABYA. Si tu cuenta es de NVIDIA u otro socio, no uses el panel de ABYA. Cancelar GeForce NOW no cancela Steam ni Game Pass.',
  seo: {
    title: 'Cómo cancelar GeForce NOW | Abonito',
    description: 'Cómo gestionar GeForce NOW según tu operador: ABYA en Argentina, NVIDIA u otro socio, sin mezclar cuentas.',
  },
  channels: ['directo', 'externo'],
  channelHints: {
    directo: 'GeForce NOW Powered by ABYA: te registra y te cobra ABYA (Argentina y Cono Sur).',
    externo: 'Te cobra NVIDIA directamente u otro operador o socio de GeForce NOW Alliance.',
  },
  roleQuestion: null,
  billerCheck: {
    text: `Mirás el recibo, el email de altas o la app: si dice ABYA o abya.com, elegí ABYA. Si dice NVIDIA u otro socio, elegí esa opción. Vivir en Argentina no alcanza para saberlo. ${CARD_IS_NOT_BILLER}`,
    label: 'Abrir GeForce NOW de ABYA',
    url: 'https://abya.com/gfn',
    sourceId: 'abya-gfn',
  },
  routes: [
    {
      id: 'geforce-now-cancelar-directo',
      intent: 'cancelar',
      channels: ['directo'],
      role: null,
      status: 'official_handoff',
      heading: 'Cancelar o dejar de renovar si te cobra ABYA',
      before: [
        'No publicamos el nombre exacto del botón de baja: en la documentación pública de ABYA confirmamos la gestión de plan y fechas, no una etiqueta única de cancelación.',
        'Cancelar el streaming no da de baja juegos comprados en Steam u otras tiendas.',
        'ABYA advierte que al cancelar, no renovar o pasar a un plan gratuito podés perder horas no usadas y beneficios asociados, según sus términos.',
      ],
      steps: [
        'Entrá a abya.com/gfn/manage e iniciá sesión con la cuenta de ABYA.',
        'Revisá la suscripción activa, si se renueva y la fecha del próximo ciclo de facturación.',
        'Para que un cambio de plan rija en el próximo ciclo, ABYA indica actualizarlo al menos 24 horas antes de que empiece ese ciclo. Los cambios pueden tardar hasta 24 horas en verse.',
        'Si querés dejar de pagar, buscá en ese panel la opción para pasar a un plan gratuito o dejar de renovar el plan pago, y confirmá lo que muestre la cuenta.',
        'Guardá la confirmación y volvé a entrar después para comprobar el estado.',
      ],
      cta: ABYA_MANAGE,
      after: [
        SAVE_PROOF,
        CONFIRM_IN_ACCOUNT,
        ABONITO_ORIENTA,
      ],
      troubleshooting: [
        'Si tu cuenta es de NVIDIA u otro país, no uses este panel: volvé a elegir el operador.',
        'La app también menciona Configuración > Membresía y un botón para administrar planes.',
        'Si no encontrás la opción, usá el soporte de ABYA desde su sitio.',
      ],
      related: [GFN_COMPARE],
      sourceIds: ['abya-gfn', 'abya-tos'],
    },
    {
      id: 'geforce-now-cancelar-externo',
      intent: 'cancelar',
      channels: ['externo'],
      role: null,
      status: 'official_handoff',
      heading: 'Cancelar si te cobra NVIDIA u otro operador',
      before: [
        'No apliques los términos de ABYA a una cuenta de NVIDIA u otro socio.',
        'Los Founders u otros beneficios de partner pueden tener reglas distintas a las de NVIDIA directo.',
      ],
      steps: [
        'Identificá en el recibo o en la app el nombre del operador (NVIDIA u otro).',
        'Si es NVIDIA, abrí las preguntas frecuentes y la página de membresías oficiales y gestioná el plan desde la cuenta de GeForce NOW de NVIDIA, no desde abya.com.',
        'Si es otro socio, usá sólo el sitio o la app de ese socio.',
        'Comprobá renovación y fecha de fin antes de confirmar.',
      ],
      cta: NVIDIA_FAQ,
      after: [SAVE_PROOF, 'No prometemos conservar todas las partidas en la nube ni compatibilidad de todos los juegos comprados.'],
      troubleshooting: [
        'Si el sitio o el recibo dicen ABYA, volvé a elegir ABYA.',
        'Sin un destino verificado de ese socio, quedate en su ayuda oficial y no uses paneles de otro país.',
      ],
      related: [GFN_COMPARE],
      sourceIds: ['nvidia-faq', 'nvidia-terms', 'abya-tos'],
    },
    {
      id: 'geforce-now-ahorrar-directo',
      intent: 'ahorrar',
      channels: ['directo'],
      role: null,
      transition: 'inspect_account',
      status: 'conditional',
      heading: 'Pagar menos en GeForce NOW de ABYA',
      eligibility: 'Sólo los planes que ABYA muestre ahora para tu cuenta.',
      before: [
        'No prometemos un plan gratuito ilimitado, horas fijas ni un downgrade inmediato.',
        'Compará lo que te importa: horas del período, duración de sesión, calidad de streaming y ciclo de facturación, según lo que liste ABYA.',
      ],
      steps: [
        'Entrá a abya.com/gfn/manage o a la membresía desde la app.',
        'Abrí los planes de membresía disponibles para tu cuenta.',
        'Elegí un plan distinto sólo si te conviene y leé desde cuándo rige. Para el próximo ciclo, ABYA pide actualizar al menos 24 horas antes.',
        'No uses precios ni nombres de planes de NVIDIA de otros países.',
      ],
      cta: ABYA_MANAGE,
      after: ['Confirmá en la cuenta qué plan quedó activo después de esperar la actualización.'],
      troubleshooting: [
        'La página de ABYA menciona opciones como gratuita y Performance; lo que veas en tu cuenta manda.',
        'Cancelar horas extra o packs no reemplaza gestionar la suscripción principal.',
      ],
      related: [GFN_COMPARE, SIMULATOR],
      sourceIds: ['abya-gfn', 'abya-tos'],
    },
    {
      id: 'geforce-now-ahorrar-externo',
      intent: 'ahorrar',
      channels: ['externo'],
      role: null,
      transition: 'inspect_account',
      status: 'official_handoff',
      heading: 'Pagar menos si tu operador no es ABYA',
      before: [
        'NVIDIA y cada socio publican sus propios planes. No copies horas ni precios de otra región.',
        'Un cambio de plan en NVIDIA puede tener reglas de prorrateo distintas a las de ABYA.',
      ],
      steps: [
        'Identificá el operador.',
        'Si es NVIDIA, abrí la página de membresías y las FAQ y revisá sólo las opciones de esa cuenta.',
        'Si es otro socio, usá su panel. Sin panel verificado, pedí ayuda en su soporte.',
      ],
      cta: NVIDIA_MEMBERSHIPS,
      after: ['No prometemos Ultimate, Performance ni horas concretas para tu país.'],
      troubleshooting: ['Si operás con ABYA, volvé a elegir ABYA.'],
      related: [GFN_COMPARE],
      sourceIds: ['nvidia-faq', 'nvidia-terms'],
    },
  ],
  faqs: [
    { question: '¿En Argentina quién opera GeForce NOW?', answer: 'ABYA opera GeForce NOW Powered by ABYA en Argentina y otros países del Cono Sur. Eso no implica que tu cuenta personal sea de ABYA: mirá el recibo.' },
    { question: '¿Cancelar GeForce NOW cancela Steam?', answer: 'No. El streaming y las licencias de la tienda de juegos son cosas distintas.' },
    { question: '¿Pierdo las horas al cambiar de plan?', answer: 'Los términos de ABYA indican que al cancelar, no renovar o pasar a un plan gratuito podés perder horas no usadas y beneficios asociados.' },
    { question: '¿Puedo usar el panel de NVIDIA si pago ABYA?', answer: 'No. Cada operador gestiona su cuenta. Mezclar paneles no cancela el cobro correcto.' },
  ],
  updatedAt: BATCH_4_UPDATED,
};

export const gamingGuides: PlatformGuide[] = [
  playstationPlus,
  xboxGamePass,
  nintendoSwitchOnline,
  eaPlay,
  geforceNow,
];
