# Chat Abonito

Asistente cerrado: responde solo con lo que el sitio ya publica. No llama a ninguna API de IA ni manda la pregunta a un servidor. Todo corre en el navegador.

## Cómo funciona

1. Al generar el sitio, `src/lib/assistant/knowledge.ts` arma `/asistente/conocimiento.json` con las plataformas, planes, impuestos, preguntas frecuentes, guías de baja y páginas. Usa las mismas funciones que las fichas (`priceSummary`, `calculate`, `standardFaqs`), así que el chat y la página dicen lo mismo.
2. El botón flotante (`AssistantChat.tsx`) pesa poco. El motor y el JSON se descargan recién cuando alguien abre el chat.
3. `nlu.ts` normaliza la pregunta (acentos, mayúsculas, plurales), encuentra plataformas por nombre o alias (tolera un error de tipeo en nombres de una palabra), categorías, montos y la intención.
4. `answers.ts` arma la respuesta con plantillas. Los totales salen de `calculate()`, el mismo motor de la calculadora.
5. Si ninguna intención aplica, `retrieval.ts` busca en preguntas frecuentes y páginas (BM25). Si el resultado no supera el umbral, el chat dice que no tiene el dato y ofrece enlaces.
6. El contexto (última plataforma e intención) permite preguntas como «¿y cómo lo cancelo?».

## Cómo crece con los datos

No hay que tocar el chat para sumar información:

- Un servicio nuevo en `services.json` y sus planes en `plans.json` ya se pueden preguntar por nombre, alias o etiquetas.
- Las preguntas frecuentes del servicio (`faq`) y las guías de baja entran en la búsqueda.
- Una página nueva que deba aparecer en respuestas se agrega a la lista `pages` de `knowledge.ts`, con palabras clave.
- Una categoría nueva necesita sus palabras en `categoryKeywords` de `knowledge.ts`.

`npm run validate:data` falla si una plataforma no se encuentra por su propio nombre. Para probar respuestas a mano:

```sh
npx tsx scripts/try-assistant.ts "¿Cuánto sale Netflix?" "¿y cómo lo cancelo?"
```

## Reglas

- Un precio sin confirmar se muestra como «A confirmar», nunca como $ 0.
- Las promociones se mencionan, pero no entran en ningún total.
- El chat no lee «Mis suscripciones» ni modifica nada guardado.
- Los enlaces solo pueden ser rutas internas o direcciones HTTPS cuyo dominio ya figura en los datos revisados (`isSafeHref`). Nunca se toma un destino de la pregunta ni de la URL.
- En dólares, el chat no inventa cotización: pide un tipo de cambio («USD 10 a 1.450») o muestra la del día desde la misma fuente que la barra de cotizaciones.
- La analítica manda solo la intención, si hubo respuesta y la plataforma. Nunca el texto.
- La conversación vive en `sessionStorage` de la pestaña.
