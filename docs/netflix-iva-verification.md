# Verificación de precios ARS con IVA

## Fecha: 16 de octubre de 2026

### Netflix Argentina

**Verificación realizada:** Los precios publicados por Netflix Argentina **NO incluyen IVA**.

**Fuentes:**
1. **Descripción del servicio** (src/data/services.json):
   - "el sitio aclara que esos precios van sin impuestos incluidos"

2. **Planes verificados** (src/data/plans.json):
   - Netflix Básico: $8.999/mes - `taxInclusion: "excluded"`
   - Netflix Estándar: $14.999/mes - `taxInclusion: "excluded"`
   - Netflix Premium: $19.999/mes - `taxInclusion: "excluded"`
   - Notas: "Precio mensual antes de impuestos"
   - Última verificación: 2026-10-08

3. **Página oficial:**
   - https://www.netflix.com/ar/
   - Todos los planes muestran la aclaración de precios sin impuestos

**Conclusión:** Los datos actuales de Netflix son **CORRECTOS**. No hay doble IVA.

---

### Estadísticas generales de planes ARS

**Total de planes en ARS:** 132

**Distribución de taxInclusion:**
- **"excluded" (sin IVA):** 32 planes (24%)
  - Incluye: Netflix, algunas configuraciones de otros servicios
  - Estos precios requieren sumar IVA 21%

- **"included" (con IVA):** 35 planes (27%)
  - Incluye: Disney+, Paramount+, DGO, etc.
  - Estos precios ya tienen IVA incluido
  - Ya fueron corregidos para no sumar IVA dos veces

- **"unknown" (sin confirmar):** 65 planes (49%)
  - Con la lógica implementada, precios USD con "unknown" asumen "excluded"
  - Para ARS con "unknown", se requiere verificación caso por caso

---

### Servicios verificados con taxInclusion correcta

#### Precios sin IVA (excluded):
- **Netflix** - Verificado ✓
- **Otros 31 planes ARS** marcados como "excluded"

#### Precios con IVA incluido (included):
- **Disney+** - Verificado ✓ (corregido el 16/10/2026, removido ar-iva-digital-21 de taxRuleIds)
- **Paramount+** - Verificado ✓ (corregido)
- **DGO** - Verificado ✓
- **Otros 32 planes ARS** marcados como "included"

---

### Recomendaciones

1. **Netflix Argentina está correcto:** taxInclusion "excluded" es apropiado
2. **No hay doble IVA en Netflix:** El IVA se suma una sola vez sobre el precio base
3. **Correcciones ya realizadas:** 4 planes (Disney+, Paramount+) que tenían taxInclusion "included" + ar-iva-digital-21 fueron corregidos
4. **Planes con "unknown":** Requieren verificación individual en el futuro

---

### Ejemplo de cálculo correcto - Netflix Básico CABA

```
Precio publicado (sin IVA):    $8.999,00
IIBB CABA 2% (base neta):     $  179,98
IVA 21% sobre base:            $1.889,79
Percepción RG 5617 30%:        $2.699,70
────────────────────────────────────────
TOTAL:                         $13.768,47
```

**Verificación matemática:**
- Base: $8.999
- IIBB: $8.999 × 0.02 = $179,98 ✓
- IVA: $8.999 × 0.21 = $1.889,79 ✓
- Percepción: $8.999 × 0.30 = $2.699,70 ✓
- Total: $8.999 + $179,98 + $1.889,79 + $2.699,70 = $13.768,47 ✓

**No hay doble imposición de IVA.**
