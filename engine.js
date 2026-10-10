/* Game rules shared by the renderer and Node's test runner. */
(function (root, make) {
  const api = make();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BabyEngine = api;
})(typeof window !== 'undefined' ? window : undefined, function () {
  'use strict';
  const defaults = Object.freeze({ food: 85, energy: 85, hygiene: 85, health: 95 });
  const rates = Object.freeze({ food: 0.013, energy: 0.010, hygiene: 0.008, health: 0.001 });
  const actions = Object.freeze({
    feed: { need: 'food', amount: 34, label: 'Mamadeira' },
    sleep: { need: 'energy', amount: 45, label: 'Descanso' },
    diaper: { need: 'hygiene', amount: 42, label: 'Trocar fralda' },
    medicine: { need: 'health', amount: 35, label: 'Remédio' }
  });
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function initial() {
    return { needs: { ...defaults }, happiness: 80, xp: 0, careCount: 0, lastCare: '', savedAt: Date.now() };
  }
  function sanitize(raw) {
    const value = raw && typeof raw === 'object' ? raw : {};
    const needs = {};
    for (const key of Object.keys(defaults)) {
      const n = Number(value.needs && value.needs[key]);
      needs[key] = Number.isFinite(n) ? clamp(n, 0, 100) : defaults[key];
    }
    return {
      needs,
      happiness: Number.isFinite(value.happiness) ? clamp(value.happiness, 0, 100) : 80,
      xp: Number.isFinite(value.xp) ? clamp(Math.floor(value.xp), 0, 1000000) : 0,
      careCount: Number.isFinite(value.careCount) ? clamp(Math.floor(value.careCount), 0, 1000000) : 0,
      lastCare: typeof value.lastCare === 'string' ? value.lastCare.slice(0, 32) : '',
      savedAt: Number.isFinite(value.savedAt) ? value.savedAt : Date.now()
    };
  }
  function tick(input, seconds) {
    const state = sanitize(input);
    const dt = clamp(Number(seconds) || 0, 0, 600);
    if (!dt) return state;
    for (const key of Object.keys(rates)) {
      let drain = rates[key] * dt;
      if (key === 'health' && (state.needs.food < 20 || state.needs.hygiene < 20 || state.needs.energy < 15)) drain += 0.022 * dt;
      state.needs[key] = clamp(state.needs[key] - drain, 0, 100);
    }
    const avg = Object.values(state.needs).reduce((a, b) => a + b, 0) / 4;
    state.happiness = clamp(state.happiness + (avg >= 65 ? 0.002 : -0.009) * dt, 0, 100);
    return state;
  }
  function care(input, action) {
    const state = sanitize(input);
    const target = actions[action];
    if (!target) return { state, applied: false };
    const current = state.needs[target.need];
    // Avoid encouraging repetitive button spamming.
    if (current >= 99) return { state, applied: false };
    state.needs[target.need] = clamp(current + target.amount, 0, 100);
    state.happiness = clamp(state.happiness + 6, 0, 100);
    state.xp += 10;
    state.careCount += 1;
    state.lastCare = action;
    state.savedAt = Date.now();
    return { state, applied: true };
  }
  function concern(state) {
    const needs = sanitize(state).needs;
    return Object.keys(needs).sort((a, b) => needs[a] - needs[b])[0];
  }
  function level(state) { return Math.min(20, 1 + Math.floor(sanitize(state).xp / 100)); }
  return Object.freeze({ defaults, actions, initial, sanitize, tick, care, concern, level, clamp });
});
