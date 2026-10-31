// Turns Wîkîferheng wikitext into the small, plain structures the Ferheng app reads.
// Links are kept as {text|target} (or {text} when both are the same) so the app can make
// every word in a definition tappable; bold from '''…''' becomes **…**.

/** Part-of-speech headings that are real dictionary entries (form-of headings are skipped). */
export const POS = {
  'Navdêr': 'nd', 'Lêker': 'lk', 'Rengdêr': 'rd', 'Hoker': 'hk', 'Biwêj': 'bw', 'Gotineke pêşiyan': 'gp',
  'Serenav': 'sn', 'Cînav': 'cn', 'Daçek': 'dç', 'Pêşdaçek': 'dç', 'Paşdaçek': 'dç', 'Bazinedaçek': 'dç',
  'Hejmar': 'hj', 'Baneşan': 'bn', 'Girêdek': 'gd', 'Pêşgir': 'pg', 'Paşgir': 'pş', 'Navgir': 'pş', 'Kurtenav': 'kn',
  'Îfade': 'bw', 'Hevok': 'bw', 'Navder': 'nd',
};

const LABEL_TEMPLATES = new Set(['f', 'e', 'dever', 'reşwanî', 'tirkmancî', 'badînî', 'reng']);
const NO_DEF = /\{\{(mane\?|wate\?|bêwate|bêmane|formeke peyvê|ku-raboriya|ku-dema|ku-fermanî|ku-merciya|ku-dahatiya|ku-Latn)/;
const VARIANT = { guharto: 'Guhertoya', guherto: 'Guhertoya', 'awayekî din': 'Guhertoya', rastnivîs: 'Rastnivîsa rast:', bnr: 'Binêre:', bnr2: 'Binêre:', binêre: 'Binêre:', şaşnivîs: 'Rastnivîsa rast:' };

/** Splits "a|b|c=d" at top-level pipes only. */
export function splitParams(s) {
  const out = []; let depth = 0, cur = '';
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2);
    if (two === '{{' || two === '[[') { depth++; cur += two; i++; continue; }
    if ((two === '}}' || two === ']]') && depth > 0) { depth--; cur += two; i++; continue; }
    if (s[i] === '|' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += s[i];
  }
  out.push(cur);
  const pos = [], named = {};
  for (const p of out) {
    const m = p.match(/^\s*([\w\-ûîêçşÛÎÊÇŞ]+)\s*=([\s\S]*)$/);
    if (m) named[m[1].trim()] = m[2].trim(); else pos.push(p.trim());
  }
  return { name: (pos.shift() || '').trim(), pos, named };
}

/** Finds the template calls at the top level of a string. */
export function templates(s) {
  const out = []; let i = 0;
  while ((i = s.indexOf('{{', i)) >= 0) {
    let depth = 0, j = i;
    for (; j < s.length - 1; j++) {
      if (s[j] === '{' && s[j + 1] === '{') { depth++; j++; } else if (s[j] === '}' && s[j + 1] === '}') { depth--; j++; if (depth === 0) break; }
    }
    out.push({ start: i, end: j + 1, ...splitParams(s.slice(i + 2, j - 1)) });
    i = j + 1;
  }
  return out;
}

const link = (text, target) => {
  text = text.trim(); target = (target ?? text).trim().replace(/#.*$/, '');
  if (!text) return '';
  if (!target || /:/.test(target)) return text;
  return target === text ? `{${text}}` : `{${text}|${target}}`;
};

/** Replace every template in s using fn(t) → string. */
function replaceTemplates(s, fn) {
  let out = '', last = 0;
  for (const t of templates(s)) { out += s.slice(last, t.start) + fn(t); last = t.end + 1; }
  return out + s.slice(last);
}

/** Plain text with {links}; used for definitions and examples. */
export function clean(s, labels = []) {
  s = s.replace(/\uFFFD/g, '').replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  s = replaceTemplates(s, t => {
    const n = t.name;
    if (LABEL_TEMPLATES.has(n)) { const ls = (n === 'dever' || n === 'reşwanî' || n === 'tirkmancî' || n === 'badînî' ? [n === 'dever' ? t.pos[0] : n] : t.pos.slice(n === 'reng' ? 0 : 1)).filter(x => x && !/^(û|an|yan|bi taybetî|,)$/.test(x)); labels.push(...ls.map(x => x.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1'))); return ''; }
    if (VARIANT[n]) { const args = t.pos[0] === 'ku' ? t.pos.slice(1) : t.pos; const ws = args.filter(Boolean).map(w => link(w)).join(', '); return ws ? `${VARIANT[n]} ${ws}` + (t.named.w ? ` (${clean(t.named.w)})` : '') : ''; }
    if (n === 'g' || n === 'b' || n === 'm' || n === 'l' || n === 'w') {
      if (n === 'g' && t.pos[0] && t.pos[0] !== 'ku') return '';
      const args = n === 'w' ? t.pos : t.pos.slice(1);
      const target = args[0], text = args[1] || args[0];
      return target ? link(text, target) : '';
    }
    if (n === 'nk' || n === 'navkes') return t.pos[1] ? link(t.pos[1]) : '';
    if (n === 'kontrol') return t.pos.join(', ');
    if (n === 'mane') return t.pos[0] || '';
    if (n === 'bajar' || n === 'navçe' || n === 'parêzgeh') { labels.push(n); return ''; }
    if (n === 'q') return t.pos[1] ? `„${t.pos[1]}“` : '';
    return '';
  });
  s = s
    .replace(/\[\[(?:Wêne|File|Image|Pêvek|Dosya|Kategorî|Category):[^\]]*(\[\[[^\]]*\]\][^\]]*)*\]\]/gi, '')
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, (_, t, x) => link(x, t))
    .replace(/\[\[([^\]]*)\]\]/g, (_, t) => link(t))
    .replace(/'''(.*?)'''/g, '**$1**')
    .replace(/''/g, '')
    .replace(/<br\s*\/?>|<\/br>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/^[\s,.;:]+/, '')
    .replace(/\(\s*\)/g, '')
    .trim();
  return s;
}

/** Words from a template like {{hevmane|ku|a|b}} or a list line "* [[a]], [[b]]". */
export function wordList(line) {
  const out = [];
  for (const t of templates(line)) {
    if (/^(hevmane|hevmaneyên peyvê|hevmaneya peyvê|hevwate|dijmane|dijmaneyên peyvê|kol\d?|hw|herwiha|l|g)$/.test(t.name)) {
      const args = t.pos[0] === 'ku' ? t.pos.slice(1) : t.pos;
      for (const a of args) for (const part of a.split('\n')) { const w = part.replace(/<[^>]*>/g, '').replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').trim(); if (w && !/[=]/.test(w)) out.push(w); }
    }
  }
  for (const m of line.replace(/\{\{[\s\S]*?\}\}/g, '').matchAll(/\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]/g)) if (!/:/.test(m[1])) out.push(m[1].trim());
  return out;
}

const trimTo = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);

/** One literary quotation line (#*) → { k, src } */
export function quote(line) {
  const t = templates(line)[0];
  if (!t) { const k = clean(line.replace(/^#\*+:?\s*/, '')); return k ? { k: trimTo(k, 320) } : null; }
  const k = clean(t.named['jêgirtin'] || (t.name === 'mk' || t.name === 'nm' ? t.pos[1] : '') || '');
  if (!k || /[؀-ۿ]/.test(k)) return null;
  let src = '';
  if (t.name.startsWith('J:')) { const [, a, b, y] = t.name.split(':'); src = [a, b].filter(Boolean).join(', ') + (y ? ` (${y})` : ''); }
  else {
    const a = t.named['nivîskar'], b = t.named['sernav'] || t.named['malper'] || t.named['kovar'], y = t.named['sal'] || (t.named['dîrok'] || '').slice(-4);
    src = clean([a, b].filter(Boolean).join(', ') + (y ? ` (${y})` : ''));
    if (!src && t.pos[1]) src = clean(t.pos[1]);
  }
  return { k: trimTo(k, 320), ...(src ? { src: trimTo(src.replace(/[{}]/g, '').replace(/\|[^,)]*/g, ''), 90) } : {}) };
}

/** One example line (#:) → { k, m? } or { syn } / { ant } */
export function example(line) {
  const body = line.replace(/^#:+\s*/, '');
  const ts = templates(body);
  const t = ts[0];
  if (t && t.start === 0) {
    if (/^(hevmane|hevmaneyên peyvê|hevmaneya peyvê|hevwate)$/.test(t.name)) return { syn: wordList(body) };
    if (/^(dijmane|dijmaneyên peyvê)$/.test(t.name)) return { ant: wordList(body) };
    if (/^(mk|nm|nimûne|mînak)$/.test(t.name)) {
      const args = t.pos[0] === 'ku' ? t.pos.slice(1) : t.pos;
      const k = clean(args[0] || ''), m = clean(args[1] || t.named.w || t.named.wate || '');
      return k ? { k: trimTo(k, 320), ...(m ? { m: trimTo(m, 240) } : {}) } : null;
    }
    return null;
  }
  if (!/^''/.test(body)) return null;
  const parts = body.split(/\s+(?:―|—|→|-)\s+/);
  const k = clean(parts[0]);
  const m = parts[1] ? clean(parts.slice(1).join(' — ')) : '';
  return k && !/[؀-ۿ]/.test(k) ? { k: trimTo(k, 320), ...(m ? { m: trimTo(m, 240) } : {}) } : null;
}
