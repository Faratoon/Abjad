(function () {
  "use strict";
  const E = window.AbjadEngine;
  const units = window.CURRICULUM.units;
  const allCards = units.reduce((list, unit) => list.concat(unit.cards), []);
  const STAGES = E.STAGES;
  const LS_KEY = "abjad.v1";
  const app = document.getElementById("app");
  const canSpeak = "speechSynthesis" in window;

  let state = loadState();
  let session = null;

  function loadState() {
    const fresh = { lang: "en", xp: 0, streak: 0, lastDay: null, done: {} };
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
      if (!saved || typeof saved !== "object") return fresh;
      return {
        lang: saved.lang === "so" ? "so" : "en",
        xp: Math.max(0, Number(saved.xp) || 0),
        streak: Math.max(0, Number(saved.streak) || 0),
        lastDay: typeof saved.lastDay === "string" ? saved.lastDay : null,
        done: saved.done && typeof saved.done === "object" ? saved.done : {}
      };
    } catch (err) {
      return fresh;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (err) {
      /* private mode: progress stays in memory */
    }
  }

  function t(key, vars) {
    const dict = window.I18N[state.lang] || window.I18N.en;
    let text = dict[key] != null ? dict[key] : window.I18N.en[key];
    if (text == null) text = key;
    if (vars) {
      Object.keys(vars).forEach(function (name) {
        text = text.split("{" + name + "}").join(String(vars[name]));
      });
    }
    return text;
  }

  const field = (obj) => (obj && (obj[state.lang] != null ? obj[state.lang] : obj.en)) || "";

  function setLang(lang) {
    state.lang = lang === "so" ? "so" : "en";
    saveState();
    document.documentElement.lang = state.lang;
    route();
  }

  function speak(text) {
    if (!canSpeak || !text) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ar-SA";
    utter.rate = 0.8;
    const voice = speechSynthesis.getVoices().find((v) => v.lang && v.lang.indexOf("ar") === 0);
    if (voice) utter.voice = voice;
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
  }

  function speakButton(text, label) {
    if (!canSpeak || !text) return "";
    return '<button class="btn btn-soft btn-sm" data-action="speak" data-text="' + text + '">🔊 ' +
      (label || t("common.listen")) + "</button>";
  }

  function langSwitch() {
    return '<div class="lang-switch" role="group" aria-label="' + t("common.language") + '">' +
      '<button data-action="lang" data-lang="en" aria-pressed="' + (state.lang === "en") + '">EN</button>' +
      '<button data-action="lang" data-lang="so" aria-pressed="' + (state.lang === "so") + '">SO</button>' +
      "</div>";
  }

  function appHeader(withBack) {
    const left = withBack
      ? '<a class="icon-btn" href="#/learn" aria-label="' + t("common.back") + '">←</a>'
      : '<a class="brand brand-sm" href="#/"><span class="brand-mark">أ</span><span class="brand-word">ABJAD</span></a>';
    return '<header class="app-nav"><div class="nav-inner">' + left +
      '<div class="nav-stats">' +
      '<span class="pill" title="' + t("common.streak") + '">🔥 ' + state.streak + "</span>" +
      '<span class="pill" title="' + t("common.xp") + '">⚡ ' + state.xp + "</span>" +
      "</div>" + langSwitch() + "</div></header>";
  }

  function landingHeader() {
    return '<header class="site-nav"><div class="nav-inner">' +
      '<a class="brand" href="#/"><span class="brand-mark">أ</span><span class="brand-word">ABJAD</span></a>' +
      '<div class="nav-links">' +
      '<label class="lang-pick"><span class="sr-only">' + t("common.language") + "</span>" +
      '<select data-action="lang-select" aria-label="' + t("common.language") + '">' +
      '<option value="en"' + (state.lang === "en" ? " selected" : "") + ">English</option>" +
      '<option value="so"' + (state.lang === "so" ? " selected" : "") + ">Soomaali</option>" +
      "</select></label>" +
      '<a class="btn btn-primary btn-sm" href="#/learn">' + t("landing.cta") + "</a>" +
      "</div></div></header>";
  }

  function stats() {
    const letters = units
      .filter((u) => u.id.indexOf("letters") === 0)
      .reduce((n, u) => n + u.cards.length, 0);
    const rows = [
      [letters, t("landing.statLetters")],
      [units.length, t("landing.statUnits")],
      [2, t("landing.statLangs")],
      ["PWA", t("landing.statOffline")]
    ];
    return '<section class="stats">' + rows
      .map((row) => '<div class="stat"><strong>' + row[0] + "</strong><span>" + row[1] + "</span></div>")
      .join("") + "</section>";
  }

  function steps() {
    const icons = ["🔤", "🧠", "✍️", "💬"];
    return STAGES.map((stage, i) =>
      '<article class="step-card"><span class="step-num">0' + (i + 1) + "</span>" +
      '<div class="step-icon">' + icons[i] + "</div>" +
      "<h3>" + t("landing.step" + (i + 1) + "Title") + "</h3>" +
      "<p>" + t("landing.step" + (i + 1) + "Text") + "</p></article>"
    ).join("");
  }

  function features() {
    const icons = ["🔠", "📚", "🌍", "🔊", "📴", "🔥"];
    return [1, 2, 3, 4, 5, 6].map((n) =>
      '<article class="feature"><div class="feature-icon">' + icons[n - 1] + "</div>" +
      "<h3>" + t("landing.f" + n + "Title") + "</h3>" +
      "<p>" + t("landing.f" + n + "Text") + "</p></article>"
    ).join("");
  }

  function renderLanding() {
    document.title = "ABJAD — " + t("landing.title");
    const sample = allCards.find((c) => c.id === "baa");
    app.innerHTML =
      '<div class="site">' + landingHeader() +
      '<section class="hero">' +
      '<div class="hero-copy">' +
      '<p class="kicker">' + t("landing.kicker") + "</p>" +
      "<h1>" + t("landing.title") + "</h1>" +
      '<p class="lede">' + t("landing.subtitle") + "</p>" +
      '<div class="hero-cta"><a class="btn btn-primary btn-lg" href="#/learn">' + t("landing.cta") + "</a>" +
      '<button class="btn btn-ghost btn-lg" data-action="scroll-how">' + t("landing.cta2") + "</button></div>" +
      '<p class="hero-note">' + t("footer.tagline") + "</p>" +
      "</div>" +
      '<div class="hero-card-wrap">' +
      '<div class="hero-card"><span class="hero-tag">' + t("stage.learn") + "</span>" +
      '<div class="arabic hero-arabic" lang="ar" dir="rtl">' + sample.ar + "</div>" +
      '<div class="tr">' + sample.tr + "</div>" +
      '<div class="hero-meaning"><span>' + sample.example.emoji + "</span> " + field(sample.example) + "</div>" +
      speakButton(sample.example.ar) +
      "</div>" +
      '<span class="hero-chip chip1">' + allCards[0].ar + "</span>" +
      '<span class="hero-chip chip2">' + allCards[1].ar + "</span>" +
      '<span class="hero-chip chip3">' + allCards[2].ar + "</span>" +
      "</div></section>" +
      stats() +
      '<section id="how" class="how section"><div class="section-head"><h2>' + t("landing.howTitle") +
      "</h2><p>" + t("landing.howSub") + "</p></div>" +
      '<div class="step-grid">' + steps() + "</div></section>" +
      '<section class="features section"><div class="section-head"><h2>' + t("landing.featuresTitle") +
      '</h2></div><div class="feature-grid">' + features() + "</div></section>" +
      '<section class="cta section"><div class="cta-card"><h2>' + t("landing.ctaTitle") + "</h2>" +
      "<p>" + t("landing.ctaText") + "</p>" +
      '<a class="btn btn-primary btn-lg" href="#/learn">' + t("landing.ctaButton") + "</a></div></section>" +
      '<footer class="site-footer"><div class="footer-inner"><div class="brand brand-sm">' +
      '<span class="brand-mark">أ</span><span class="brand-word">ABJAD</span></div>' +
      "<p>" + t("footer.tagline") + '</p><p class="muted small">' + t("landing.note") + "</p>" +
      "</div></footer></div>";
  }

  function renderDashboard() {
    const complete = E.unitsComplete(units, state.done);
    document.title = "ABJAD — " + t("learn.title");
    app.innerHTML = appHeader(false) + `
      <main class="wrap">
        <div class="dash-head">
          <div>
            <h1>${t("learn.title")}</h1>
            <p class="muted">${t("learn.subtitle")}</p>
          </div>
          <div class="progress-card">
            <span class="muted small">${t("learn.yourProgress")}</span>
            <strong>${t("learn.unitsDone", { n: complete, total: units.length })}</strong>
            <div class="bar"><i style="width:${Math.round((complete / units.length) * 100)}%"></i></div>
          </div>
        </div>
        <div class="unit-grid">${units.map((unit, i) => unitCard(unit, i)).join("")}</div>
      </main>`;
  }

  function unitCard(unit, i) {
    const done = E.stageList(state.done, unit.id).length;
    const pct = E.unitPercent(state.done, unit.id);
    const complete = done === STAGES.length;
    const label = complete ? t("learn.review") : done ? t("learn.continue") : t("learn.startUnit");
    const next = E.nextStageIndex(state.done, unit.id);
    return `<article class="unit-card ${complete ? "is-complete" : ""}">
      <div class="unit-top">
        <span class="unit-icon">${unit.icon}</span>
        <span class="unit-badge">${t("common.unit")} ${i + 1}</span>
      </div>
      <h2>${field(unit.title)}</h2>
      <p class="muted">${field(unit.subtitle)}</p>
      <div class="stage-dots" aria-label="${t("learn.stageProgress", { n: done })}">
        ${STAGES.map((s, idx) => `<span class="dot ${idx < done ? "on" : ""}" title="${t("stage." + s)}"></span>`).join("")}
      </div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="unit-foot">
        <span class="muted small">${done}/4</span>
        <a class="btn ${complete ? "btn-ghost-dark" : "btn-primary"} btn-sm" href="#/lesson/${unit.id}/${next}">${label}</a>
      </div>
    </article>`;
  }

  function makeSession(unit, index) {
    const stage = STAGES[index];
    const s = {
      unitId: unit.id, stageIndex: index, stage, lang: state.lang,
      i: 0, correct: 0, total: 0, answered: null, chosen: null,
      used: [], attempts: 0, feedback: null, qs: null, tasks: null,
      mode: null, line: 0, answers: {}
    };
    if (stage === "learn") s.total = unit.cards.length;
    if (stage === "quiz") {
      s.qs = E.makeQuiz(unit.cards, allCards, state.lang, Math.random, Math.min(6, unit.cards.length));
      s.total = s.qs.length;
    }
    if (stage === "write") {
      s.tasks = E.shuffle(unit.cards, Math.random)
        .slice(0, Math.min(6, unit.cards.length))
        .map((card) => E.makeWrite(card, allCards, Math.random, state.lang));
      s.total = s.tasks.length;
    }
    if (stage === "recap") {
      if (unit.dialogue) {
        s.mode = "dialogue";
        s.total = unit.dialogue.filter((line) => line.who === "you").length;
      } else {
        s.mode = "quiz";
        s.qs = E.makeQuiz(unit.cards, allCards, state.lang, Math.random, Math.min(8, unit.cards.length));
        s.total = s.qs.length;
      }
    }
    return s;
  }

  function renderLesson(unitId, rawIndex) {
    const unit = units.find((u) => u.id === unitId);
    if (!unit) return renderDashboard();
    let index = Number(rawIndex);
    if (!Number.isInteger(index) || index < 0 || index >= STAGES.length) {
      index = E.nextStageIndex(state.done, unit.id);
    }
    if (!session || session.unitId !== unit.id || session.stageIndex !== index ||
        (session.lang !== state.lang && session.stage !== "result")) {
      session = makeSession(unit, index);
    }
    document.title = "ABJAD — " + field(unit.title);
    app.innerHTML = appHeader(true) + `
      <main class="lesson">
        <div class="lesson-top">
          <a class="back-link" href="#/learn">← ${t("common.back")}</a>
          <span class="muted small">${t("lesson.stageOf", { n: index + 1 })}</span>
        </div>
        <div class="stage-bar">
          ${STAGES.map((s, i) => `<span class="${i < index ? "is-done" : ""} ${i === index ? "is-active" : ""}">${t("stage." + s)}</span>`).join("")}
        </div>
        <div id="stage">${session.stage === "result" ? resultHtml(unit) : stageHtml(unit)}</div>
      </main>`;
  }

  function stageHtml(unit) {
    if (session.stage === "learn") return learnHtml(unit);
    if (session.stage === "write") return writeHtml();
    if (session.stage === "recap" && session.mode === "dialogue") return dialogueHtml(unit);
    return quizHtml();
  }

  function learnHtml(unit) {
    const card = unit.cards[session.i];
    const ex = card.example;
    const last = session.i === unit.cards.length - 1;
    return `<div class="card stage-card">
      <div class="stage-head">
        <span class="muted small">${t("common.stage")} ${session.i + 1} / ${unit.cards.length}</span>
        ${speakButton(card.ar)}
      </div>
      <div class="learn-arabic arabic" lang="ar" dir="rtl">${card.ar}</div>
      <div class="tr center">${card.tr}</div>
      <div class="meaning center">${card.emoji ? `<span>${card.emoji}</span> ` : ""}${field(card)}</div>
      ${card.forms ? `<div class="meta-row"><span class="muted small">${t("lesson.forms")}</span><span class="arabic" lang="ar" dir="rtl">${card.forms}</span></div>` : ""}
      ${ex ? `<div class="example">
        <div class="stage-head"><span class="muted small">${t("lesson.example")}</span>
        <span class="arabic example-ar" lang="ar" dir="rtl">${ex.ar}</span></div>
        <div class="example-body">${ex.tr} — <strong>${field(ex)}</strong> ${ex.emoji || ""}</div>
      </div>` : ""}
      <div class="card-nav">
        <button class="btn btn-ghost-dark" data-action="learn-prev" ${session.i === 0 ? "disabled" : ""}>${t("common.back")}</button>
        <button class="btn btn-primary" data-action="learn-next">${last ? t("common.continue") : t("common.next")}</button>
      </div>
    </div>`;
  }

  function quizHtml() {
    const q = session.qs[session.i];
    const answered = session.answered !== null;
    return `<div class="card stage-card">
      <div class="stage-head">
        <span class="muted small">${t("quiz.question", { n: session.i + 1, total: session.total })}</span>
        <span class="pill">⚡ ${t("common.xp")}</span>
      </div>
      <div class="prompt ${q.promptAr ? "arabic prompt-ar" : ""}" ${q.promptAr ? 'lang="ar" dir="rtl"' : ""}>${q.prompt}</div>
      ${q.promptAr ? `<div class="center">${speakButton(q.prompt, t("common.listen"))}</div>` : ""}
      <p class="muted center">${q.promptAr ? t("quiz.chooseMeaning") : t("quiz.chooseArabic")}</p>
      <div class="options">
        ${q.options.map((o, idx) => `<button class="option ${q.kind === "m2a" ? "arabic" : ""} ${answered && o.correct ? "is-correct" : ""} ${answered && session.chosen === idx && !o.correct ? "is-wrong" : ""}" data-action="quiz-opt" data-index="${idx}" ${answered ? "disabled" : ""} ${q.kind === "m2a" ? 'lang="ar" dir="rtl"' : ""}>${o.text}</button>`).join("")}
      </div>
      ${answered ? quizFeedback(q) : ""}
    </div>`;
  }

  function quizFeedback(q) {
    const correctOpt = q.options.find((o) => o.correct);
    const ok = session.answered === true;
    return `<div class="feedback ${ok ? "ok" : "bad"}" role="status">
      <strong>${ok ? t("common.correct") : t("common.wrong")}</strong>
      ${ok ? `<span class="xp-note">${t("quiz.correctXp", { n: E.XP_CORRECT })}</span>` : `<span>${t("quiz.wrongAnswer", { answer: correctOpt.text })}</span>`}
    </div>
    <button class="btn btn-primary btn-block" data-action="quiz-next">${session.i < session.total - 1 ? t("common.next") : t("common.finish")}</button>`;
  }

  function writeHtml() {
    const task = session.tasks[session.i];
    if (!task) return "";
    if (task.kind === "listen") {
      return `<div class="card stage-card">
        <div class="stage-head"><span class="muted small">${t("common.listen")} · ${session.i + 1}/${session.total}</span></div>
        <p class="write-prompt center">${t("write.listenTitle")}</p>
        <div class="center">${canSpeak ? `<button class="btn btn-soft" data-action="speak" data-text="${task.ar}">🔊 ${t("write.replay")}</button>` : `<p class="muted small">${t("write.noAudio")}</p>`}</div>
        <p class="center muted">${task.prompt}</p>
        <div class="options options-letters">
          ${task.options.map((letter, idx) => `<button class="option letter-option arabic ${session.answered !== null && letter === task.ar ? "is-correct" : ""} ${session.answered !== null && session.chosen === idx && letter !== task.ar ? "is-wrong" : ""}" data-action="write-letter" data-index="${idx}" ${session.answered !== null ? "disabled" : ""} lang="ar" dir="rtl">${letter}</button>`).join("")}
        </div>
        ${session.feedback ? `<div class="feedback ${session.feedback.ok ? "ok" : "bad"}" role="status">${session.feedback.text}</div>` : ""}
        ${session.feedback ? `<button class="btn btn-primary btn-block" data-action="write-next">${t("common.next")}</button>` : ""}
      </div>`;
    }
    const typed = session.used.map((idx) => task.tiles[idx]).join("");
    return `<div class="card stage-card">
      <div class="stage-head"><span class="muted small">${t("write.title")} · ${session.i + 1}/${session.total}</span></div>
      <p class="write-prompt center">${task.prompt} <span class="tr-inline">${task.tr}</span></p>
      <div class="answer-slot arabic ${typed ? "has-text" : ""}" lang="ar" dir="rtl">${typed || "_ ".repeat(task.answer.length)}</div>
      <div class="tiles">
        ${task.tiles.map((letter, idx) => `<button class="tile arabic ${session.used.includes(idx) ? "is-used" : ""}" data-action="write-tile" data-index="${idx}" ${session.used.includes(idx) ? "disabled" : ""} lang="ar" dir="rtl">${letter}</button>`).join("")}
      </div>
      <p class="muted small center">${t("write.instructions")}</p>
      <div class="card-nav">
        <button class="btn btn-ghost-dark" data-action="write-clear">${t("write.clear")}</button>
        <button class="btn btn-primary" data-action="write-check" ${session.used.length === 0 ? "disabled" : ""}>${t("write.check")}</button>
      </div>
      ${session.feedback ? `<div class="feedback ${session.feedback.ok ? "ok" : "bad"}" role="status">${session.feedback.text}</div>` : ""}
      ${session.feedback && session.feedback.next ? `<button class="btn btn-primary btn-block" data-action="write-next">${t("common.next")}</button>` : ""}
    </div>`;
  }

  function dialogueHtml(unit) {
    const lines = unit.dialogue;
    let body = "";
    lines.forEach((entry, idx) => {
      if (idx > session.line) return;
      if (entry.who === "npc") {
        body += bubble("npc", entry, true);
      } else {
        const chosen = session.answers[idx];
        if (chosen) {
          body += bubble("you", chosen, false);
          if (!chosen.correct) {
            const right = entry.options.find((o) => o.correct);
            body += `<p class="muted small center">${t("quiz.wrongAnswer", { answer: right.ar })}</p>`;
          }
        } else if (idx === session.line) {
          body += `<div class="choices">${entry.options.map((opt, oi) =>
            `<button class="option dialogue-option" data-action="dialogue-opt" data-index="${oi}"><span class="arabic" lang="ar" dir="rtl">${opt.ar}</span><small>${field(opt)}</small></button>`
          ).join("")}</div>`;
        }
      }
    });
    const current = lines[session.line];
    const ready = current && (current.who === "npc" || session.answers[session.line]);
    return `<div class="card stage-card dialogue-card">
      <div class="stage-head"><span class="muted small">${t("dialogue.title")}</span><span class="muted small">${session.line + 1}/${lines.length}</span></div>
      <div class="dialogue">${body}</div>
      ${current && current.who === "you" && !session.answers[session.line] ? `<p class="muted small center">${t("dialogue.hint")}</p>` : ""}
      ${ready ? `<button class="btn btn-primary btn-block" data-action="dialogue-next">${session.line >= lines.length - 1 ? t("common.finish") : t("dialogue.continue")}</button>` : ""}
    </div>`;
  }

  function bubble(who, entry, withSpeak) {
    const isNpc = who === "npc";
    return `<div class="bubble ${isNpc ? "bubble-npc" : "bubble-you"} ${entry.correct === false ? "is-wrong" : ""}">
      <span class="bubble-name">${isNpc ? t("dialogue.npc") : t("dialogue.you")}</span>
      <div class="bubble-ar arabic" lang="ar" dir="rtl">${entry.ar}</div>
      <div class="bubble-tr">${entry.tr}</div>
      <div class="bubble-meaning">${field(entry)}</div>
      ${withSpeak ? speakButton(entry.ar) : ""}
    </div>`;
  }

  function finishStage(unit, index, correct, total) {
    const previous = E.stageList(state.done, unit.id);
    const already = previous.includes(index);
    const complete = previous.length + (already ? 0 : 1) === STAGES.length;
    let gained = index === 0 ? E.XP_STAGE : correct * E.XP_CORRECT;
    if (index === STAGES.length - 1 && complete && !already) gained += E.XP_UNIT;
    state.xp += gained;
    if (!already) {
      state.done[unit.id] = previous.concat(index).sort((a, b) => a - b);
    }
    state.streak = E.nextStreak(state.lastDay, E.localISO(), state.streak);
    state.lastDay = E.localISO();
    saveState();
    session = {
      unitId: unit.id, stageIndex: index, stage: "result", lang: state.lang,
      gained, correct, total
    };
    renderLesson(unit.id, index);
  }

  function resultHtml(unit) {
    const last = session.stageIndex === STAGES.length - 1;
    const pct = E.unitPercent(state.done, unit.id);
    const accuracy = session.total ? Math.round((session.correct / session.total) * 100) : null;
    return `<div class="card result-card">
      <div class="result-emoji">${last ? "🎉" : "✅"}</div>
      <h1>${last ? t("result.title") : t("result.stageDone")}</h1>
      <p class="result-xp">${t("result.xp", { n: session.gained || 0 })}</p>
      ${accuracy !== null ? `<p class="muted">${t("result.accuracy", { n: accuracy })}</p>` : ""}
      <div class="bar"><i style="width:${pct}%"></i></div>
      <p class="muted small">${t("learn.stageProgress", { n: E.stageList(state.done, unit.id).length })}</p>
      <div class="result-actions">
        ${last
          ? `<a class="btn btn-primary" href="#/learn">${t("result.back")}</a><a class="btn btn-ghost-dark" href="#/lesson/${unit.id}/0">${t("result.again")}</a>`
          : `<a class="btn btn-primary" href="#/lesson/${unit.id}/${session.stageIndex + 1}">${t("common.continue")}</a><a class="btn btn-ghost-dark" href="#/learn">${t("result.back")}</a>`}
      </div>
    </div>`;
  }

  function activeUnit() {
    return session ? units.find((u) => u.id === session.unitId) : null;
  }

  function rerender() {
    const unit = activeUnit();
    if (unit) renderLesson(unit.id, session.stageIndex);
    else route();
  }

  app.addEventListener("click", function (event) {
    const el = event.target.closest("[data-action]");
    if (!el || el.disabled) return;
    const action = el.dataset.action;
    const unit = activeUnit();

    if (action === "lang") {
      setLang(el.dataset.lang);
      return;
    }
    if (action === "speak") {
      speak(el.dataset.text);
      return;
    }
    if (action === "scroll-how") {
      const how = document.getElementById("how");
      if (how) how.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (!unit || !session) return;

    if (action === "learn-prev") {
      if (session.i > 0) {
        session.i -= 1;
        rerender();
      }
      return;
    }
    if (action === "learn-next") {
      if (session.i < unit.cards.length - 1) {
        session.i += 1;
        rerender();
      } else {
        finishStage(unit, 0, 0, 0);
      }
      return;
    }
    if (action === "quiz-opt") {
      if (session.answered !== null) return;
      const q = session.qs[session.i];
      const idx = Number(el.dataset.index);
      session.chosen = idx;
      session.answered = q.options[idx].correct === true;
      if (session.answered) session.correct += 1;
      rerender();
      return;
    }
    if (action === "quiz-next") {
      if (session.i < session.total - 1) {
        session.i += 1;
        session.answered = null;
        session.chosen = null;
        rerender();
      } else {
        finishStage(unit, session.stageIndex, session.correct, session.total);
      }
      return;
    }
    if (action === "write-tile") {
      const idx = Number(el.dataset.index);
      if (!session.used.includes(idx)) {
        session.used.push(idx);
        session.feedback = null;
        rerender();
      }
      return;
    }
    if (action === "write-clear") {
      session.used = [];
      session.feedback = null;
      rerender();
      return;
    }
    if (action === "write-check") {
      const task = session.tasks[session.i];
      if (E.checkTiles(session.used.map((idx) => task.tiles[idx]), task.answer)) {
        if (session.attempts === 0) session.correct += 1;
        session.feedback = { ok: true, text: t("write.correct"), next: true };
      } else {
        session.attempts += 1;
        session.used = [];
        session.feedback = session.attempts >= 2
          ? { ok: false, text: t("write.reveal", { answer: task.ar }), next: true }
          : { ok: false, text: t("common.tryAgain"), next: false };
      }
      rerender();
      return;
    }
    if (action === "write-letter") {
      if (session.answered !== null) return;
      const task = session.tasks[session.i];
      const idx = Number(el.dataset.index);
      const ok = task.options[idx] === task.ar;
      session.chosen = idx;
      session.answered = ok;
      if (ok) session.correct += 1;
      session.feedback = ok
        ? { ok: true, text: t("write.correct") }
        : { ok: false, text: t("quiz.wrongAnswer", { answer: task.ar }) };
      rerender();
      return;
    }
    if (action === "write-next") {
      if (session.i < session.total - 1) {
        session.i += 1;
        session.used = [];
        session.attempts = 0;
        session.feedback = null;
        session.answered = null;
        session.chosen = null;
        rerender();
      } else {
        finishStage(unit, session.stageIndex, session.correct, session.total);
      }
      return;
    }
    if (action === "dialogue-opt") {
      if (session.answers[session.line]) return;
      const entry = unit.dialogue[session.line];
      const opt = entry.options[Number(el.dataset.index)];
      session.answers[session.line] = opt;
      if (opt.correct) session.correct += 1;
      rerender();
      return;
    }
    if (action === "dialogue-next") {
      if (session.line < unit.dialogue.length - 1) {
        session.line += 1;
        rerender();
      } else {
        finishStage(unit, session.stageIndex, session.correct, session.total);
      }
    }
  });

  app.addEventListener("change", function (event) {
    const el = event.target;
    if (el && el.matches('[data-action="lang-select"]')) setLang(el.value);
  });

  function route() {
    const hash = location.hash.replace(/^#\/?/, "");
    const parts = hash.split("/").filter(Boolean);
    if (parts.length === 0) return renderLanding();
    if (parts[0] === "learn") return renderDashboard();
    if (parts[0] === "lesson" && parts[1]) return renderLesson(parts[1], parts[2]);
    return renderLanding();
  }

  window.addEventListener("hashchange", function () {
    session = null;
    route();
  });

  document.documentElement.lang = state.lang;
  route();

  if ("serviceWorker" in navigator && /^https?:/.test(location.protocol)) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
