# Gestionar suscripciones

Guías para cancelar o pagar menos en Netflix, Spotify, Disney+, HBO Max y YouTube Premium, más dos guías de tienda (Apple y Google Play). Abonito orienta: la gestión siempre se completa en el sitio o la app del proveedor. No pedimos contraseñas, no subimos comprobantes, no leemos cuentas y no tocamos la lista de Mis suscripciones.

## Rutas

| Ruta | Qué es |
| --- | --- |
| `/gestionar-suscripciones/` | Directorio con buscador por alias |
| `/<slug>/cancelar/` | Guía de la plataforma (cancelar y pagar menos en la misma página) |
| `/guias/cancelar-suscripciones-apple/` | Suscripciones que cobra Apple |
| `/guias/cancelar-suscripciones-google-play/` | Suscripciones que cobra Google Play |

La guía acepta tres parámetros: `objetivo` (`cancelar` o `ahorrar`), `cobro` (`directo`, `apple`, `google-play`, `externo` o `no-se`) y `rol` (`titular` o `miembro`, sólo Spotify y YouTube). Un valor inválido o que la plataforma no tiene se descarta y la URL se normaliza. Ningún parámetro acepta una URL de destino. La canónica no lleva parámetros y las variantes no van al sitemap. También funciona `#ruta-<id>` sin parámetros.

## Archivos

- `src/data/subscription-management/types.ts`: modelo de datos.
- `src/data/subscription-management/sources.ts`: fuentes oficiales con `lastReviewedAt` (cuándo se leyó el contenido) y `lastLinkCheckedAt` (cuándo se comprobó que el enlace responde). Son fechas distintas.
- `src/data/subscription-management/platform-guides.ts`: una guía por plataforma con sus canales de cobro, la pregunta de rol, la ayuda para saber quién cobra, las rutas y las preguntas frecuentes.
- `src/data/subscription-management/billing-guides.ts`: guías de Apple y Google Play, y los pasos compartidos que reutilizan las plataformas.
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

Nunca usamos «Probado en una cuenta»: no probamos con cuentas reales. El botón principal siempre dice «Abrir en [proveedor]», nunca «Cancelar ahora».

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
3. Escribí la guía en `platform-guides.ts`. La validación exige una ruta para cada combinación de objetivo, rol y canal; los miembros de un plan compartido no llevan canal.
4. Sumala a `managed.ts`. La validación falla si el índice y las guías no coinciden.
5. Título SEO de hasta 60 caracteres, descripción de hasta 160.

## Empresas externas

Para Mercado Libre, Personal, Flow, Claro, Movistar o DGO no publicamos menús porque no los revisamos. La guía explica cómo distinguir un adicional del paquete completo y manda a la ayuda de esa empresa.

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

Eventos: `guide_view`, `guide_intent_select`, `guide_biller_select`, `guide_unknown_biller`, `guide_official_link_click`, `guide_copy_steps`. Llevan el id de la plataforma, el objetivo, el canal y la ruta. No hay `cancellation_success`: no sabemos si la persona canceló. Sin `PUBLIC_ANALYTICS_ENDPOINT` no sale ningún evento.

## Sin JavaScript

Todas las rutas están en el HTML con un índice «Todos los casos» y la ayuda «No sé quién me cobra». El selector, copiar e imprimir aparecen sólo con JavaScript.
