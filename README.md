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

No hay un dominio inventado. Antes de publicar, definí `SITE_URL` con la URL real, sin barra final:

```bash
SITE_URL=https://tu-dominio.example npm run build
```

Con esa variable, Astro genera el canonical, Open Graph y `sitemap-index.xml`. Sin ella, el build sigue funcionando y `robots.txt` no apunta a un dominio falso. Las rutas personales `/mis-suscripciones/` y `/simular-ahorro/` quedan con `noindex`.

## Vercel

El sitio es estático (`output: 'static'`). En el proyecto de Vercel:

1. Framework: Astro.
2. Comando de build: `npm run build`.
3. Directorio de salida: `dist`.
4. Variable de entorno `SITE_URL` con la URL de producción.
5. Opcional: `PUBLIC_ANALYTICS_ENDPOINT` solo si hay un receptor real. Vacío, no se envía analítica.

No hace falta base de datos ni claves de pago.

## Datos

Los precios y las reglas viven en `src/data/`. Cómo actualizarlos está en [docs/mantenimiento.md](docs/mantenimiento.md). Lo que no se pudo verificar está en [docs/datos-pendientes.md](docs/datos-pendientes.md). Las marcas están en [docs/brand-assets.md](docs/brand-assets.md).
