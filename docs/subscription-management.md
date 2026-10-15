# Gestionar suscripciones

Guías para cancelar o pagar menos en Netflix, Spotify, Disney+, HBO Max, YouTube Premium, Prime Video, Apple TV, Paramount+, Crunchyroll, MUBI, Google One, iCloud+, Dropbox, Microsoft 365 y Canva, más dos guías de tienda (Apple y Google Play). La lista sale de `platformGuides`: el directorio y sus contadores no tienen nombres ni números fijos. Abonito orienta: la gestión siempre se completa en el sitio o la app del proveedor. No pedimos contraseñas, no subimos comprobantes, no leemos cuentas y no tocamos la lista de Mis suscripciones.

## Rutas

| Ruta | Qué es |
| --- | --- |
| `/gestionar-suscripciones/` | Directorio con buscador por alias |
| `/<slug>/cancelar/` | Guía de la plataforma (cancelar y pagar menos en la misma página) |
| `/guias/cancelar-suscripciones-apple/` | Suscripciones que cobra Apple |
| `/guias/cancelar-suscripciones-google-play/` | Suscripciones que cobra Google Play |

La guía acepta cuatro parámetros:

- `objetivo`: `cancelar` o `ahorrar`.
- `cobro`: `directo`, `apple`, `google-play`, `externo`, `movistar`, `playstation`, `prime-video` o `no-se`. Cada guía ofrece sólo los canales que tiene su fuente.
- `rol`: `titular` o `miembro`, en Spotify, YouTube y las cinco guías de la tercera tanda. En Dropbox, Microsoft 365 y Canva «titular» incluye al administrador con acceso a la facturación.
- `alcance`: `servicio`, `canal`, `paquete`, `personal`, `familia`, `equipo` o `empresa`, sólo donde la guía lo pregunta. Prime Video lo pregunta para cancelar (Prime Video o sólo un canal adicional). Apple TV lo pregunta para los dos objetivos (la suscripción, un canal de la app o Apple One). iCloud+ pregunta `servicio` o `paquete` (Apple One). Dropbox pregunta `personal`, `familia` o `equipo`; Microsoft 365, `personal` o `empresa`; Canva, `personal` o `equipo`.

Las rutas de miembro pueden tener alcance cuando cambia a quién recurrir (miembro de un Family o de un equipo). Si una guía tiene rutas de miembro con alcance, al miembro se le pregunta el alcance; si su alcance no tiene ruta propia, ve la ruta de miembro sin alcance.

Un valor inválido o que la plataforma no tiene se descarta y la URL se normaliza. Si un alcance no necesita saber quién cobra (un canal de Prime Video, Apple One), el `cobro` se descarta. Al cambiar de objetivo, el alcance que ya no aplica se borra. Ningún parámetro acepta una URL de destino. La canónica no lleva parámetros y las variantes no van al sitemap. También funciona `#ruta-<id>` sin parámetros.

## Archivos

- `src/data/subscription-management/types.ts`: modelo de datos.
- `src/data/subscription-management/sources.ts`: fuentes oficiales con `lastReviewedAt` (cuándo se leyó el contenido) y `lastLinkCheckedAt` (cuándo se comprobó que el enlace responde). Son fechas distintas. Las fuentes de la segunda tanda suman `regionalScope` (`ar`, `latam`, `global`, `otro-pais`) y `evidence`: `readable_article` (leímos el artículo), `store_listing` (descripción del desarrollador en la tienda) o `indexed_excerpt` (sólo un resumen o la portada de ayuda). Estos campos no se muestran en la página.
- `src/data/subscription-management/platform-guides.ts`: una guía por plataforma con sus canales de cobro, la pregunta de rol, la ayuda para saber quién cobra, las rutas y las preguntas frecuentes. Las guías de la tercera tanda están en `storage-productivity-guides.ts` y se suman a la misma lista.
- `impact` (guía) y `impact: true` (ruta): el aviso «Antes de reducir tu almacenamiento» (o «Qué conservás y qué no» en Canva), que se muestra arriba del botón oficial. Es informativo: no se marca ni bloquea nada.
- `variants` (ruta): pasos por dispositivo o versión. Sin JavaScript se ven todos; con JavaScript se elige uno y «Copiar pasos» copia sólo ese.
- `src/data/subscription-management/billing-guides.ts`: guías de Apple y Google Play, los pasos compartidos que reutilizan las plataformas y la sección única «Cancelar un canal adicional de Prime Video» (`primeVideoChannelCancelRoute` y `primeVideoChannelSaveRoute`). Paramount+, Crunchyroll y MUBI la usan sólo cuando la persona elige «Prime Video, como canal», siempre como `conditional` y con el aviso de que no confirmamos que se venda así en Argentina.
- `src/data/subscription-management/managed.ts`: índice liviano que usan la ficha, Mis suscripciones y el simulador para mostrar el enlace.
- `src/lib/guides.ts`: lógica pura (leer y escribir parámetros, elegir la ruta, buscar por alias, lista de dominios oficiales).
- `src/lib/guide-validation.ts`: validación con Zod y reglas de cobertura. La corre `npm run validate:data` y los tests.
- `src/pages/[slug]/cancelar.astro`, `src/pages/guias/[guide].astro`, `src/pages/gestionar-suscripciones/index.astro` y los componentes `GuideSelector`, `BillingHelper` y `GuideResult`.

## Estados de evidencia

| Estado | Etiqueta | Cuándo |
| --- | --- | --- |
| `verified` | Fuente oficial revisada | Los pasos salen de una página oficial leída en la fecha indicada |
| `conditional` | Depende de tu cuenta | La opción existe pero depende del plan, la región o la tienda |
| `official_handoff` | Te llevamos a la ayuda oficial | No hay pasos confiables para copiar; enviamos a la ayuda del proveedor |

Nunca usamos «Probado en una cuenta»: no probamos con cuentas reales. El botón principal empieza con «Abrir» («Abrir en Netflix», «Abrir mi cuenta de Prime Video») o, desde la tercera tanda, dice «Administrar mi suscripción» o «Ver los pasos oficiales». Nunca «Cancelar ahora».

Las rutas para pagar menos de la segunda tanda llevan `transition`, que no se muestra pero los tests controlan:

- `next_cycle`: el cambio rige en la próxima renovación (MUBI en la web).
- `cancel_then_expire_then_resubscribe`: hay que cancelar, esperar a que venza y recién después suscribirse (Crunchyroll). Nunca un cambio inmediato ni dos suscripciones superpuestas.
- `inspect_account`: no hay un plan más barato confirmado; la ruta ayuda a revisar la cuenta y a quitar adicionales.

## Fuentes de la segunda tanda (base 2026-10-13)

| Plataforma | Fuente | Estado de la evidencia |
| --- | --- | --- |
| Prime Video | Ayuda de Prime Video: cancelar, cancelar un add-on, cancelar sin anuncios | Artículos legibles. Sin país: no prueban qué canales ni qué opción sin anuncios hay en Argentina |
| Apple TV | Soporte de Apple es-MX 118398, Apple es-LA 118448 y 118428, página Apple One LA | Artículos legibles. El de México se usa sólo por la mecánica de la cuenta |
| Paramount+ | App Store AR y Google Play (descripción del desarrollador), ayuda de Movistar AR | Tiendas: `store_listing`. Movistar: artículo legible |
| Paramount+ | Centro de ayuda internacional | `indexed_excerpt`: sólo la portada. El artículo de baja devolvió una página con error de CSS |
| Crunchyroll | Ayuda: cancelar y cambiar de plan (rutas `/es/article/...`) | Artículos legibles |
| MUBI | Ayuda es: web, cambiar plan, Apple, Google Play | Artículos legibles |

Limitaciones abiertas, sin revisar con una cuenta:

- Paramount+ directo es `official_handoff`: no pudimos leer su artículo de baja ni confirmar planes argentinos. `paramountplus.com/ar` redirigió a otro país desde el entorno de investigación. La guía no nombra botones, no usa planes de Estados Unidos ni de Brasil y no enlaza al login de Salesforce para empleados.
- Crunchyroll por PlayStation es `conditional`: el artículo de PlayStation devolvió una página vacía. No publicamos menús de PlayStation.
- `crunchyroll.com/account/membership` y `crunchyroll.com` responden 403 a `curl` (protección contra bots). `crunchyroll.com` abre bien en un navegador. El botón abre `crunchyroll.com` y los pasos indican Información de membresía.
- `primevideo.com/settings` y `mubi.com/subscription` redirigen al login: eso sólo prueba que la gestión pide iniciar sesión.
- Canales de Prime Video (Paramount+, Crunchyroll, MUBI) y canales de la app Apple TV: sólo condicionales. No sabemos qué canales se venden hoy en Argentina.
- Prime Video sin anuncios: sólo se menciona si la cuenta lo muestra.
- Apple One: el paquete no se cancela por partes. La guía no lo recomienda como ahorro sin comparar el total.

Una respuesta 200 vacía, una redirección a la portada de ayuda o a otro país, o una página con error no cuentan como fuente verificada. Una pantalla de login sólo prueba que la gestión pide iniciar sesión.

## Fuentes de la tercera tanda (base 2026-10-14)

| Plataforma | Fuente | Estado de la evidencia |
| --- | --- | --- |
| Google One | Ayuda es-419: cancelar (pestaña Computadora) y cambiar de plan | Artículos legibles |
| iCloud+ | Apple es-LA 108318 (reducir o cancelar), 121290 (sin dispositivo), 108783 (familia), 108922 (almacenamiento) | Artículos legibles |
| Dropbox | Ayuda es-LA: cancelar o cambiar, móvil, Family, equipo, qué plan tengo, exceso de espacio en Basic | Artículos legibles |
| Microsoft 365 | Soporte es-ES: cancelar, cambiar de plan, facturación periódica, almacenamiento. Microsoft Learn: cancelar en empresas | Artículos legibles. Sin versión para Argentina: los menús son los mismos, los reembolsos dependen del país |
| Canva | Ayuda es_es: cancelar. Ayuda global: renovación automática y frecuencia de facturación | Leídas en un navegador. `curl` y los lectores automáticos reciben 403 o «navegador no compatible», que no cuentan como evidencia |

Alcance y handoffs:

- Google One: sólo la membresía de consumo. Google Workspace queda afuera. La cancelación nunca manda a «eliminar un servicio» ni a borrar la cuenta: la fuente lo menciona sólo para cambios de proveedor. El miembro del grupo familiar primero identifica a quien paga; salir del grupo es una opción, no la primera.
- iCloud+: siete variantes de dispositivo para cancelar y seis para reducir. «Sin un dispositivo Apple» usa el formulario de reembolsos de Apple, y la guía aclara que pedir la cancelación por ahí no garantiza un reembolso. Apple Vision Pro no tiene variante: la ruta manda a la ayuda oficial. iCloud+ no ofrece canales: siempre cobra Apple.
- Dropbox: pasos completos sólo para planes personales. Family y equipo son handoff o `conditional` con su ayuda oficial. El miembro de un Family puede abandonar el plan; el de un equipo habla con el administrador. Dropbox Sign y Fax quedan afuera.
- Microsoft 365: sólo cuentas personales tienen pasos. Trabajo o escuela es un handoff etiquetado al Centro de administración. Si la página muestra «Activar facturación periódica», la suscripción ya vence: la guía no lo presenta como una baja pendiente. Microsoft 365 Básico figura en la ficha de OneDrive y no se cuenta dos veces.
- Canva: el miembro de un equipo nunca recibe pasos para cancelar el plan del equipo. Pausas y descuentos de retención no se prometen. El cambio de frecuencia (C3) es sólo eso, no un plan más barato. No ofrecemos planes educativos o para organizaciones como alternativa.

Limitaciones abiertas, sin revisar con una cuenta:

- Los enlaces de gestión (`one.google.com/settings`, `dropbox.com/account/plan`, `account.microsoft.com/services/microsoft365`) redirigen al login: sólo prueba que piden iniciar sesión. `canva.com/settings/billing-and-teams` responde 403 a `curl`.
- No revisamos qué planes muestran Apple o Google Play para Google One, Dropbox, Microsoft 365 o Canva: esas rutas para pagar menos son `conditional`.
- Los pasos de Dropbox Family para quien administra no se copian: la ruta manda a la ayuda oficial. «Abandonar el plan» para miembros sale de la misma ayuda.
- Los títulos de las fuentes de Canva C2 y C3 se escribieron a partir de su contenido, porque la página no se pudo leer de forma automática.

Al revisar estas guías, además de los menús, releé qué dice cada fuente sobre el espacio gratuito, los límites cuando se excede y la conservación a largo plazo. Si cambian, corregí el aviso `impact` y las preguntas frecuentes.

## Revisión mensual

Recomendamos revisar todas las fuentes una vez por mes y cada vez que una plataforma anuncie cambios de planes.

1. Abrí cada URL de `sources.ts` y compará los nombres de menús y botones con los pasos.
2. Si algo cambió, corregí los pasos. Si ya no se puede afirmar, pasá la ruta a `conditional` u `official_handoff`. No inventes menús.
3. Actualizá `lastReviewedAt` sólo de las fuentes que leíste y `lastLinkCheckedAt` sólo de los enlaces que abriste. Las fechas no avanzan solas.
4. Actualizá `updatedAt` de la guía.
5. `npm run validate:data`, `npm test`, `npm run build`.

`validate:data` avisa cuando una fuente pasó los 45 días sin revisar y falla si una fecha está en el futuro.

## Agregar una plataforma

1. La plataforma tiene que existir en `services.json`. El `platformId` es el id del servicio y el `slug` el mismo de la ficha.
2. Sumá las fuentes oficiales en `sources.ts`. Sólo HTTPS y dominios de la lista `OFFICIAL_HOSTS` de `src/lib/guides.ts`; si el dominio es nuevo, agregalo ahí.
3. Escribí la guía en `platform-guides.ts`. La validación exige una ruta para cada combinación de objetivo, alcance, rol y canal. Los miembros de un plan compartido y los alcances con `askChannel: false` no llevan canal. Sumá `scopeQuestion` sólo si la plataforma tiene de verdad productos distintos que se cancelan por separado.
4. Sumala a `managed.ts`. La validación falla si el índice y las guías no coinciden.
5. Título SEO de hasta 60 caracteres, descripción de hasta 160.

## Empresas externas

Para Mercado Libre, Personal, Flow, Claro o DGO no publicamos menús porque no los revisamos. La guía explica cómo distinguir un adicional del paquete completo y manda a la ayuda de esa empresa.

Excepción: Paramount+ cobrado por Movistar tiene pasos propios, porque la ayuda de Movistar Argentina los publica. Esa ruta da de baja sólo Paramount+ y avisa que no hay que dar de baja la línea. El resto de Movistar sigue sin pasos.

En las guías de la segunda tanda, la ruta «Otra empresa» es un handoff explícito: cómo identificar quién cobra, dónde buscar la suscripción y qué confirmación guardar.

## Fuentes descartadas

- Disney+ en español de Estados Unidos y la ayuda de Disney+ Latinoamérica de 2023: no reflejan la cuenta argentina actual. Usamos la ayuda es-AR.
- Canales sin fuente oficial para Argentina: Disney+ por Google Play, Netflix por Apple o Google Play y YouTube Premium por otra empresa. No los ofrecemos como opción; si alguien paga así, las guías generales de Apple y Google Play sirven para cualquier app. Si una fuente oficial lo confirma, se suma el canal con su ruta.
- Plan anual de YouTube Premium: pasar a pago anual no es bajar de plan. Lo mencionamos como opción a revisar, sin prometer ahorro.
- «Las promociones pueden terminar» en HBO Max: no lo pudimos confirmar en una fuente oficial y se quitó.

## Pagar menos

No prometemos reembolsos ni montos de ahorro y no hay una calculadora nueva. Para comparar, la guía manda a la ficha de la plataforma y al simulador existente.

## Publicidad

Las guías paso a paso (`/<slug>/cancelar/` y `/guias/...`) no cargan AdSense (`ads={false}` en `Base.astro`) para que no aparezcan anuncios entre los pasos ni botones que se confundan con el oficial. El directorio sí puede mostrar anuncios.

## Analítica

Eventos: `guide_view`, `guide_intent_select`, `guide_scope_select`, `guide_role_select`, `guide_biller_select`, `guide_unknown_biller`, `guide_official_link_click`, `guide_copy_steps`. Llevan el id de la plataforma, el objetivo, el alcance, el rol, el canal y la ruta, siempre de listas cerradas. Nunca el espacio usado ni datos de pago. No hay `cancellation_success`: no sabemos si la persona canceló. Sin `PUBLIC_ANALYTICS_ENDPOINT` no sale ningún evento.

## Sin JavaScript

Todas las rutas están en el HTML con un índice «Todos los casos» y la ayuda «No sé quién me cobra». Las variantes por dispositivo se ven todas, cada una con su título. El selector, el selector de dispositivo, copiar e imprimir aparecen sólo con JavaScript.
