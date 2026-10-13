import { buildKnowledge } from '../src/lib/assistant/knowledge';
import { createAssistant, EMPTY_CONTEXT } from '../src/lib/assistant/engine';

const assistant = createAssistant(buildKnowledge(), {
  loadQuotes: async () => [{ currency: 'USD', name: 'Dólar Blue', origin: 'BLUE', buy: 1400, sell: 1420, updatedAt: '2026-10-13T12:00:00Z', change: null }],
});
let context = EMPTY_CONTEXT;
for (const question of process.argv.slice(2)) {
  const reply = await assistant.respond(question, context);
  context = reply.context;
  const { answer } = reply;
  console.log(`\n> ${question}\n[${answer.intent}${answer.answered ? '' : ' · sin dato'}] ${answer.serviceIds.join(',')}`);
  for (const paragraph of answer.paragraphs) console.log(`  ${paragraph}`);
  if (answer.table) {
    console.log(`  | ${answer.table.head.join(' | ')}`);
    for (const row of answer.table.rows) console.log(`  | ${row.join(' | ')}`);
  }
  for (const link of answer.links) console.log(`  → ${link.label}: ${link.href}`);
  for (const source of answer.sources) console.log(`  ※ ${source.label}: ${source.href} (${source.reviewedAt})`);
  if (answer.suggestions.length) console.log(`  ? ${answer.suggestions.join(' / ')}`);
}
