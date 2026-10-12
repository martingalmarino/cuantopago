import { validateCatalog } from '../src/lib/data-validation';
import { validateGuides } from '../src/lib/guide-validation';
import { services, todayIso } from '../src/lib/catalog';
import { guideSources } from '../src/data/subscription-management/sources';

const report = validateCatalog();
const today = todayIso();
report.errors.push(...validateGuides(services, today));
const staleLimit = Date.parse(`${today}T00:00:00Z`) - 45 * 86400000;
for (const source of guideSources) {
  if (Date.parse(`${source.lastReviewedAt}T00:00:00Z`) < staleLimit) {
    report.warnings.push(`La fuente de guía ${source.id} no se revisa desde ${source.lastReviewedAt}.`);
  }
}
console.log('Abonito — revisión de datos');
if (report.warnings.length) {
  console.log('\nAvisos');
  for (const warning of report.warnings) console.log(`- ${warning}`);
}
if (report.errors.length) {
  console.error('\nErrores');
  for (const error of report.errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('\nLos datos pasan la validación.');
