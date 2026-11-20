# ABJAD — Baro Carabiga (English + Soomaali)

ABJAD waa **Progressive Web App (PWA)** lagu baranayo **Carabiga caadiga ah (Modern Standard Arabic)**. Wuxuu leeyahay manhaj xaraf-xaraf, layliyo qoraal, dhageysi, iyo wadahadal gaaban. Interface-ka wuxuu ku shaqeeyaa **Ingiriisi** iyo **Soomaali**, horumarkaana wuxuu ku kaydsan yahay qalabkaaga — server ama akoon looma baahna.

> **Xusuusin:** Mashruucan waa mid asli ah oo ka faa'iideystay *qaabka waxbarasho* ee AlifBee (website + Play Store listing). **Ma xirna AlifBee**, lamana koobiyaan koodhkooda, sawirradooda, ama nuxurkooda.

![Bogga hore](screenshots/landing.png)

| Dashboard | Cashar |
|---|---|
| ![Cutubabka](screenshots/dashboard.png) | ![Cashar](screenshots/lesson.png) |

| Qoris | Wadahadal |
|---|---|
| ![Qoris](screenshots/write.png) | ![Wadahadal](screenshots/dialogue.png) |

![Mobile](screenshots/mobile.png)

---

## 1. Waxa ku jira

- **7 cutub, 58 shay, 28 xaraf Carabi** oo dhamaystiran.
- **4 marxaladood cutub kasta:**
  1. **Baro** — erey/xaraf, dhawaaq, macne, tusaale.
  2. **Tijaabo** — su'aalo doorasho leh (Carabi → macne iyo macne → Carabi).
  3. **Qoris** — ereyada lagu dhiso xarfo isku qasan; xarfaha waxaa lagu tijaabiyaa dhageysi.
  4. **Dib u celin** — wadahadal (cutubada salaamaha/qoyska/cuntada) ama quiz recap.
- **Labada luuqadood** — Ingiriisi default, Soomaali badhanka `SO`; tarjumaad kasta waa la beddeli karaa wakhti kasta.
- **Cod Carabi** — `speechSynthesis` (browser voice) haddii uu qalabkaagu taageero.
- **XP, streak maalmeed, horumar** — `localStorage`.
- **Offline / PWA** — service worker, font Carabi gudaha, install Chrome/Edge.
- **Responsive** — mobile iyo desktop.
- **Local link hub** — `links.html` oo leh link kasta oo cutub/marxalad ah.

---

## 2. Bilowdeg deg ah

### A. Browser kaliya (file://)

`index.html` laba-guji. Wixii barasho wuu shaqeeyaa, laakiin **PWA/offline ma shaqeeyaan** marka `file://` la isticmaalo.

### B. Server maxalli ah (loo talinayaa)

```bash
cd ~/abjad
./serve.sh
```

Kadib fur: **<http://localhost:8090/>**

`serve.sh` waa idempotent: haddii server hore u shaqaynayo, isma dilo; haddii kale wuu kiciyaa oo wuxuu daabacaa linkiyada.

### C. Windows launcher

Desktop-ka waxaa yaal `ABJAD.bat` — laba-guji, wuxuu kiciyaa server-ka WSL-ka oo wuxuu ku furayaa browser-ka.

### D. Amar gaar ah (`abjad`)

`~/.local/bin/abjad` waa la rakibay:

```bash
abjad          # kici server + daabac links
abjad --open   # kici + fur browser
ABJAD_PORT=9000 abjad
```

### E. Auto-start (systemd user)

```bash
systemctl --user status abjad.service
systemctl --user restart abjad.service
systemctl --user disable --now abjad.service   # jooji/auto-start dami
```

---

## 3. Linkiyada localhost-ka

Port default: **8090**. (8080 waxaa isticmaala app kale oo `baro-soomaali` — ha isku qaldin.)

| Link | Waxa uu furayaa |
|---|---|
| <http://localhost:8090/> | Bogga hore / landing |
| <http://localhost:8090/#/learn> | Cutubabka iyo horumarka |
| <http://localhost:8090/#/lesson/letters-1/0> | Xarfaha 1 — Baro |
| <http://localhost:8090/#/lesson/letters-1/1> | Xarfaha 1 — Tijaabo |
| <http://localhost:8090/#/lesson/letters-1/2> | Xarfaha 1 — Qoris |
| <http://localhost:8090/#/lesson/letters-1/3> | Xarfaha 1 — Recap |
| <http://localhost:8090/#/lesson/food/3> | Cunto — Wadahadal |
| <http://localhost:8090/links.html> | **Link hub** (cutub kasta + reset progress) |

Qaabka URL-ka:

```
#/lesson/<unit-id>/<stage-index>
stage 0 = learn, 1 = quiz, 2 = write, 3 = recap
```

Port beddel:

```bash
ABJAD_PORT=9100 ./serve.sh
# -> http://localhost:9100/
```

---

## 4. Manhajka hadda

| # | Cutub | Nooca | Shay |
|---|---|---|---|
| 1 | Alif · Baa · Taa | xaraf | 7 |
| 2 | Dal · Dhal · Raa | xaraf | 7 |
| 3 | Daad · Taa · Ayn | xaraf | 7 |
| 4 | Kaaf · Laam · Yaa | xaraf | 7 |
| 5 | Greetings / Salaamaha | erey | 10 + wadahadal |
| 6 | Family / Qoyska | erey | 10 + wadahadal |
| 7 | Food & drink / Cunto | erey | 10 + wadahadal |

Xarfaha waxay leeyihiin **qaabab** (isolated/initial/medial/final) iyo **tusaale** (erey + macne + emoji).

---

## 5. Qaab dhismeedka faylasha

```
abjad/
├── index.html              # shell-ka app-ka
├── styles.css              # design tokens + dhammaan styles
├── app.js                  # router, views, state, event handlers
├── engine.js               # quiz/write generators, streak, progress
├── curriculum.js           # xogta cutubada (units/cards/dialogues)
├── i18n.js                 # container-ka I18N
├── en.js                   # 98 string Ingiriisi
├── so.js                   # 98 string Soomaali
├── manifest.webmanifest    # PWA metadata
├── sw.js                   # offline cache
├── links.html              # local link hub
├── serve.sh                # server launcher (port 8090)
├── selfcheck.mjs           # tests (Node)
├── icon.svg / icon-192 / icon-512
├── fonts/
│   ├── noto-naskh-arabic.woff2
│   └── OFL.txt
└── screenshots/
```

`app.js` waxay isticmaashaa keliya JS caadi ah (classic scripts), sidaas darteed `file://` ayuu ka shaqeeyaa. Ma jiro build step, bundler, ama npm dependency.

---

## 6. Sida loo daro cutub cusub

Wax ka beddel `curriculum.js`, gudaha `units`:

```js
{
  id: "numbers",                    // unique, lowercase
  icon: "١٢٣",                      // emoji ama xaraf
  title: { en: "Numbers", so: "Tirooyinka" },
  subtitle: { en: "Count from one to ten", so: "Ka tir 1 ilaa 10" },
  cards: [
    { id: "wahid", ar: "وَاحِد", tr: "wāḥid", en: "one", so: "kow", emoji: "1️⃣" },
    { id: "ithnan", ar: "اِثْنَان", tr: "ithnān", en: "two", so: "laba", emoji: "2️⃣" }
    // ugu yaraan 4 card (si 4 options loo helo)
  ],
  dialogue: [ /* optional */ ]
}
```

Shuruudaha:

- `id` waa in uu **unique** yahay (selfcheck wuu qaban doonaa).
- `ar`, `tr`, `en`, `so` waa **lagama maarmaan** card kasta.
- Cutub kasta ugu yaraan **4 cards**.
- Emoji waa optional; `forms`/`example` waa optional (xarfaha).

### Wadahadal

```js
dialogue: [
  { who: "npc", ar: "السَّلامُ عَلَيْكُم", tr: "as-salāmu ʿalaykum",
    en: "Peace be upon you.", so: "Nabadgelyo." },
  { who: "you", options: [
      { ar: "وَعَلَيْكُمُ السَّلام", tr: "wa-ʿalaykumu s-salām",
        en: "And peace be upon you.", so: "Nabadgelyo sidoo kale.", correct: true },
      { ar: "شُكْرًا", tr: "shukran", en: "Thank you.", so: "Mahadsanid." },
      { ar: "مَاء", tr: "māʾ", en: "Water.", so: "Biyo." }
  ]}
]
```

Cutub kasta oo `you` leh waa in uu leeyahay **hal** `correct: true`.

---

## 7. Sida loo daro luuqad cusub

Tusaale: Af-Faransiis (`fr`).

1. Samee `fr.js`:
   ```js
   globalThis.I18N.fr = { /* 98 keys, isla en.js */ };
   ```
2. Ku dar `index.html`:
   ```html
   <script src="fr.js"></script>
   ```
3. Ku dar `i18n.js` container: `{ en: {}, so: {}, fr: {} }`.
4. `app.js`:
   - `loadState()`: oggolow `"fr"`.
   - `setLang()`: oggolow `"fr"`.
   - `langSwitch()`: ku dar badhan `FR` ama `<option>`.
5. Ku dar `card.fr` iyo `unit.title.fr`/`subtitle.fr` xogta (ama `field()` fallback en).
6. `selfcheck.mjs` wuxuu isbarbardhigaa `en`/`so`; ku dar `fr` markaad dhamaysato.
7. `manifest.webmanifest` `lang` waa optional.

**Muhiim:** ha beddelin key magacyada — `selfcheck` wuxuu qaban doonaa key qaldan.

---

## 8. Engine-ka layliyada

`engine.js` wuxuu leeyahay functions puur ah (Node iyo browser labadaba):

| Function | Shaqo |
|---|---|
| `makeQuiz(cards, pool, lang, rand, count)` | su'aalo 4-doorasho ah; distractors marka hore cutubkaas, kadib guud |
| `makeWrite(card, pool, rand, lang)` | `tiles` erey dheer, `listen` xaraf keliya |
| `checkTiles(tapped, answer)` | isbarbardhig harakat-la'aan |
| `nextStreak(lastDay, today, current)` | streak maalmeed (maalin isku xigta) |
| `unitPercent` / `nextStageIndex` / `unitsComplete` | horumarka |

**XP:**

- Marxalad **Baro**: +5
- **Tijaabo/Qoris/Recap**: +10 jawaab kasta oo sax ah
- Cutub dhamaystir (4/4 markii ugu horreysay): +20

**Streak:** maalin kasta oo aad marxalad dhamaysato; haddii maalin la seegto, 1 ayuu ka bilaabmaa.

---

## 9. Horumarka (localStorage)

Key: `abjad.v1`

```json
{
  "lang": "en",
  "xp": 145,
  "streak": 4,
  "lastDay": "2026-11-19",
  "done": {
    "letters-1": [0, 1, 2, 3],
    "letters-2": [0, 1]
  }
}
```

- `done[unitId]` waa array stage indices (0–3).
- Nadiifi: `links.html` → **Nadiifi horumarka**, ama browser console:
  ```js
  localStorage.removeItem("abjad.v1"); location.reload();
  ```

---

## 10. PWA / Offline

- `manifest.webmanifest` — name `ABJAD`, icons 192/512, standalone.
- `sw.js` — cache `abjad-v4` (index, JS, CSS, font, icons, links).
- Offline waxay u baahan tahay **http://localhost** ama HTTPS; `file://` kuma shaqayso.
- Markaad fayl beddesho:
  1. Beddel `CACHE` version (tusaale `abjad-v5`).
  2. Hard reload (Ctrl+Shift+R) ama DevTools → Application → Service Workers → Unregister.
- Chrome/Edge: menu → **Install ABJAD**.

---

## 11. Tests

```bash
node selfcheck.mjs
```

Wuxuu qabtaa:

- 7 units / 58 cards / 28 letters
- unique IDs, fields `ar/tr/en/so`
- dialogue: hal jawaab sax ah
- i18n: key parity EN↔SO + placeholders + dhammaan `t("...")` keys
- quiz: 4 options, distinct, hal correct
- write: tiles answer reachable, wrong order rejected
- streak cases
- manifest/icons/scripts/font/SW assets jiraan

> Browser E2E (Playwright) waxaa lagu sameeyay gudaha; repo-gan kuma jiro si aan dependency loo kordhin. Haddii aad rabto, `npx playwright` ayaa lagu dari karaa.

---

## 12. GitHub

Repo-gani waa local git repo diyaar u ah push. `gh` CLI (v2.105) waa lagu rakibay `~/.local/bin/gh`.

### A. Hal amar (marka `gh` authenticated)

> Hadda `gh auth status` wuxuu sheegayaa **lama xirmin**. Marka hore ku bilow `gh auth login` (browser ama device code), kadib `./push-github.sh`.

```bash
./push-github.sh
```

Wuxuu:

1. Hubinayaa `gh auth status`.
2. Abuuraa repo `abjad` (public) haddii uusan jirin.
3. Push `main`.
4. Daarayaa GitHub Pages (build_type=workflow) haddii suurtagal.

### B. Gacan ku haynta

```bash
gh auth login
cd ~/abjad
git remote add origin https://github.com/<USER>/abjad.git
git push -u origin main
```

Kadib GitHub → **Settings → Pages → Source: GitHub Actions**. Workflow-ga `.github/workflows/pages.yml` wuxuu deploy-gareynayaa `main`.

Repo URL: `https://github.com/<USER>/abjad`
Pages URL: `https://<USER>.github.io/abjad/`

> **Auth:** qalabkan `gh` lama xirmin. `gh auth login` waa in aad adigu samaysaa (browser/device code), kadib `push-github.sh` wuu shaqaynayaa.

---

## 13. Design system

Colors-ka waxaa lagu qeexay `styles.css` (`:root`):

| Token | Qiimo | Isticmaal |
|---|---|---|
| `--brand` | `#103a33` | green madow, nav, text |
| `--brand-soft` | `#e4efe9` | backgrounds |
| `--yellow` | `#f2b53c` | CTA, accent |
| `--yellow-soft` | `#fbf0d2` | cards |
| `--bg` | `#f5f1e8` | page background |
| `--ink` | `#1d2b27` | text |
| `--muted` | `#65736d` | secondary text |
| `--ok` / `--bad` | `#1b6b4a` / `#a83a2a` | feedback |

Beddel colors: beddel tokens-ka, `index.html` `theme-color`, `manifest.webmanifest` `theme_color`, iyo `icon.svg`/PNG haddii la rabo. Font Carabi: `fonts/noto-naskh-arabic.woff2` (Noto Naskh Arabic, OFL).

Layout: mobile-first, hero leh gees amber ah iyo dhibco yar; cards radius 24px; buttons pill.

---

## 14. Dhibaatooyin caadi ah

| Dhibaato | Xal |
|---|---|
| `Address already in use` | `ABJAD_PORT=9000 ./serve.sh` (8080 waxaa isticmaala app kale) |
| Boggu madhan / console errors | Fur `http://localhost:8090/`, ma aha `file://` |
| PWA ma install-gareyn karo | Waa in `http://localhost` ama HTTPS la isticmaalo |
| Wax hore ayaa muuqda (cache) | Hard reload; SW unregister; kordhi `CACHE` version |
| Cod Carabi ma maqalayo | Browser voice-ka `ar-SA` ma jiro; qoraalka/transliteration isticmaal |
| Emoji boxes | Qalabka font emoji ma leh (Windows/Android way leeyihiin) |
| Font Carabi qaldan | `fonts/` folder waa in uu la socdaa; hard reload |

---

## 15. Wixii aan hadda ku jirin (roadmap)

- Akoon/user sync iyo backend.
- Placement test iyo manhaj 10-level ah oo buuxa (halkan 7 cutub ayaa seed ah).
- Speech recognition iyo pronunciation scoring.
- Spaced repetition (SRS) oo rasmi ah.
- Lacag/premium, leaderboard, notifications.

---

## 16. Credits

- Manhajka iyo koodhka: mashruuc asli ah oo loo sameeyay Farat.
- Font: **Noto Naskh Arabic** © Noto Project Authors, SIL Open Font License 1.1 (`fonts/OFL.txt`).
- Dhiirrigelin: qaabka waxbarasho ee AlifBee (**ma xirna**; ma jiro asset/koodh la koobiyaay).
