/* ABJAD passphrases — PBKDF2-SHA256, all local, no server. */
(function () {
  "use strict";

  const ITER = 150000;
  const MIN = 6;
  const enc = new TextEncoder();

  function toB64(buf) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));
  }

  function fromB64(str) {
    return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
  }

  function valid(pwh) {
    return !!pwh && typeof pwh.salt === "string" && typeof pwh.hash === "string";
  }

  async function derive(pass, salt, iter) {
    const key = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveBits"]);
    return crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, key, 256);
  }

  async function make(pass) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const bits = await derive(pass, salt, ITER);
    return { salt: toB64(salt), hash: toB64(bits), iter: ITER };
  }

  async function check(pass, pwh) {
    if (!valid(pwh)) return false;
    const bits = await derive(pass, fromB64(pwh.salt), Number(pwh.iter) || ITER);
    const a = new Uint8Array(bits);
    const b = fromB64(pwh.hash);
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
    return diff === 0;
  }

  globalThis.AbjadPass = { make, check, valid, min: MIN, iter: ITER };
})();
