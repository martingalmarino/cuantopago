#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface Plan {
  id: string;
  taxInclusion: string;
  taxRuleIds: string[];
  [key: string]: any;
}

function fixDoubleIva() {
  const plansPath = join(process.cwd(), 'src', 'data', 'plans.json');
  const plans = JSON.parse(readFileSync(plansPath, 'utf-8')) as Plan[];

  let fixedCount = 0;
  const fixedPlans: string[] = [];

  for (const plan of plans) {
    if (plan.taxInclusion === 'included' && plan.taxRuleIds.includes('ar-iva-digital-21')) {
      console.log(`Corrigiendo ${plan.id}: removiendo ar-iva-digital-21 (IVA ya incluido en precio)`);
      plan.taxRuleIds = plan.taxRuleIds.filter(id => id !== 'ar-iva-digital-21');
      fixedCount++;
      fixedPlans.push(plan.id);
    }
  }

  if (fixedCount > 0) {
    writeFileSync(plansPath, JSON.stringify(plans, null, 2) + '\n', 'utf-8');
    console.log(`\n✅ Corregidos ${fixedCount} planes:`);
    fixedPlans.forEach(id => console.log(`   - ${id}`));
    console.log('\nExplicación: Planes con taxInclusion "included" NO deben tener');
    console.log('ar-iva-digital-21 en taxRuleIds porque el IVA ya está en el precio.');
    console.log('La percepción RG 5617 (30%) sí se mantiene porque se aplica sobre');
    console.log('el precio final cuando se paga con tarjeta en pesos.');
  } else {
    console.log('✅ No se encontraron planes con doble IVA.');
  }
}

fixDoubleIva();
