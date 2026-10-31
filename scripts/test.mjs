// Sanity checks for the built data; also a unit test of the wikitext cleaner.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clean, example } from './wikitext.mjs';
import { compareKu } from './alphabet.mjs';

assert.equal(clean("[[xanî|Xaniyê]] ku [[malbat]]ek tê ve [[jîn|dijî]]"), '{Xaniyê|xanî} ku {malbat}ek tê ve {dijî|jîn}');
assert.equal(clean("{{guharto|ku|xirab}}"), 'Guhertoya {xirab}');
const l = []; clean('{{f|ku|devokî}} xirab', l); assert.deepEqual(l, ['devokî']);
assert.deepEqual(example("#: {{mk|ku|'''Mala''' wî dûr e.|Cihê ew lê dijî dûr e.|birêz=1}}"), { k: '**Mala** wî dûr e.', m: 'Cihê ew lê dijî dûr e.' });
assert.deepEqual(example('#: {{hevmane|ku|malbat|ayle}}'), { syn: ['malbat', 'ayle'] });
assert.ok(compareKu('ça', 'cz') > 0 && compareKu('ê', 'e') > 0 && compareKu('b', 'a') > 0);

const dir = new URL('../src/data/', import.meta.url);
const m = JSON.parse(readFileSync(new URL('manifest.json', dir)));
const index = readFileSync(new URL('index.txt', dir), 'utf8').trim().split('\n');
assert.equal(index.length, m.count);
assert.ok(m.count > 100000 && m.entries > 50000, 'too few words');
const first = Object.keys(m.shards)[0];

const { shardKey } = await import('./alphabet.mjs');
for (const line of index) { const [w] = line.split('\t'); const k = shardKey(w, m.split); assert.ok(m.shards[k], 'shard ' + k); }
const sample = JSON.parse(readFileSync(new URL('shards/' + shardKey('xwarin', m.split) + '.json', dir))); assert.ok(sample.xwarin?.e?.length, 'xwarin');

console.log('ok', m.count, 'words,', Object.keys(m.shards).length, 'shards', first);
