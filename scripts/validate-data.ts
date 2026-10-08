import { validateCatalog } from '../src/lib/data-validation';

const report = validateCatalog();
console.log('Cuánto Pago — revisión de datos');
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
