// ku-sections.jsonl (from sections.mjs) → src/data/words.json + manifest.json
//   node scripts/extract.mjs ku-sections.jsonl [tewandin-verbs.json]
// The optional Tewandin verb list adds present/past roots to verbs and marks the ones
// whose full conjugation is in the Tewandin app.
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { compareKu, prefixKey, shardKey } from './alphabet.mjs';

const SPLIT_BYTES = 350000;
import { loadPictures, unsafe } from './pictures.mjs';
import { clean, example, POS, quote, templates, wordList } from './wikitext.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [input, verbsPath] = process.argv.slice(2);
if (!input) { console.error('usage: node scripts/extract.mjs ku-sections.jsonl [tewandin-verbs.json]'); process.exit(1); }
// optional inputs for pictures (see pictures.mjs): en.json from translations.mjs, data/wikidata-images.json, emoji names
const pictures = loadPictures({
  enPath: join(dirname(input), 'en.json'),
  wdPath: join(root, 'data', 'wikidata-images.json'),
  emojiPath: join(root, 'node_modules', 'emojibase-data', 'en', 'data.json'),
});

const LATIN = /^[A-Za-zÇçÊêÎîŞşÛûÜüÖöÀ-ÿ'’\-\s.,!?0-9()]+$/;
const MAX_SENSES = 8, MAX_EX = 3;

const tewandin = new Map();
if (verbsPath && existsSync(verbsPath)) {
  for (const v of JSON.parse(readFileSync(verbsPath, 'utf8'))) tewandin.set(v.inf, v);
  console.log(`${tewandin.size} Tewandin verbs`);
}

function parseSection(title, s) {
  const lines = s.split('\n');
  const image = (s.match(/\[\[(?:Wêne|File|Image|Pêvek|Dosya):([^|\]]+)/i) || [])[1]?.trim();
  const entries = [];
  let cur = null, sub = null, sense = null;
  const lists = {};

  for (const line of lines) {
    let m;
    if ((m = line.match(/^===\s*([^=]+?)\s*===\s*$/))) {
      const name = m[1].replace(/\s*\d+$/, '').trim();
      cur = POS[name] ? { p: POS[name], s: [] } : null;
      if (cur) entries.push(cur);
      sub = null; sense = null;
      continue;
    }
    if ((m = line.match(/^====+\s*([^=]+?)\s*====+\s*$/))) { sub = m[1].trim(); sense = null; continue; }
    if (!cur) continue;

    if (sub) {
      // word lists under the entry
      const key = { 'Hevmane': 'sy', 'Dijmane': 'an', 'Jê': 'j', 'Formên alternatîv': 'al', 'Têkildar': 'tk' }[sub];
      if (key && line.trim()) (lists[key] ??= []).push(...wordList(line));
      continue;
    }

    // header templates: gender, verb type
    for (const t of templates(line)) {
      if (t.name === 'navdêr' && t.named.z) cur.g = { m: 'mê', n: 'nêr', nt: 'nêr', 'm/n': 'mê/nêr', 'n/m': 'nêr/mê', mn: 'mê/nêr' }[t.named.z] ?? undefined;
      if (t.name === 'lêker' && t.named.c) {
        const [k, tr] = t.named.c.split('-');
        cur.t = tr === 'gh' ? 'gh' : tr === 'ngh' ? 'ngh' : undefined;
        cur.k = { x: 'xwerû', d: 'pêkhatî', h: 'hevedudanî' }[k];
      }
      if (t.name === 'ku-tewîn-lk') {
        if (t.named.form === 'gerguhêz') cur.t = 'gh'; else if (t.named.form === 'negerguhêz') cur.t = 'ngh';
        if (t.named.niha) cur.rn = t.named.niha; if (t.named['borî']) cur.rb = t.named['borî'];
      }
    }

    if (/^#[^:*#]/.test(line) || /^# /.test(line)) {
      if (/^##/.test(line)) continue;
      if (/\{\{(mane\?|wate\?|bêwate|bêmane|formeke peyvê|ku-raboriya|ku-dema|ku-fermanî|ku-merciya|ku-dahatiya|ku-Latn)/.test(line)) { sense = null; continue; }
      const labels = [];
      const d = clean(line.replace(/^#\s*/, ''), labels);
      if (!d || d.length < 2) { sense = null; continue; }
      sense = { d: d.length > 600 ? d.slice(0, 599) + '…' : d };
      const l = [...new Set(labels.map(x => x.trim()).filter(x => x && x.length < 30))];
      if (l.length) sense.l = l;
      cur.s.push(sense);
      continue;
    }
    if (!sense) continue;
    if (/^#:/.test(line)) {
      const e = example(line);
      if (!e) continue;
      if (e.syn) (sense.sy ??= []).push(...e.syn);
      else if (e.ant) (sense.an ??= []).push(...e.ant);
      else if ((sense.x ??= []).length < MAX_EX) sense.x.push(e);
    } else if (/^#\*/.test(line) && !sense.q) {
      const q = quote(line);
      if (q) sense.q = q;
    }
  }

  const uniq = (xs, max) => [...new Set(xs.map(x => x.trim()).filter(x => x && x !== title && x.length < 40 && LATIN.test(x)))].slice(0, max);
  const out = [];
  for (const e of entries) {
    e.s = e.s.slice(0, MAX_SENSES);
    for (const s of e.s) {
      if (s.sy) { s.sy = uniq(s.sy, 12); if (!s.sy.length) delete s.sy; }
      if (s.an) { s.an = uniq(s.an, 8); if (!s.an.length) delete s.an; }
    }
    if (!e.s.length) continue;
    if (e.p === 'lk') {
      const v = tewandin.get(title);
      if (v) { e.rn = v.ps; e.rb = v.pp; e.tw = 1; if (!e.t) e.t = v.tr === 'G' ? 'gh' : 'ngh'; }
    }
    for (const k of Object.keys(e)) if (e[k] === undefined) delete e[k];
    out.push(e);
  }
  if (!out.length) return null;
  const w = { w: title, e: out };
  if (image && /\.(jpe?g|png|gif|svg|webp|tiff?)$/i.test(image)) w.i = image.replace(/_/g, ' ');
  for (const [k, max] of [['sy', 15], ['an', 10], ['j', 40], ['al', 8], ['tk', 20]]) if (lists[k]) { const v = uniq(lists[k], max); if (v.length) w[k] = v; }
  return w;
}

const words = [];
const rl = createInterface({ input: createReadStream(input), crlfDelay: Infinity });
for await (const line of rl) {
  if (!line) continue;
  const { t, s } = JSON.parse(line);
  if (!LATIN.test(t)) continue;
  const w = parseSection(t, s);
  if (w) words.push(w);
}

// keep only links / word lists that point to an entry we have
const have = new Set(words.map(w => w.w));
const fixLinks = s => s.replace(/\{([^{}|]+)(?:\|([^{}]+))?\}/g, (all, text, target) => (have.has(target ?? text) && (target ?? text) !== undefined ? all : text));
for (const w of words) {
  for (const e of w.e) for (const s of e.s) {
    s.d = fixLinks(s.d);
    if (s.x) for (const x of s.x) { x.k = fixLinks(x.k); if (x.m) x.m = fixLinks(x.m); }
    if (s.q) s.q.k = fixLinks(s.q.k);
  }
  for (const k of ['j', 'tk', 'al']) if (w[k]) { w[k] = w[k].filter(x => have.has(x)); if (!w[k].length) delete w[k]; }
}

// Pictures: Wîkîferheng's own first, then Wikidata / Wikipedia, then an emoji (pictures.mjs).
for (const w of words) {
  if (w.i && unsafe(w.i)) delete w.i;
  if (w.i || !w.e) continue;
  const found = pictures.pick(w.w, [...new Set(w.e.map(e => e.p))]);
  if (found?.i) { w.i = found.i.replace(/_/g, ' '); w.is = 'wd'; } else if (found?.em) w.em = found.em;
}
console.log('pictures added:', pictures.stats);

// Spelling variants ("Guhertoya {xirab}") become tiny pointers to the main entry.
const VAR = /^(Guhertoya|Binêre:|Rastnivîsa rast:) \{([^{}|]+)(?:\|([^{}]+))?\}\.?$/;
for (const w of words) {
  const senses = w.e.flatMap(e => e.s);
  const targets = senses.map(s => (s.x || s.q ? null : (s.d.match(VAR) || [])[3] ?? (s.d.match(VAR) || [])[2]));
  if (targets.length && targets.every(t => t && t === targets[0]) && have.has(targets[0]) && (!w.i || w.is)) {
    w.v = targets[0];
    w.vp = [...new Set(w.e.map(e => e.p))];
    delete w.e; delete w.j; delete w.tk; delete w.sy; delete w.an; delete w.al; delete w.i; delete w.is; delete w.em;
  }
}

words.sort((a, b) => compareKu(a.w, b.w));

// index.txt: word \t part-of-speech codes \t flags (i picture, e emoji, t in Tewandin) \t main word (for variants)
// shards/<key>.json: { word: entry } for all words starting with the same letters (see shardKey):
// the buckets stay the same from one build to the next, so the app downloads only those that changed.
const dir = join(root, 'src', 'data');
rmSync(join(dir, 'shards'), { recursive: true, force: true });
mkdirSync(join(dir, 'shards'), { recursive: true });
const sha = t => createHash('sha256').update(t).digest('hex').slice(0, 16);
const buckets2 = new Map();
for (const w of words) { const k = prefixKey(w.w, 2); buckets2.set(k, (buckets2.get(k) ?? 0) + JSON.stringify(w).length); }
const split = [...buckets2].filter(([, n]) => n > SPLIT_BYTES).map(([k]) => k).sort();
const groups = new Map();
for (const w of words) { const k = shardKey(w.w, split); if (!groups.has(k)) groups.set(k, {}); const { w: word, ...rest } = w; groups.get(k)[word] = rest; }
const shards = {};
for (const [k, obj] of [...groups].sort(([a], [b]) => (a < b ? -1 : 1))) {
  const text = JSON.stringify(obj);
  writeFileSync(join(dir, 'shards', k + '.json'), text);
  shards[k] = { sha: sha(text), bytes: Buffer.byteLength(text) };
}
const index = words.map(w => {
  const pos = w.v ? w.vp : [...new Set(w.e.map(e => e.p))];
  const flags = (w.i ? 'i' : '') + (w.em ? 'e' : '') + (w.e?.some(e => e.tw) ? 't' : '');
  return [w.w, pos.join(','), flags, w.v ?? ''].join('\t').replace(/\t+$/, '');
});
const indexText = index.join('\n') + '\n';
writeFileSync(join(dir, 'index.txt'), indexText);
rmSync(join(dir, 'words.json'), { force: true });

let previous = null;
try { previous = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')); } catch {}
const now = new Date();
const full = words.filter(w => w.e);
const stats = {
  count: words.length,
  entries: full.length,
  verbs: full.filter(w => w.e.some(e => e.p === 'lk')).length,
  images: full.filter(w => w.i).length,
  examples: full.reduce((n, w) => n + w.e.reduce((m, e) => m + e.s.reduce((k, s) => k + (s.x?.length ?? 0) + (s.q ? 1 : 0), 0), 0), 0),
};
const manifest = {
  version: Number(now.toISOString().replace(/\D/g, '').slice(0, 12)),
  ...stats,
  added: previous ? Math.max(0, stats.count - (previous.count || 0)) : 0,
  index: { sha: sha(indexText), bytes: Buffer.byteLength(indexText) },
  split,
  shards,
  built: now.toISOString(),
  ...(previous?.app ? { app: previous.app } : {}),
};
writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log({ ...manifest, shards: Object.keys(shards).length, biggest: Math.max(...Object.values(shards).map(x => x.bytes)) });
