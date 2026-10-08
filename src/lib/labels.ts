import type { CalculationResult } from './types';

export function resultHeading(result: CalculationResult): string {
  if (result.status === 'user-reported') return 'Lo que pagás';
  if (result.status === 'unavailable') return 'Sin total para mostrar';
  if (result.simulated) return result.periodMonths === 1 ? 'Simulación por mes' : 'Simulación del período';
  if (result.status === 'partial') return result.periodMonths === 1 ? 'Total parcial por mes' : 'Total parcial del período';
  return result.periodMonths === 1 ? 'Total estimado por mes' : 'Total estimado del período';
}

export function monthlyHeading(result: CalculationResult): string {
  if (result.status === 'unavailable') return 'Sin equivalente mensual';
  if (result.status === 'user-reported') return 'Equivalente mensual de lo que pagás';
  if (result.simulated) return 'Equivalente mensual simulado';
  if (result.status === 'partial') return 'Equivalente mensual parcial';
  return 'Total estimado por mes';
}
