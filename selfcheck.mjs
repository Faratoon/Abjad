import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = (name) => fs.readFileSync(path.join(dir, name), "utf8");

await import("./i18n.js");
await import("./en.js");
await import("./so.js");
await import("./curriculum.js");
await import("./engine.js");
await import("./users.js");
await import("./passphrase.js");
await import("./auth-config.js");
await import("./auth.js");

const I18N = globalThis.I18N;
const USERS = globalThis.ABJAD_USERS;
assert.equal(USERS.length, 4, "four kid profiles");
assert.deepEqual(USERS.map((u) => u.name), ["Barwaaqo", "Yasin", "Yahye", "Yasir"]);
for (const user of USERS) {
  assert.ok(!("password" in user), "no plaintext passwords in profile seeds");
}

assert.equal(globalThis.ABJAD_AUTH, null, "auth config ships unconfigured");
assert.equal(globalThis.AbjadAuth, null, "email auth stays off until configured");

const P = globalThis.AbjadPass;
assert.equal(P.min, 6, "minimum passphrase length");
const h1 = await P.make("abjad-test-pass");
assert.ok(h1.salt && h1.hash && h1.iter === P.iter, "pbkdf2 hash shape");
assert.equal(await P.check("abjad-test-pass", h1), true, "correct passphrase verifies");
assert.equal(await P.check("abjad-test-pasS", h1), false, "wrong passphrase rejected");
const h2 = await P.make("abjad-test-pass");
assert.notEqual(h1.salt, h2.salt, "salt is random per hash");
assert.equal(await P.check("abjad-test-pass", h2), true, "independent hash verifies");
assert.equal(await P.check("x", { salt: "AA==", hash: "AA==" }), false, "forged short hash rejected");
assert.equal(await P.check("x", null), false, "missing hash rejected");
const { units } = globalThis.CURRICULUM;
const E = globalThis.AbjadEngine;
const appSource = read("app.js");

assert.equal(units.length, 7, "seven units");
assert.equal(units.reduce((n, u) => n + u.cards.length, 0), 58, "58 cards");
assert.equal(
  units.filter((u) => u.id.startsWith("letters")).reduce((n, u) => n + u.cards.length, 0),
  28,
  "all 28 Arabic letters"
);

const ids = new Set();
for (const unit of units) {
  assert.ok(unit.id && unit.title.en && unit.title.so && unit.subtitle.en && unit.subtitle.so, "unit localized");
  assert.ok(unit.cards.length >= 4, "unit has enough cards for 4 options");
  unit.cards.forEach((card) => {
    assert.ok(!ids.has(card.id), "unique card id " + card.id);
    ids.add(card.id);
    for (const key of ["ar", "tr", "en", "so"]) assert.ok(card[key], card.id + " has " + key);
  });
  if (unit.dialogue) {
    assert.ok(unit.dialogue.some((line) => line.who === "you"), "dialogue has a turn for the learner");
    for (const line of unit.dialogue) {
      if (line.who === "you") {
        assert.ok(line.options.length >= 3, "dialogue has options");
        assert.equal(line.options.filter((o) => o.correct).length, 1, "exactly one correct dialogue option");
        for (const option of line.options) {
          assert.ok(option.ar && option.tr && option.en && option.so, "dialogue option localized");
        }
      } else {
        assert.ok(line.ar && line.tr && line.en && line.so, "dialogue line localized");
      }
    }
  }
}

const keys = (lang) => Object.keys(I18N[lang]).sort();
assert.deepEqual(keys("so"), keys("en"), "English and Somali key parity");
for (const key of keys("en")) {
  assert.ok(I18N.en[key].length > 0 && I18N.so[key].length > 0, "non-empty string: " + key);
  const placeholders = (text) => (text.match(/\{\w+\}/g) || []).sort();
  assert.deepEqual(placeholders(I18N.so[key]), placeholders(I18N.en[key]), "placeholder parity: " + key);
}

const dynamic = [];
["learn", "quiz", "write", "recap"].forEach((s) => dynamic.push("stage." + s));
for (let i = 1; i <= 4; i++) dynamic.push("landing.step" + i + "Title", "landing.step" + i + "Text");
for (let i = 1; i <= 6; i++) dynamic.push("landing.f" + i + "Title", "landing.f" + i + "Text");
const used = new Set(dynamic);
for (const match of appSource.matchAll(/\bt\("([^"]+)"\)/g)) used.add(match[1]);
for (const key of used) assert.ok(I18N.en[key], "translation exists for t(\"" + key + "\")");

let seed = 7;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const allCards = units.flatMap((u) => u.cards);

for (const unit of units) {
  for (const lang of ["en", "so"]) {
    const quiz = E.makeQuiz(unit.cards, allCards, lang, rand);
    assert.equal(quiz.length, Math.min(6, unit.cards.length), "quiz length");
    for (const q of quiz) {
      assert.equal(q.options.length, 4, "four options");
      assert.equal(new Set(q.options.map((o) => o.text)).size, 4, "distinct options");
      assert.equal(q.options.filter((o) => o.correct).length, 1, "one correct option");
      assert.ok(q.prompt, "prompt present");
    }
  }
}

const letterCard = allCards.find((c) => c.id === "baa");
const wordCard = allCards.find((c) => c.id === "salam") || allCards.find((c) => c.id === "salam");
const listen = E.makeWrite(letterCard, allCards, rand, "en");
assert.equal(listen.kind, "listen");
assert.equal(listen.options.length, 4);
assert.ok(listen.options.includes(letterCard.ar));
const tiles = E.makeWrite(wordCard, allCards, rand, "so");
assert.equal(tiles.kind, "tiles");
assert.ok(tiles.tiles.length > tiles.answer.length, "tiles include distractors");
const solved = Array.from(tiles.answer)
  .map((ch) => tiles.tiles.indexOf(ch))
  .filter((i) => i >= 0);
assert.equal(solved.length, tiles.answer.length, "answer reachable from tiles");
assert.ok(E.checkTiles(tiles.answer.split(""), tiles.answer), "correct assembly accepted");
assert.ok(!E.checkTiles(tiles.answer.split("").reverse(), tiles.answer), "wrong order rejected");

assert.equal(E.nextStreak(null, "2026-11-19", 0), 1, "first day");
assert.equal(E.nextStreak("2026-11-19", "2026-11-19", 3), 3, "same day");
assert.equal(E.nextStreak("2026-11-18", "2026-11-19", 3), 4, "consecutive day");
assert.equal(E.nextStreak("2026-11-01", "2026-11-19", 3), 1, "gap resets");

const days = {};
for (let i = 0; i < 7; i += 1) {
  const date = new Date("2026-11-20T00:00:00Z");
  date.setUTCDate(date.getUTCDate() - i);
  days[date.toISOString().slice(0, 10)] = 600;
}
assert.equal(E.qualifiedStreak(days, "2026-11-20"), 7, "seven 10-min days");
assert.equal(E.camelsFromStreak(days, "2026-11-20"), 1, "one camel after seven days");
assert.equal(E.qualifiedStreak({ ...days, "2026-11-20": 599 }, "2026-11-20"), 6, "partial day breaks streak");
assert.equal(E.qualifiedStreak({ ...days, "2026-11-13": 0 }, "2026-11-20"), 7, "gap stops counting");

const done = { "letters-1": [0, 1] };
assert.equal(E.unitPercent(done, "letters-1"), 50);
assert.equal(E.nextStageIndex(done, "letters-1"), 2);
assert.equal(E.nextStageIndex(done, "letters-2"), 0);

const manifest = JSON.parse(read("manifest.webmanifest"));
assert.equal(manifest.short_name, "ABJAD");
for (const icon of manifest.icons) assert.ok(fs.existsSync(path.join(dir, icon.src)), "icon exists: " + icon.src);
assert.ok(fs.existsSync(path.join(dir, "fonts/noto-naskh-arabic.woff2")), "Arabic webfont bundled");
for (const name of ["index.html", "styles.css", "app.js", "engine.js", "curriculum.js", "i18n.js", "en.js", "so.js", "sw.js"]) {
  assert.ok(fs.existsSync(path.join(dir, name)), "asset exists: " + name);
}
const html = read("index.html");
for (const match of html.matchAll(/src="([^"]+)"/g)) {
  assert.ok(fs.existsSync(path.join(dir, match[1])), "script exists: " + match[1]);
}
const sw = read("sw.js");
for (const match of sw.matchAll(/"([^"]+\.(?:js|css|png|svg|webmanifest|html))"/g)) {
  assert.ok(fs.existsSync(path.join(dir, match[1])), "sw asset exists: " + match[1]);
}

console.log("selfcheck OK:", units.length, "units,", allCards.length, "cards,", keys("en").length, "strings x2");
