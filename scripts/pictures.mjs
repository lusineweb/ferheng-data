// Pictures for words that have none on Wîkîferheng:
// 1. Wikidata: English lexeme whose sense is linked to an item with a picture (apple → Q89 → photo),
//    found through the entry's first English translation and the same part of speech;
// 2. a Kurmanji Wikipedia article with the same title and a picture (nouns and names only);
// 3. otherwise an emoji whose English name is exactly that translation (🐧 pêngiwîn).
// Pictures that are not suitable for an app for all ages are left out.
import { existsSync, readFileSync } from 'node:fs';

const UNSAFE = /\b(penis(es)?|vagina[ls]?|vulva|clitoris|testic\w*|scrotum|anus|anal|buttocks?|breasts?|nipples?|nude|naked|nudity|sex|sexual\w*|coitus|intercourse|masturbat\w*|porn\w*|erotic\w*|genital\w*|phallus|prostitut\w*|rape|raped|corpses?|cadavers?|autopsy|feces|faeces|excrement|defecat\w*|urine|urinat\w*|vomit\w*|gore|torture\w*|lynch\w*|execution|hanged|syphilis|condoms?|ejaculat\w*|semen|sperm|orgasm|fetish|bdsm|lingerie|topless|schlong|shlong|nazi\w*|swastika)\b/i;
export const unsafe = s => UNSAFE.test(s);

const CAT = { nd: 'Q1084', lk: 'Q24905', rd: 'Q34698', hk: 'Q380057' };
const IMG = /\.(jpe?g|png|gif|svg|webp|tiff?)$/i;

export function loadPictures({ enPath, wdPath, emojiPath }) {
  const en = enPath && existsSync(enPath) ? JSON.parse(readFileSync(enPath, 'utf8')) : {};
  const wd = wdPath && existsSync(wdPath) ? JSON.parse(readFileSync(wdPath, 'utf8')) : { en: [], kuwiki: [] };
  const lex = new Map();
  for (const [lemma, cat, sense, img] of wd.en ?? []) {
    if (!IMG.test(img) || unsafe(img) || unsafe(lemma)) continue;
    const k = lemma.toLowerCase() + '|' + cat, n = Number(sense.split('-S')[1]) || 99;
    const prev = lex.get(k);
    if (!prev || n < prev.n) lex.set(k, { n, img });
  }
  const wiki = new Map();
  for (const [title, img] of wd.kuwiki ?? []) if (IMG.test(img) && !unsafe(img) && !wiki.has(title)) wiki.set(title, img);
  const emoji = new Map();
  if (emojiPath && existsSync(emojiPath)) {
    for (const e of JSON.parse(readFileSync(emojiPath, 'utf8'))) {
      if ([0, 1, 2, 9].includes(e.group) || unsafe(e.label)) continue; // no faces, people, flags
      const label = e.label.toLowerCase();
      if (!emoji.has(label)) emoji.set(label, e.emoji);
      // animals, plants and food: "red apple" also stands for "apple"
      const last = label.split(' ').pop();
      if ((e.group === 3 || e.group === 4) && label.split(' ').length <= 2 && !emoji.has(last)) emoji.set(last, e.emoji);
    }
  }
  const stats = { wikidata: 0, wikipedia: 0, emoji: 0 };

  /** { i: Commons file } or { em: emoji } or null, for a word without a picture of its own. */
  function pick(word, posList) {
    const tr = (en[word] ?? []).filter(x => !unsafe(x));
    if (tr.length !== (en[word] ?? []).length) return null; // a translation itself is not for all ages
    const first = tr[0]?.toLowerCase();
    if (first) for (const p of posList) {
      const hit = CAT[p] && lex.get(first + '|' + CAT[p]);
      if (hit) { stats.wikidata++; return { i: hit.img }; }
    }
    if (posList.some(p => p === 'nd' || p === 'sn')) {
      const img = wiki.get(word) ?? wiki.get(word[0].toUpperCase() + word.slice(1));
      if (img) { stats.wikipedia++; return { i: img }; }
    }
    if (first && emoji.has(first)) { stats.emoji++; return { em: emoji.get(first) }; }
    return null;
  }
  return { pick, stats };
}
