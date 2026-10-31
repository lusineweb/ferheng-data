// English translations of each entry (first translation table only), used to find pictures:
//   node scripts/translations.mjs ku-sections.jsonl > en.json
// Not shipped in the app; the dictionary itself stays Kurmanji–Kurmanji.
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

const out = {};
const rl = createInterface({ input: createReadStream(process.argv[2]), crlfDelay: Infinity });
for await (const line of rl) {
  if (!line) continue;
  const { t, s } = JSON.parse(line);
  // the first translation table of the first part of speech that has one
  const m = s.match(/====\s*Werger\s*====([\s\S]*?)(?=\n==|$)/);
  if (!m) continue;
  const table = m[1].split(/\{\{werger-(?:bin|nav)\}\}/)[0];
  const en = table.match(/^\*\s*\{\{Z\|en\}\}:(.*)$/m);
  if (!en) continue;
  const words = [...en[1].matchAll(/\{\{W[+-]?\|en\|([^|}]+)/g)].map(x => x[1].replace(/\[\[|\]\]/g, '').trim()).filter(Boolean);
  if (words.length) out[t] = [...new Set(words)].slice(0, 4);
}
process.stdout.write(JSON.stringify(out));
console.error(`${Object.keys(out).length} words with an English translation`);
