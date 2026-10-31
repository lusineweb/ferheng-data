// Reads a Wîkîferheng XML dump on stdin (already decompressed) and writes one JSON line per
// article that has a Kurmanji section: {"t": title, "s": kurmanji wikitext}.
//   bunzip2 -c kuwiktionary-latest-pages-articles.xml.bz2 | node scripts/sections.mjs > ku-sections.jsonl
import { createInterface } from 'node:readline';

const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
let title = null, ns = null, inText = false, buf = [];
let pages = 0, kept = 0;

function flush() {
  if (ns !== '0' || !title) return;
  const text = decode(buf.join('\n'));
  const m = text.match(/(?:^|\n)==\s*\{\{ziman\|ku\}\}\s*==([\s\S]*?)(?=\n==[^=]|$)/);
  if (m) { kept++; process.stdout.write(JSON.stringify({ t: title, s: m[1] }) + '\n'); }
}

for await (const line of rl) {
  if (inText) {
    const end = line.indexOf('</text>');
    if (end >= 0) { buf.push(line.slice(0, end)); inText = false; flush(); } else buf.push(line);
    continue;
  }
  let m;
  if ((m = line.match(/^\s*<title>(.*)<\/title>/))) { title = decode(m[1]); ns = null; buf = []; pages++; }
  else if ((m = line.match(/^\s*<ns>(\d+)<\/ns>/))) ns = m[1];
  else if ((m = line.match(/<text[^>]*?(\/)?>(.*)$/))) {
    if (m[1]) { buf = []; continue; }
    const rest = m[2];
    const end = rest.indexOf('</text>');
    if (end >= 0) { buf = [rest.slice(0, end)]; flush(); } else { buf = [rest]; inText = true; }
  }
}
console.error(`${pages} pages, ${kept} with a Kurmanji section`);
