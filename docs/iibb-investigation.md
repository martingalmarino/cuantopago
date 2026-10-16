# Investigación IIBB y corrección de doble IVA

## Fecha: 16 de octubre de 2026

### 1. Investigación de tasas de IIBB provinciales

**Resultado CORREGIDO:** Varias provincias argentinas SÍ tienen regímenes de percepción de IIBB para servicios digitales del exterior.

#### Provincias con percepciones verificadas (11):

| Provincia | Tasa IIBB | Normativa | Verificación | Fuente |
|-----------|-----------|-----------|--------------|--------|
| **CABA** | 2% | Res. AGIP 312/2019 | Fuentes secundarias | [Estudio Piacentini](https://www.estudiopiacentini.com.ar/impuestos-que-se-pagan-sobre-los-servicios-digitales-del-exterior/) |
| **Buenos Aires** | 2% | RN ARBA 38/2019 | Fuentes secundarias | [Estudio Piacentini](https://www.estudiopiacentini.com.ar/impuestos-que-se-pagan-sobre-los-servicios-digitales-del-exterior/) |
| **Córdoba** | 3% | Res. SIP 3/2026 | **Fuente oficial** | [Rentas Córdoba](https://www.rentascordoba.gob.ar/cms/wp-content/uploads/2026/02/resolucion_sip_n_032026_%E2%80%93_regimen_de_percepcion_de_ingresos_brutos_-_servicios_digitales.pdf) |
| **Santa Fe** | 3% / 4.5% | RG API 30/2025 | Fuentes secundarias | [Estudio Piacentini](https://www.estudiopiacentini.com.ar/impuestos-que-se-pagan-sobre-los-servicios-digitales-del-exterior/) |
| **San Juan** | 3% | Res. DGR 894/2025 | Fuentes secundarias | [Estudio Piacentini](https://www.estudiopiacentini.com.ar/impuestos-que-se-pagan-sobre-los-servicios-digitales-del-exterior/) |
| **Chaco** | 5.5% | RG ATP 2046/2020 | Fuentes secundarias | [Estudio Piacentini](https://www.estudiopiacentini.com.ar/impuestos-que-se-pagan-sobre-los-servicios-digitales-del-exterior/) |
| **La Pampa** | 1% | RG DGR 14/2019 Anexo II | Fuentes secundarias | [Estudio Piacentini](https://www.estudiopiacentini.com.ar/impuestos-que-se-pagan-sobre-los-servicios-digitales-del-exterior/) |
| **Neuquén** | 4% | Res. DPR 1/2022 | Fuentes secundarias | [Estudio Piacentini](https://www.estudiopiacentini.com.ar/impuestos-que-se-pagan-sobre-los-servicios-digitales-del-exterior/) |
| **Río Negro** | 5% | Res. ART 808/2020 | Fuentes secundarias | [Estudio Piacentini](https://www.estudiopiacentini.com.ar/impuestos-que-se-pagan-sobre-los-servicios-digitales-del-exterior/) |
| **Salta** | 3.6% | RG DGR 34/2018 | Fuentes secundarias | [Estudio Piacentini](https://www.estudiopiacentini.com.ar/impuestos-que-se-pagan-sobre-los-servicios-digitales-del-exterior/) |
| **Tierra del Fuego** | 3% | RG AREF 929/2022 | Fuentes secundarias | [Estudio Piacentini](https://www.estudiopiacentini.com.ar/impuestos-que-se-pagan-sobre-los-servicios-digitales-del-exterior/) |

**Nota sobre Santa Fe:** 3% para suscripciones audiovisuales y musicales, 4.5% para otros servicios digitales.

#### Provincias sin confirmar (13):

Mendoza, Tucumán, Entre Ríos, Misiones, Corrientes, Catamarca, Formosa, Jujuy, La Rioja, San Luis, Santa Cruz, Santiago del Estero + otras.

**Estado:** Mostradas como 0% pero **puede existir normativa no localizada**. No implica ausencia de percepción.

#### Base de cálculo IIBB:

**CRÍTICO:** La base para IIBB es el **precio neto de IVA**:
- Precio con IVA incluido: base = precio / 1.21
- Precio sin IVA: base = precio

Ejemplo Netflix Básico:
- Precio publicado: $8.999 (sin IVA)
- IVA 21%: $1.889,79
- **Base IIBB:** $8.999 (precio sin IVA)
- IIBB CABA 2%: $8.999 × 0.02 = $179,98
- Percepción RG 5617 30%: sobre precio final con IVA

#### Actualización realizada:

Archivo `src/data/iibb-provinces.json`:
- 11 provincias con tasas verificadas
- 1 fuente oficial (Córdoba)
- 10 fuentes secundarias confiables (Estudio Piacentini, MercadoPago)
- 13 jurisdicciones "sin confirmar" (no "no aplica")
- Metadata completa con disclaimer

### 2. Corrección de doble IVA

**Problema identificado:** 4 planes tenían `taxInclusion: "included"` (precio ya incluye IVA) pero también tenían `ar-iva-digital-21` en `taxRuleIds`, lo que era inconsistente.

#### Planes corregidos:
1. `disney-plus-estandar-anuncios` ($9.999/mes)
2. `disney-plus-estandar` ($12.999/mes)
3. `disney-plus-premium` ($19.999/mes)
4. `paramount-plus-desde` ($6.750/mes)

#### Corrección aplicada:

**ANTES:**
```json
{
  "taxInclusion": "included",
  "taxRuleIds": [
    "ar-iva-digital-21",
    "ar-percepcion-rg5617"
  ]
}
```

**DESPUÉS:**
```json
{
  "taxInclusion": "included",
  "taxRuleIds": [
    "ar-percepcion-rg5617"
  ]
}
```

#### Justificación:

- **Removido `ar-iva-digital-21`**: El IVA ya está incluido en el precio publicado ($9.999 incluye los $1.735,36 de IVA)
- **Mantenido `ar-percepcion-rg5617`**: La percepción del 30% se aplica **sobre el precio final** cuando se paga con tarjeta en pesos (la hace el banco/emisor)

#### Verificación:

Disney+ publica:
- Precio con IVA: $9.999,00
- Precio sin IVA: $8.263,64
- Cálculo: $8.263,64 × 1.21 = $9.999,00 ✓

El código ya manejaba correctamente estos casos (no sumaba IVA dos veces), pero la inconsistencia en los datos fue corregida.

### 3. Implementación del cálculo de IIBB

- **Lógica implementada:** Cálculo automático de IIBB provincial sobre base neta de IVA
- **Selector habilitado:** Con CABA como default
- **Nota en UI:** Indica tasas verificadas vs sin confirmar

### 4. Scripts creados

1. **`scripts/fix-double-iva.ts`**: Detecta y corrige automáticamente planes con doble IVA
2. **Comando npm**: `npm run fix-double-iva`

### 5. Tests

- Tests actualizados para nueva lógica de IIBB
- Verificación de cálculo sobre base neta de IVA
- **Total tests:** Todos pasando

### Resumen de fuentes consultadas

**IIBB Provincial:**

**Fuentes secundarias confiables:**
- Estudio Piacentini: https://www.estudiopiacentini.com.ar/impuestos-que-se-pagan-sobre-los-servicios-digitales-del-exterior/
- MercadoPago: https://www.mercadopago.com.ar/ayuda/_4063

**Fuente oficial:**
- Córdoba - Res. SIP 3/2026: https://www.rentascordoba.gob.ar/cms/wp-content/uploads/2026/02/resolucion_sip_n_032026_%E2%80%93_regimen_de_percepcion_de_ingresos_brutos_-_servicios_digitales.pdf

**Precios ARS con IVA incluido:**
- Disney+: https://www.disneyplus.com/es-ar (publica precio con y sin IVA)
- Paramount+: https://www.paramountplus.com/ar/ (precio con IVA incluido)
- DGO: https://www.directvgo.com/ar/home (precio con IVA incluido)

**Fuentes normativas nacionales:**
- RG 5617/2024 (Percepción 30%): https://servicios.infoleg.gob.ar/infolegInternet/anexos/405000-409999/407430/texact.htm
- RG 5677/2025 (Exclusiones gaming): https://www.afip.gob.ar/regimen-devolucion-percepciones/percepcion/exclusiones.asp
- Decreto 354/2018 (IVA digital): https://www.boletinoficial.gob.ar/detalleAviso/primera/182137/20180424

### Disclaimer

Las tasas provinciales están sujetas a cambios y actualizaciones normativas. Las provincias marcadas como "sin confirmar" no implican ausencia de normativa, sino falta de información verificable. Se recomienda consultar con un contador matriculado para casos específicos.
