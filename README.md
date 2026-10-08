# Cuánto Pago

Sitio estático para ver precios publicados de suscripciones en Argentina, estimar un total cuando la regla está documentada y armar un presupuesto en el navegador.

## Desarrollo

```bash
npm install
npm run dev
```

Otros comandos:

```bash
npm test
npm run validate:data
npm run check
npm run build
npm run preview
```

## URL de producción

El sitio público es [https://www.abonito.com.ar/](https://www.abonito.com.ar/). El build usa esa dirección para el canonical, Open Graph, el sitemap y `robots.txt`. `SITE_URL` la reemplaza si hace falta otro origen, sin barra final.

Las rutas personales `/mis-suscripciones/` y `/simular-ahorro/` quedan con `noindex` y fuera del sitemap.

## Vercel

El sitio es estático (`output: 'static'`). En el proyecto de Vercel:

1. Framework: Astro.
2. Comando de build: `npm run build`.
3. Directorio de salida: `dist`.
4. El dominio de producción es `https://www.abonito.com.ar`. `SITE_URL` solo hace falta si el build debe usar otro origen.
5. Opcional: `PUBLIC_ANALYTICS_ENDPOINT` solo si hay un receptor real. Vacío, no se envía analítica.

No hace falta base de datos ni claves de pago.

## Datos

Los precios y las reglas viven en `src/data/`. Cómo actualizarlos está en [docs/mantenimiento.md](docs/mantenimiento.md). Lo que no se pudo verificar está en [docs/datos-pendientes.md](docs/datos-pendientes.md). Las marcas están en [docs/brand-assets.md](docs/brand-assets.md).
