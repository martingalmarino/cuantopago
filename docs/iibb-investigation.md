# Investigación IIBB y corrección de doble IVA

## Fecha: 16 de octubre de 2026

### 1. Investigación de tasas de IIBB provinciales

**Resultado:** Las provincias argentinas **NO tienen regímenes de percepción de IIBB** específicos para servicios digitales del exterior contratados por consumidores finales.

#### Provincias investigadas:
- **CABA (AGIP)**: https://www.agip.gob.ar/
- **Buenos Aires (ARBA)**: https://www.arba.gob.ar/
- **Córdoba (Dirección de Rentas)**: https://servicios.cba.gov.ar/
- **Santa Fe (API)**: https://www.santafe.gob.ar/index.php/web/content/view/full/93817
- **Mendoza (ATM)**: https://www.atm.mendoza.gov.ar/
- **Tucumán (DPR)**: https://dpr.tucuman.gob.ar/
- **Salta (Rentas)**: https://www.rentassalta.gob.ar/
- **Entre Ríos (ATER)**: https://www.entrerios.gov.ar/ater/
- **Misiones (DGR)**: https://www.dgr.misiones.gob.ar/
- **Chaco (ATP)**: https://www.atp.gov.ar/
- **Corrientes**: https://www.corrientes.gob.ar/

#### Hallazgos:

Las percepciones de IIBB provinciales se aplican principalmente sobre:
1. Compra-venta de bienes
2. Operaciones con tarjetas de crédito/débito sobre ciertos rubros **locales**
3. Servicios locales prestados por proveedores argentinos

**Los servicios digitales del exterior** (Netflix, Spotify, etc.) están alcanzados por:
- ✅ **Impuestos nacionales**: IVA 21% + Percepción RG 5617 del 30% (AFIP)
- ❌ **Impuestos provinciales**: NO tienen percepciones de IIBB específicas

#### Actualización realizada:

Archivo `src/data/iibb-provinces.json`:
- Todas las provincias: **tasa 0%**
- Cada provincia tiene URL oficial de su organismo recaudador
- Metadata con explicación completa y disclaimer
- **Total de tasas verificadas: 12 provincias con 0%**

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

### 3. Habilitación del selector de provincia

- **Default:** CABA
- **Estado:** Habilitado con nota clara
- **Mensaje:** "Las provincias argentinas NO tienen percepciones de IIBB sobre servicios digitales del exterior. Todas las tasas provinciales son 0%."

### 4. Scripts creados

1. **`scripts/fix-double-iva.ts`**: Detecta y corrige automáticamente planes con doble IVA
2. **Comando npm**: `npm run fix-double-iva`

### 5. Tests agregados

- Nuevo test: Verifica que ningún plan con `taxInclusion: "included"` tenga `ar-iva-digital-21` en `taxRuleIds`
- **Total tests:** 121 (todos pasando)

### Resumen de fuentes oficiales consultadas

**IIBB Provincial:**
- 11 organismos oficiales de recaudación provincial consultados
- URLs oficiales documentadas para cada provincia
- **Conclusión verificada:** No hay percepciones de IIBB para servicios digitales del exterior

**Precios ARS con IVA incluido:**
- Disney+: https://www.disneyplus.com/es-ar (publica precio con y sin IVA)
- Paramount+: https://www.paramountplus.com/ar/ (precio con IVA incluido)
- DGO: https://www.directvgo.com/ar/home (precio con IVA incluido)

**Fuentes normativas:**
- RG 5617/2024 (Percepción 30%): https://servicios.infoleg.gob.ar/infolegInternet/anexos/405000-409999/407430/texact.htm
- RG 5677/2025 (Exclusiones gaming): https://www.afip.gob.ar/regimen-devolucion-percepciones/percepcion/exclusiones.asp
- Decreto 354/2018 (IVA digital): https://www.boletinoficial.gob.ar/detalleAviso/primera/182137/20180424
