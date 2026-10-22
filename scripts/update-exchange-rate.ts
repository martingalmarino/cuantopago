#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface DolarApiResponse {
  moneda: string;
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

interface ExchangeRatesJson {
  snapshots: Array<{
    id: string;
    pair: string;
    arsPerUsdMinor: number;
    basis: string;
    sourceUrl: string;
    verifiedAt: string;
    freshnessHours: number;
  }>;
  basis: {
    id: string;
    pair: string;
    arsPerUsdMinor: number | null;
    basis: string;
    sourceUrl: string;
    verifiedAt: string;
    freshnessHours: number;
  };
}

async function updateExchangeRate() {
  const apiUrl = 'https://dolarapi.com/v1/dolares/oficial';
  
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as DolarApiResponse;
    const ventaRate = data.venta;
    
    if (!ventaRate || typeof ventaRate !== 'number' || ventaRate <= 0) {
      throw new Error(`Tasa de venta inválida: ${ventaRate}`);
    }

    const arsPerUsdMinor = Math.round(ventaRate * 100);
    const today = new Date().toISOString().split('T')[0];
    
    const dataPath = join(process.cwd(), 'src', 'data', 'exchange-rates.json');
    const currentData = JSON.parse(readFileSync(dataPath, 'utf-8')) as ExchangeRatesJson;

    const newSnapshot = {
      id: `bna-vendedor-${today}`,
      pair: 'USDARS' as const,
      arsPerUsdMinor,
      basis: 'Tipo de cambio vendedor del Banco de la Nación Argentina (dólar oficial) obtenido a través de dolarapi.com',
      sourceUrl: apiUrl,
      verifiedAt: today,
      freshnessHours: 48,
    };

    currentData.snapshots = [newSnapshot];
    currentData.basis.arsPerUsdMinor = arsPerUsdMinor;
    currentData.basis.verifiedAt = today;
    currentData.basis.freshnessHours = 48;

    writeFileSync(dataPath, JSON.stringify(currentData, null, 2) + '\n', 'utf-8');

    console.log(`✅ Tipo de cambio actualizado: $${ventaRate} (${arsPerUsdMinor} centavos)`);
    console.log(`   Fecha: ${today}`);
    console.log(`   Fuente: ${apiUrl}`);
  } catch (error) {
    console.error('❌ Error al actualizar el tipo de cambio:', error);
    process.exit(1);
  }
}

updateExchangeRate();
