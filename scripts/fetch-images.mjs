// Asks Wikidata which words have a picture, writes data/wikidata-images.json (used by pictures.mjs).
// Keeps the previous file when the query service does not answer.
import { writeFileSync } from 'node:fs';

const UA = 'FerhengBot/1.0 (https://github.com/lusineweb/ferheng-data)';
async function sparql(q) {
  const r = await fetch('https://query.wikidata.org/sparql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/sparql-results+json', 'User-Agent': UA },
    body: 'query=' + encodeURIComponent(q),
  });
  if (!r.ok) throw new Error(`Wikidata HTTP ${r.status}`);
  const v = x => (x.value.startsWith('http') ? decodeURIComponent(x.value.split('/').pop()) : x.value);
  return (await r.json()).results.bindings.map(b => Object.values(b).map(v));
}

try {
  // English lexemes whose sense is a Wikidata item with a picture: [lemma, lexical category, sense, file]
  const en = await sparql('SELECT ?lemma ?cat ?s ?image WHERE { ?l dct:language wd:Q1860; wikibase:lemma ?lemma; wikibase:lexicalCategory ?cat; ontolex:sense ?s. ?s wdt:P5137 ?item. ?item wdt:P18 ?image. }');
  // Kurmanji Wikipedia articles with a picture (no people, no places): [title, file]
  const kuwiki = await sparql('SELECT ?title ?image WHERE { ?a schema:isPartOf <https://ku.wikipedia.org/>; schema:about ?item; schema:name ?title. ?item wdt:P18 ?image. MINUS { ?item wdt:P31 wd:Q5 } MINUS { ?item wdt:P625 [] } }');
  if (en.length < 10000) throw new Error(`only ${en.length} rows`);
  writeFileSync(new URL('../data/wikidata-images.json', import.meta.url), JSON.stringify({ en, kuwiki }));
  console.log(`${en.length} lexeme pictures, ${kuwiki.length} Wikipedia pictures`);
} catch (e) {
  console.warn(`keeping the previous data/wikidata-images.json: ${e.message}`);
}
