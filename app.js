(function () {
  "use strict";
  const E = window.AbjadEngine;
  const units = window.CURRICULUM.units;
  const allCards = units.reduce((list, unit) => list.concat(unit.cards), []);
  const STAGES = E.STAGES;
  const DB_KEY = "abjad.v2";
  const LEGACY_KEY = "abjad.v1";
  const DAY_GOAL = 600;
  const app = document.getElementById("app");
  const canSpeak = "speechSynthesis" in window;

  // Passphrases never leave the device; see passphrase.js.
  const Pass = window.AbjadPass;
  const validPwh = Pass.valid;
  const makePwh = Pass.make;
  const checkPwh = Pass.check;
  const KDF_MIN = Pass.min;

  let db = loadDb();
  let state = db.currentUser ? db.users[db.currentUser] : null;
  let session = null;
  let loginId = null;
  let lastActivity = Date.now();

  function newUser(seed) {
    return {
      id: seed.id, name: seed.name, avatar: seed.avatar || seed.name.charAt(0),
      pwh: null,
      xp: 0, streak: 0, lastDay: null, done: {}, days: {}, camels: 0
    };
  }

  function defaultUsers() {
    const users = {};
    (window.ABJAD_USERS || []).forEach((seed) => { users[seed.id] = newUser(seed); });
    return users;
  }

  function normalizeUser(raw, seed) {
    const base = newUser(seed);
    if (!raw || typeof raw !== "object") return base;
    return {
      id: base.id,
      name: base.name,
      avatar: typeof raw.avatar === "string" && raw.avatar ? raw.avatar : base.avatar,
      pwh: validPwh(raw.pwh) ? raw.pwh : null,
      account: raw.account === true,
      xp: Math.max(0, Number(raw.xp) || 0),
      streak: Math.max(0, Number(raw.streak) || 0),
      lastDay: typeof raw.lastDay === "string" ? raw.lastDay : null,
      done: raw.done && typeof raw.done === "object" ? raw.done : {},
      days: raw.days && typeof raw.days === "object" ? raw.days : {},
      camels: Math.max(0, Number(raw.camels) || 0)
    };
  }

  function loadDb() {
    const seeds = window.ABJAD_USERS || [];
    const fresh = { lang: "en", currentUser: null, users: defaultUsers() };
    try {
      const saved = JSON.parse(localStorage.getItem(DB_KEY) || "null");
      if (!saved) {
        const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "null");
        if (legacy && legacy.lang === "so") fresh.lang = "so";
        return fresh;
      }
      if (typeof saved !== "object") return fresh;
      const users = {};
      seeds.forEach((seed) => {
        users[seed.id] = normalizeUser(saved.users && saved.users[seed.id], seed);
      });
      Object.keys(saved.users || {}).forEach((id) => {
        const raw = saved.users[id];
        if (users[id] || !raw || raw.account !== true) return;
        users[id] = normalizeUser(raw, { id: id, name: raw.name || id, avatar: raw.avatar || "✉️" });
      });
      return {
        lang: saved.lang === "so" ? "so" : "en",
        currentUser: users[saved.currentUser] ? saved.currentUser : null,
        users
      };
    } catch (err) {
      return fresh;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (err) {
      /* private mode: progress stays in memory */
    }
  }

  function lang() {
    return db.lang;
  }

  function t(key, vars) {
    const dict = window.I18N[lang()] || window.I18N.en;
    let text = dict[key] != null ? dict[key] : window.I18N.en[key];
    if (text == null) text = key;
    if (vars) {
      Object.keys(vars).forEach(function (name) {
        text = text.split("{" + name + "}").join(String(vars[name]));
      });
    }
    return text;
  }

  const field = (obj) => (obj && (obj[lang()] != null ? obj[lang()] : obj.en)) || "";

  function setLang(next) {
    db.lang = next === "so" ? "so" : "en";
    saveState();
    document.documentElement.lang = db.lang;
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
      '<button data-action="lang" data-lang="en" aria-pressed="' + (db.lang === "en") + '">EN</button>' +
      '<button data-action="lang" data-lang="so" aria-pressed="' + (db.lang === "so") + '">SO</button>' +
      "</div>";
  }

  function appHeader(withBack) {
    const left = withBack
      ? '<a class="icon-btn" href="#/learn" aria-label="' + t("common.back") + '">←</a>'
      : '<a class="brand brand-sm" href="#/"><span class="brand-mark">أ</span><span class="brand-word">ABJAD</span></a>';
    return '<header class="app-nav"><div class="nav-inner">' + left +
      '<span class="nav-user">' + (state ? state.name : "") + "</span>" +
      '<div class="nav-stats">' +
      '<span class="pill" title="' + t("common.streak") + '">🔥 ' + (state ? state.streak : 0) + "</span>" +
      '<span class="pill" title="' + t("common.xp") + '">⚡ ' + (state ? state.xp : 0) + "</span>" +
      "</div>" +
      '<a class="icon-btn" href="#/leaderboard" aria-label="' + t("nav.leaderboard") + '" title="' + t("nav.leaderboard") + '">🏆</a>' +
      langSwitch() +
      '<button class="icon-btn" type="button" data-action="logout" aria-label="' + t("nav.logout") + '" title="' + t("nav.logout") + '">🚪</button>' +
      "</div></header>";
  }

  function authHeader() {
    return '<header class="app-nav"><div class="nav-inner">' +
      '<a class="brand brand-sm" href="#/"><span class="brand-mark">أ</span><span class="brand-word">ABJAD</span></a>' +
      langSwitch() + "</div></header>";
  }

  function toast(message, kind) {
    const el = document.createElement("div");
    el.className = "toast" + (kind ? " toast-" + kind : "");
    el.textContent = message;
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("show"); });
    window.setTimeout(function () {
      el.classList.remove("show");
      window.setTimeout(function () { el.remove(); }, 300);
    }, 4200);
  }

  function syncCamels(announce) {
    if (!state) return 0;
    const focus = E.qualifiedStreak(state.days || {}, E.localISO(), DAY_GOAL);
    const earned = Math.floor(focus / 7);
    const before = state.camels || 0;
    if (earned > before) {
      state.camels = earned;
      saveState();
      if (announce) toast("🐪 " + t("leader.camelWon"), "camel");
      return earned - before;
    }
    return 0;
  }

  function landingHeader() {
    return '<header class="site-nav"><div class="nav-inner">' +
      '<a class="brand" href="#/"><span class="brand-mark">أ</span><span class="brand-word">ABJAD</span></a>' +
      '<div class="nav-links">' +
      '<label class="lang-pick"><span class="sr-only">' + t("common.language") + "</span>" +
      '<select data-action="lang-select" aria-label="' + t("common.language") + '">' +
      '<option value="en"' + (db.lang === "en" ? " selected" : "") + ">English</option>" +
      '<option value="so"' + (db.lang === "so" ? " selected" : "") + ">Soomaali</option>" +
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

  function renderLogin() {
    if (state) {
      if (location.hash !== "#/learn") location.hash = "#/learn";
      return;
    }
    document.title = "ABJAD — " + t("login.title");
    const ids = Object.keys(db.users);
    const selected = loginId && db.users[loginId];
    app.innerHTML = authHeader() + `
      <main class="auth-wrap">
        <div class="auth-card card">
          <h1>${t("login.title")}</h1>
          <p class="muted">${t("login.subtitle")}</p>
          <p class="field-label">${t("login.choose")}</p>
          <div class="profile-grid">
            ${ids.map((id) => {
              const user = db.users[id];
              return `<button type="button" class="profile-btn ${loginId === id ? "is-active" : ""}" data-action="pick-profile" data-id="${id}">
                <span class="profile-avatar">${user.avatar || user.name.charAt(0)}</span>
                <span class="profile-name">${user.name}</span>
                <span class="profile-camels">🐪 ${user.camels || 0}</span>
              </button>`;
            }).join("")}
          </div>
          ${selected && !selected.pwh ? `
          <form class="login-form" data-form="login">
            <p class="login-hint">${t("login.setupHint")}</p>
            <label for="password">${t("login.newPassword")}</label>
            <input id="password" name="password" type="password" autocomplete="new-password" minlength="6" placeholder="${t("login.passwordPlaceholder")}">
            <label for="confirm">${t("login.confirmPassword")}</label>
            <input id="confirm" name="confirm" type="password" autocomplete="new-password" minlength="6">
            <button class="btn btn-primary btn-block" type="submit">${t("login.setupSubmit")}</button>
          </form>` : `
          <form class="login-form" data-form="login">
            <label for="password">${t("login.password")}</label>
            <input id="password" name="password" type="password" autocomplete="current-password" placeholder="${t("login.passwordPlaceholder")}" ${selected ? "" : "disabled"}>
            <button class="btn btn-primary btn-block" type="submit" ${selected ? "" : "disabled"}>${t("login.submit")}</button>
          </form>`}
          <p class="login-error" id="login-error" role="alert"></p>
          <p class="login-hint">${t("login.hint")}</p>
          ${window.AbjadAuth ? `
          <hr class="auth-sep">
          <p class="field-label">${t("auth.title")}</p>
          <form class="login-form" data-form="email">
            <input name="email" type="email" autocomplete="email" placeholder="${t("auth.email")}" required>
            <input name="password" type="password" autocomplete="current-password" placeholder="${t("auth.password")}" required>
            <button class="btn btn-primary btn-block" type="submit" data-mode="signin">${t("auth.signIn")}</button>
            <button class="btn btn-block" type="submit" data-mode="signup">${t("auth.signUp")}</button>
          </form>` : ""}
          <a class="back-link" href="#/">← ${t("login.back")}</a>
        </div>
      </main>`;
    document.documentElement.lang = db.lang;
    if (selected) {
      const input = document.getElementById("password");
      if (input) input.focus();
    }
  }

  function leaderRow(user, index) {
    const today = E.localISO();
    const focus = E.qualifiedStreak(user.days || {}, today, DAY_GOAL);
    const minutes = Math.floor((user.days && user.days[today] ? user.days[today] : 0) / 60);
    const me = state && user.id === state.id;
    const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : String(index + 1);
    return `<div class="leader-row ${me ? "is-me" : ""}">
      <span class="rank-badge">${medal}</span>
      <span class="leader-avatar">${user.avatar || user.name.charAt(0)}</span>
      <div class="leader-main">
        <strong>${user.name}${me ? ` <span class="you-tag">${t("leader.you")}</span>` : ""}</strong>
        <span class="muted small">⚡ ${user.xp} · 🔥 ${user.streak} · ${t("leader.today", { n: minutes })}</span>
      </div>
      <div class="leader-trophies">
        <span>🐪 ${user.camels || 0}</span>
        <span class="muted small">${t("leader.progress", { n: focus % 7 || (focus ? 7 : 0) })}</span>
      </div>
    </div>`;
  }

  function renderLeaderboard() {
    syncCamels(false);
    document.title = "ABJAD — " + t("leader.title");
    const today = E.localISO();
    const focus = E.qualifiedStreak(state.days || {}, today, DAY_GOAL);
    const progress = focus % 7 || (focus ? 7 : 0);
    const minutes = Math.floor((state.days && state.days[today] ? state.days[today] : 0) / 60);
    const users = Object.keys(db.users).map((id) => db.users[id]);
    const sorted = users.slice().sort((a, b) =>
      (b.camels || 0) - (a.camels || 0) || b.xp - a.xp || a.name.localeCompare(b.name)
    );
    app.innerHTML = appHeader(true) + `
      <main class="wrap leaderboard">
        <div class="dash-head">
          <div>
            <h1>${t("leader.title")}</h1>
            <p class="muted">${t("leader.subtitle")}</p>
          </div>
          <div class="progress-card">
            <span class="muted small">${t("leader.today", { n: minutes })}</span>
            <strong>${t("leader.focus")}: ${focus}</strong>
            <div class="bar"><i style="width:${Math.min(100, Math.round(((state.days[today] || 0) / DAY_GOAL) * 100))}%"></i></div>
          </div>
        </div>

        <section class="camel-card">
          <div class="camel-art">🐪</div>
          <div class="camel-copy">
            <span class="unit-badge">${t("leader.rewardTitle")}</span>
            <h2>${t("leader.rewardText")}</h2>
            <div class="camel-dots">${[0, 1, 2, 3, 4, 5, 6].map((i) => `<span class="camel-dot ${i < progress ? "on" : ""}"></span>`).join("")}</div>
            <p class="muted small">${t("leader.progress", { n: progress })}</p>
          </div>
          <div class="camel-total"><strong>${state.camels || 0}</strong><span>🐪 ${t("leader.camels")}</span></div>
        </section>

        <section class="leader-list">${sorted.map((user, i) => leaderRow(user, i)).join("")}</section>

        <div class="leader-actions">
          <button type="button" class="btn btn-ghost-dark" data-action="change-password">🔑 ${t("leader.changePassword")}</button>
        </div>
      </main>`;
  }

  function renderDashboard() {
    const complete = E.unitsComplete(units, state.done);
    document.title = "ABJAD — " + t("learn.title");
    app.innerHTML = appHeader(false) + `
      <main class="wrap">
        <div class="dash-head">
          <div>
            <h1>${t("learn.title")}</h1>
            <p class="user-greeting">${t("learn.welcome", { name: state.name })}</p>
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
      unitId: unit.id, stageIndex: index, stage, lang: db.lang,
      i: 0, correct: 0, total: 0, answered: null, chosen: null,
      used: [], attempts: 0, feedback: null, qs: null, tasks: null,
      mode: null, line: 0, answers: {}
    };
    if (stage === "learn") s.total = unit.cards.length;
    if (stage === "quiz") {
      s.qs = E.makeQuiz(unit.cards, allCards, db.lang, Math.random, Math.min(6, unit.cards.length));
      s.total = s.qs.length;
    }
    if (stage === "write") {
      s.tasks = E.shuffle(unit.cards, Math.random)
        .slice(0, Math.min(6, unit.cards.length))
        .map((card) => E.makeWrite(card, allCards, Math.random, db.lang));
      s.total = s.tasks.length;
    }
    if (stage === "recap") {
      if (unit.dialogue) {
        s.mode = "dialogue";
        s.total = unit.dialogue.filter((line) => line.who === "you").length;
      } else {
        s.mode = "quiz";
        s.qs = E.makeQuiz(unit.cards, allCards, db.lang, Math.random, Math.min(8, unit.cards.length));
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
        (session.lang !== db.lang && session.stage !== "result")) {
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
      unitId: unit.id, stageIndex: index, stage: "result", lang: db.lang,
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
    if (action === "pick-profile") {
      loginId = el.dataset.id;
      renderLogin();
      return;
    }
    if (action === "logout") {
      if (window.AbjadAuth) window.AbjadAuth.signOut();
      db.currentUser = null;
      saveState();
      state = null;
      session = null;
      loginId = null;
      location.hash = "#/login";
      return;
    }
    if (action === "change-password") {
      const next = window.prompt(t("leader.passwordPrompt"));
      if (next === null) return;
      const clean = next.trim();
      if (clean.length < KDF_MIN) {
        window.alert(t("leader.passwordShort"));
        return;
      }
      makePwh(clean).then(function (pwh) {
        state.pwh = pwh;
        saveState();
        toast(t("leader.passwordChanged"));
      }).catch(function () {
        window.alert(t("login.error"));
      });
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

  app.addEventListener("submit", function (event) {
    const emailForm = event.target.closest('[data-form="email"]');
    if (emailForm) {
      event.preventDefault();
      if (!window.AbjadAuth) return;
      const error = document.getElementById("login-error");
      const emailEl = emailForm.querySelector('input[name="email"]');
      const passEl = emailForm.querySelector('input[name="password"]');
      const email = (emailEl && emailEl.value ? emailEl.value : "").trim();
      const pass = passEl && passEl.value ? passEl.value : "";
      const mode = (event.submitter && event.submitter.dataset.mode) || "signin";
      const buttons = emailForm.querySelectorAll("button");
      const unlock = function () {
        Array.prototype.forEach.call(buttons, function (b) { b.disabled = false; });
      };
      if (!email || email.indexOf("@") < 1) {
        if (error) error.textContent = t("auth.needEmail");
        return;
      }
      if (pass.length < KDF_MIN) {
        if (error) error.textContent = t("auth.weak");
        return;
      }
      Array.prototype.forEach.call(buttons, function (b) { b.disabled = true; });
      const call = mode === "signup"
        ? window.AbjadAuth.signUp(email, pass)
        : window.AbjadAuth.signIn(email, pass);
      call.then(function (data) {
        if (mode === "signup" && (!data || !data.access_token)) {
          if (error) error.textContent = t("auth.confirmEmail");
          unlock();
          return;
        }
        const user = mode === "signup" ? data.user : data;
        if (!user || !user.id) throw new Error("no user");
        loginAccount(user, email);
      }).catch(function (err) {
        const offline = !err || err.name === "TypeError";
        if (error) error.textContent = offline ? t("auth.error") : (err.message || t("auth.error"));
        unlock();
      });
      return;
    }

    const form = event.target.closest('[data-form="login"]');
    if (!form) return;
    event.preventDefault();
    const user = loginId && db.users[loginId];
    if (!user) return;
    const error = document.getElementById("login-error");
    const input = form.querySelector('input[name="password"]');
    const pass = (input && input.value ? input.value : "").trim();
    const submit = form.querySelector('button[type="submit"]');

    if (!user.pwh) {
      const confirmField = form.querySelector('input[name="confirm"]');
      const confirmValue = (confirmField && confirmField.value ? confirmField.value : "").trim();
      if (pass.length < KDF_MIN) {
        if (error) error.textContent = t("login.weak");
        if (input) input.focus();
        return;
      }
      if (pass !== confirmValue) {
        if (error) error.textContent = t("login.mismatch");
        if (confirmField) confirmField.focus();
        return;
      }
      if (submit) submit.disabled = true;
      makePwh(pass).then(function (pwh) {
        user.pwh = pwh;
        finishLogin(user);
      }).catch(function () {
        if (error) error.textContent = t("login.error");
        if (submit) submit.disabled = false;
      });
      return;
    }

    if (submit) submit.disabled = true;
    checkPwh(pass, user.pwh).then(function (ok) {
      if (!ok) {
        if (error) error.textContent = t("login.error");
        if (input) input.select();
        if (submit) submit.disabled = false;
        return;
      }
      finishLogin(user);
    }).catch(function () {
      if (error) error.textContent = t("login.error");
      if (submit) submit.disabled = false;
    });
  });

  function loginAccount(user, email) {
    const uid = "acc-" + user.id;
    const local = (email || user.email || "").toLowerCase().split("@")[0].replace(/[^a-z0-9._-]/g, "") || "Account";
    if (!db.users[uid]) {
      db.users[uid] = normalizeUser(
        { id: uid, name: local, avatar: "✉️", account: true },
        { id: uid, name: local, avatar: "✉️" });
    }
    finishLogin(db.users[uid]);
  }

  if (window.AbjadAuth && state && state.account) {
    window.AbjadAuth.currentUser().then(function (user) {
      if (!user && state && state.account) {
        db.currentUser = null;
        state = null;
        saveState();
      }
    }).catch(function () {});
  }

  function finishLogin(user) {
    db.currentUser = user.id;
    state = user;
    saveState();
    syncCamels(false);
    loginId = null;
    toast(t("login.welcome", { name: user.name }));
    location.hash = "#/learn";
  }

  function requireAuth() {
    if (state) return true;
    if (location.hash !== "#/login") {
      location.hash = "#/login";
    }
    renderLogin();
    return false;
  }

  function route() {
    const hash = location.hash.replace(/^#\/?/, "");
    const parts = hash.split("/").filter(Boolean);
    if (parts.length === 0) return renderLanding();
    if (parts[0] === "login") {
      if (state) {
        if (location.hash !== "#/learn") location.hash = "#/learn";
        return renderDashboard();
      }
      return renderLogin();
    }
    if (parts[0] === "learn") return requireAuth() ? renderDashboard() : undefined;
    if (parts[0] === "leaderboard") return requireAuth() ? renderLeaderboard() : undefined;
    if (parts[0] === "lesson" && parts[1]) {
      if (!requireAuth()) return;
      return renderLesson(parts[1], parts[2]);
    }
    return renderLanding();
  }

  function isLearningRoute() {
    return location.hash.indexOf("#/learn") === 0 || location.hash.indexOf("#/lesson/") === 0;
  }

  function tick() {
    if (!state || document.visibilityState !== "visible" || !isLearningRoute()) return;
    if (Date.now() - lastActivity > 300000) return;
    const today = E.localISO();
    state.days[today] = (state.days[today] || 0) + 15;
    saveState();
    syncCamels(true);
  }

  window.setInterval(tick, 15000);
  ["pointerdown", "keydown", "touchstart"].forEach(function (name) {
    document.addEventListener(name, function () { lastActivity = Date.now(); }, { passive: true });
  });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") lastActivity = Date.now();
  });

  window.addEventListener("hashchange", function () {
    session = null;
    route();
  });

  document.documentElement.lang = db.lang;
  route();

  if ("serviceWorker" in navigator && /^https?:/.test(location.protocol)) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
