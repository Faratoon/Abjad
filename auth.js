/* ABJAD accounts — Supabase email auth over REST (no SDK, works offline-first when unused). */
(function () {
  "use strict";

  const cfg = globalThis.ABJAD_AUTH;
  if (!cfg || !cfg.url || !cfg.key) {
    globalThis.AbjadAuth = null;
    return;
  }

  const BASE = String(cfg.url).replace(/\/+$/, "");
  const KEY_ = cfg.key;
  const KEY = "abjad.auth";
  let session = readSession();

  function readSession() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "null");
    } catch (err) {
      return null;
    }
  }

  function writeSession(next) {
    session = next;
    try {
      if (next) localStorage.setItem(KEY, JSON.stringify(next));
      else localStorage.removeItem(KEY);
    } catch (err) {
      /* private mode: session stays in memory */
    }
  }

  async function request(path, options) {
    const opts = options || {};
    const headers = { apikey: KEY_, "Content-Type": "application/json" };
    if (opts.token) headers.Authorization = "Bearer " + opts.token;
    const res = await fetch(BASE + path, {
      method: opts.method || "GET",
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    let data = null;
    try {
      data = await res.json();
    } catch (err) {
      data = null;
    }
    if (!res.ok) {
      const message = (data && (data.msg || data.error_description || data.message || data.error)) || "HTTP " + res.status;
      throw new Error(message);
    }
    return data;
  }

  function store(data) {
    if (!data || !data.access_token) throw new Error("Authentication failed");
    writeSession({
      access: data.access_token,
      refresh: data.refresh_token,
      expires: Date.now() + (Number(data.expires_in) || 3600) * 1000,
      user: data.user || (session && session.user) || null
    });
    return session.user;
  }

  async function signUp(email, password) {
    const data = await request("/auth/v1/signup", { method: "POST", body: { email, password } });
    if (data && data.access_token) store(data);
    return data || null;
  }

  async function signIn(email, password) {
    const data = await request("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: { email, password }
    });
    return store(data);
  }

  async function refresh() {
    if (!session || !session.refresh) return null;
    const data = await request("/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      body: { refresh_token: session.refresh }
    });
    return store(data);
  }

  async function currentUser() {
    if (!session) return null;
    if (session.expires && Date.now() > session.expires - 60000) {
      try {
        await refresh();
      } catch (err) {
        writeSession(null);
        return null;
      }
    }
    return session.user || null;
  }

  async function signOut() {
    const token = session && session.access;
    writeSession(null);
    if (!token) return;
    try {
      await request("/auth/v1/logout", { method: "POST", token });
    } catch (err) {
      /* local sign-out already happened */
    }
  }

  globalThis.AbjadAuth = { signUp, signIn, signOut, currentUser, session: () => session };
})();
