(function (g) {
  "use strict";
  const MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
  const LETTERS = Array.from("بتثجحخدذرزسشصضطظعغفقكلمنهوي");
  const STAGES = ["learn", "quiz", "write", "recap"];
  const XP_CORRECT = 10;
  const XP_STAGE = 5;
  const XP_UNIT = 20;

  const base = (s) => (s || "").replace(MARKS, "").replace(/\s+/g, "");

  function shuffle(list, rand = Math.random) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function uniqueBy(list, key) {
    const seen = new Set();
    return list.filter((item) => {
      const k = key(item);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  function options(correctCard, local, fallback, lang, rand, textOf) {
    const seen = new Set([textOf(correctCard)]);
    const picked = [];
    const take = (list) => {
      for (const card of shuffle(list, rand)) {
        if (picked.length === 3) return;
        if (card.id === correctCard.id) continue;
        const text = textOf(card);
        if (seen.has(text)) continue;
        seen.add(text);
        picked.push(card);
      }
    };
    take(local);
    if (picked.length < 3) take(fallback);
    return shuffle([correctCard, ...picked], rand).map((card) => ({
      id: card.id,
      text: textOf(card),
      correct: card.id === correctCard.id
    }));
  }

  function meaningToArabic(card, local, fallback, lang, rand) {
    return {
      kind: "m2a",
      cardId: card.id,
      prompt: card[lang],
      promptAr: false,
      options: options(card, local, fallback, lang, rand, (c) => c.ar)
    };
  }

  function arabicToMeaning(card, local, fallback, lang, rand) {
    return {
      kind: "a2m",
      cardId: card.id,
      prompt: card.ar,
      promptAr: true,
      options: options(card, local, fallback, lang, rand, (c) => c[lang])
    };
  }

  function makeQuiz(cards, pool, lang, rand = Math.random, count = 6) {
    const questions = cards.map((card, i) =>
      i % 2 === 0
        ? meaningToArabic(card, cards, pool, lang, rand)
        : arabicToMeaning(card, cards, pool, lang, rand)
    );
    return shuffle(questions, rand).slice(0, Math.min(count, questions.length));
  }

  function makeWrite(card, pool, rand = Math.random, lang = "en") {
    const answer = base(card.ar);
    const chars = Array.from(answer);
    if (chars.length <= 1) {
      const letters = uniqueBy(
        pool.filter((c) => Array.from(base(c.ar)).length === 1),
        (c) => c.ar
      ).map((c) => c.ar);
      const choices = [card.ar];
      for (const letter of shuffle(letters, rand)) {
        if (choices.length === 4) break;
        if (!choices.includes(letter)) choices.push(letter);
      }
      return {
        kind: "listen",
        cardId: card.id,
        prompt: card[lang],
        tr: card.tr,
        ar: card.ar,
        options: shuffle(choices, rand)
      };
    }
    const extras = shuffle(LETTERS, rand)
      .filter((ch) => !chars.includes(ch))
      .slice(0, 2);
    return {
      kind: "tiles",
      cardId: card.id,
      prompt: card[lang],
      tr: card.tr,
      ar: card.ar,
      answer,
      tiles: shuffle([...chars, ...extras], rand)
    };
  }

  function checkTiles(tapped, answer) {
    return base(tapped.join("")) === answer;
  }

  function localISO(date = new Date()) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function nextStreak(lastDay, today, current) {
    const n = current || 0;
    if (lastDay === today) return n || 1;
    if (!lastDay) return 1;
    const d = new Date(today + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - 1);
    return lastDay === d.toISOString().slice(0, 10) ? n + 1 : 1;
  }

  function stageList(done, unitId) {
    const list = done && Array.isArray(done[unitId]) ? done[unitId] : [];
    return STAGES.map((_, i) => i).filter((i) => list.includes(i));
  }

  function unitPercent(done, unitId) {
    return Math.round((stageList(done, unitId).length / STAGES.length) * 100);
  }

  function nextStageIndex(done, unitId) {
    const list = stageList(done, unitId);
    for (let i = 0; i < STAGES.length; i++) if (!list.includes(i)) return i;
    return 0;
  }

  function unitsComplete(units, done) {
    return units.filter((u) => stageList(done, u.id).length === STAGES.length).length;
  }

  function daySeconds(days, day) {
    return (days && Number(days[day])) || 0;
  }

  function qualifiedStreak(days, today, goal = 600) {
    const cursor = new Date(today + "T00:00:00Z");
    if (daySeconds(days, today) < goal) cursor.setUTCDate(cursor.getUTCDate() - 1);
    let count = 0;
    while (daySeconds(days, cursor.toISOString().slice(0, 10)) >= goal) {
      count += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
      if (count > 3650) break;
    }
    return count;
  }

  function camelsFromStreak(days, today, goal = 600) {
    return Math.floor(qualifiedStreak(days, today, goal) / 7);
  }

  g.AbjadEngine = {
    base,
    shuffle,
    makeQuiz,
    makeWrite,
    checkTiles,
    localISO,
    nextStreak,
    stageList,
    unitPercent,
    nextStageIndex,
    unitsComplete,
    daySeconds,
    qualifiedStreak,
    camelsFromStreak,
    STAGES,
    XP_CORRECT,
    XP_STAGE,
    XP_UNIT
  };
})(globalThis);
