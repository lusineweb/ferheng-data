# ferheng-data

Daneyên ferhenga kurmancî–kurmancî ji bo sepana **Ferheng**, ji [Wîkîferhengê](https://ku.wiktionary.org).

- `src/data/index.txt` — hemû peyv, bi rêza alfabeyê: `peyv ⇥ beşên axaftinê ⇥ hejmara parçeyê ⇥ nîşan (i wêne, t di Tewandinê de) ⇥ peyva sereke (ji bo guhertoyan)`
- `src/data/shards/NNN.json` — wate, mînak, hevmane, wêne… (~120 kB her yek)
- `data/wikidata-images.json` — wêneyên ji Wikidatayê (bi wergera îngilîzî ya peyvê têne dîtin), `scripts/pictures.mjs`
- `src/data/manifest.json` — guhertoya daneyan û sha'ya her parçeyê. Sepan tenê parçeyên guherî dadixe.

Du caran di mehê de (piştî ku Wikimedia dumpeke nû belav dike) GitHub Actions daneyan nû dike: `.github/workflows/update-data.yml`.

Bi destan:

```bash
curl -LO https://dumps.wikimedia.org/kuwiktionary/latest/kuwiktionary-latest-pages-articles.xml.bz2 && mv kuwiktionary-latest-pages-articles.xml.bz2 dump.xml.bz2
curl -Lo tewandin-verbs.json https://raw.githubusercontent.com/lusineweb/tewandin-data/main/src/data/verbs.json
npm run build && npm test
```

## Lîsans

Nivîsên ferhengê ji Wîkîferhengê ne û di bin lîsansa [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) de ne. Wêne ji Wikimedia Commonsê tên û her yek bi lîsansa xwe ye.
