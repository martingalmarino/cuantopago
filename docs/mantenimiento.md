# Mantenimiento

No hay un panel de administración. Un cambio de precio se publica volviendo a generar el sitio.

## Precio o plan

1. Abrí la página oficial del servicio en Argentina y anotá el monto, la moneda, el período y si dice que incluye impuestos.
2. Editá `src/data/plans.json`. El importe va en centavos enteros: $ 4.499 son `449900`. USD 3,29 son `329`.
3. Si el precio no está claro, dejá `amountMinor` y `currency` en `null`. No uses 0.
4. Actualizá `verifiedAt` con el día de la lectura (`AAAA-MM-DD`). No lo cambies solo porque recompilaste.
5. Si el plan desaparece, poné `retired: true`. Quien ya lo tenga en el navegador lo sigue viendo como archivado.
6. Corré `npm run validate:data` y `npm test`, después `npm run build`.

## Regla impositiva

Editá `src/data/tax-rules.json` solo con el texto de la norma: tasa, vigencia, fuente y fecha. Si la condición no se puede afirmar para un pago común, no la actives por defecto. La percepción de la RG 5617 queda sin aplicar hasta que estén los tres indicadores (`paysInArs`, `accessesMulc`, `providerNotExcludedByRg5677`).

## Tipo de cambio

`src/data/exchange-rates.json` no tiene una cotización numérica. Si más adelante guardás el vendedor del Banco Nación, completá `arsPerUsdMinor` (pesos por dólar, en centavos) y `verifiedAt`. A las 24 horas el sitio la marca para revisión.

## Logo

1. Confirmá el slug en `simple-icons` instalado. No adivines el nombre.
2. Copiá solo ese SVG a `public/brands/`, con el color oficial en el `fill` y sin scripts.
3. Actualizá `src/data/brand-assets.json` y el campo `logo` del servicio.
4. Si no hay una marca verificable, dejá `logo` en `null`.

## Servicio nuevo

Agregá el registro en `services.json` (id estable, slug, categoría, URL oficial y al menos tres preguntas) y los planes en `plans.json`. El id no se reutiliza si cambia el nombre comercial.

## Analítica

Sin `PUBLIC_ANALYTICS_ENDPOINT` no sale ningún evento. No pongas un id de prueba.
