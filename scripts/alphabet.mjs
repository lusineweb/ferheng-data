// Kurmanji alphabetical order, shared by the data build and the app (src/lib/alphabet.ts).
export const ALPHABET = 'a b c ç d e ê f g h i î j k l m n o p q r s ş t u û v w x y z'.split(' ');
const RANK = new Map(ALPHABET.map((l, i) => [l, i + 1]));

/** Lower-case letters without marks that are not part of the alphabet (á → a, ü → u …). */
export function fold(s) {
  return s.replace(/[Iİ]/g, 'i').toLowerCase().replace(/i̇/g, 'i').replace(/ı/g, 'i').replace(/[’`´]/g, "'")
    .replace(/[áàâä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i').replace(/[óòôö]/g, 'o').replace(/[úùü]/g, 'u');
}

/** Same as fold, but also without the Kurmanji marks: for forgiving search (sêv ≈ sev). */
export const loose = s => fold(s).replace(/ç/g, 'c').replace(/ê/g, 'e').replace(/î/g, 'i').replace(/ş/g, 's').replace(/û/g, 'u').replace(/[^a-z0-9]/g, '');

export function compareKu(a, b) {
  const x = fold(a), y = fold(b);
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (x[i] === y[i]) continue;
    const r = (RANK.get(x[i]) ?? 100 + x.charCodeAt(i)) - (RANK.get(y[i]) ?? 100 + y.charCodeAt(i));
    if (r) return r;
  }
  return x.length - y.length || (a < b ? -1 : a > b ? 1 : 0);
}

const ASCII = { 'ç': 'c1', 'ê': 'e1', 'î': 'i1', 'ş': 's1', 'û': 'u1' };
/** File-name-safe key made of the first n letters of a word: "şîn", 2 → "s1i1". */
export function prefixKey(word, n) {
  const letters = [...fold(word).replace(/[^a-z0-9çêîşû]/g, '')].slice(0, n);
  return letters.map(l => ASCII[l] ?? (/[a-z]/.test(l) ? l : '_')).join('') || '_';
}
/** The data shard a word lives in: its first two letters, or three for the big groups listed in `split`. */
export function shardKey(word, split) {
  const two = prefixKey(word, 2);
  return split.includes(two) ? prefixKey(word, 3) : two;
}
