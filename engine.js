/* Baby On Screen - shared deterministic game rules for the web and Windows. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BabyEngine = api;
})(typeof window !== 'undefined' ? window : undefined, function () {
  'use strict';
  const VERSION = 2;
  const defaults = Object.freeze({ food: 85, energy: 85, hygiene: 85, health: 95 });
  const rates = Object.freeze({ food: .055, energy: .045, hygiene: .039, health: .005 });
  const stages = Object.freeze([
    { id: 'newborn', title: 'Recém-nascida', minutes: 0, cares: 0, sprite: 'newborn', description: 'Descobrindo o mundo' },
    { id: 'baby', title: 'Bebê curiosa', minutes: 10, cares: 8, sprite: 'baby', description: 'Aprendendo sons' },
    { id: 'toddler', title: 'Primeiros passos', minutes: 35, cares: 26, sprite: 'toddler', description: 'Aprendendo palavras' },
    { id: 'child', title: 'Criança', minutes: 90, cares: 65, sprite: 'child', description: 'Explorando e conversando' }
  ]);
  const actions = Object.freeze({
    feed: { need: 'food', amount: 37, label: 'Mamadeira', cooldown: 48 },
    sleep: { need: 'energy', amount: 42, label: 'Dormir', cooldown: 55 },
    diaper: { need: 'hygiene', amount: 46, label: 'Trocar fralda', cooldown: 42 },
    medicine: { need: 'health', amount: 32, label: 'Remédio', cooldown: 65 }
  });
  const activities = Object.freeze({
    toy: { label: 'Brinquedo', cooldown: 72, happiness: 17, skill: 'play' },
    letter: { label: 'Cartinha', cooldown: 105, happiness: 10, skill: 'bond' },
    drawing: { label: 'Desenho', cooldown: 92, happiness: 11, skill: 'creativity' }
  });
  const schoolSubjects = Object.freeze({
    reading: { label: 'Leitura', skill: 'reading' },
    numbers: { label: 'Números', skill: 'numbers' },
    arts: { label: 'Artes', skill: 'arts' }
  });
  const speech = Object.freeze({
    newborn: {
      idle: ['Gugu... 🩷', 'Da... da!', 'Agu... agu!', 'Bababá!'],
      happy: ['Gugugu! 💕', 'Hehe! Aaah!', 'Da-daaa!'],
      food: ['Mamã... 🍼', 'Uééé! 🍼', 'Baba...'],
      energy: ['Nana... 💤', 'Buuu...'],
      hygiene: ['Uééé! 🧷', 'Aaaa...'],
      health: ['Dodói... 😢', 'Uééé...'],
      play: ['Gugugá! 🧸', 'Aaaaa!'],
      care: ['Dada! 💗', 'Gugu!'],
      cry: ['Uééé! 😭', 'Buááá!'],
      return: ['Gugu! 💕', 'Aaah!']
    },
    baby: {
      idle: ['Dada, olha!', 'Oii...', 'Amii... 💕', 'Gugu dada!'],
      happy: ['Hehe! Bom!', 'Oii amii!'],
      food: ['Qué mamá! 🍼', 'Papá...'],
      energy: ['Naná... 🌙', 'Qué naná!'],
      hygiene: ['Falda... 🧷', 'Limpá!'],
      health: ['Dodói... 😢', 'Ajuda...'],
      play: ['Binca! 🧸', 'Mais! Mais!'],
      care: ['Oba! 💕', 'Bigadu!'],
      cry: ['Buááá! 😭', 'Amii... ajuda!'],
      return: ['Oiii! 💕', 'Amii voltou!']
    },
    toddler: {
      idle: ['Oi, amigo! 💕', 'Vamos brincar?', 'Olha o que aprendi!', 'Tô crescendo!'],
      happy: ['Que legal!', 'Tô feliz! ✨'],
      food: ['Quero papá! 🍼', 'Tô com fominha!'],
      energy: ['Tô com sono... 🌙', 'Hora do naná!'],
      hygiene: ['Minha fralda! 🧷', 'Preciso limpar!'],
      health: ['Tô dodói... 😢', 'Me ajuda?'],
      play: ['Vamos brincar! 🧸', 'Quero desenhar!'],
      care: ['Obrigada! 💖', 'Você é legal!'],
      cry: ['Tô triste... 😭', 'Preciso de ajuda!'],
      return: ['Você voltou! 💕', 'Oi, amigo!']
    },
    child: {
      idle: ['Oi, amigo! Que bom te ver!', 'Aprendi uma coisa nova hoje!', 'Vamos fazer algo divertido?', 'Que dia bonito!'],
      happy: ['Adoro brincar com você!', 'Hoje estou muito feliz! 🌈'],
      food: ['Estou com fome, vamos comer?', 'Será que tem um lanche?'],
      energy: ['Quero tirar uma soneca.', 'Estou cansadinha...'],
      hygiene: ['Preciso me limpar!', 'Hora de cuidar da higiene!'],
      health: ['Não estou me sentindo bem.', 'Pode cuidar de mim?'],
      play: ['Adorei brincar! 🧸', 'Que tal pintar um desenho?'],
      care: ['Obrigada por cuidar de mim!', 'Você sempre me ajuda!'],
      cry: ['Estou triste, preciso de você. 😢', 'Me ajuda, por favor?'],
      return: ['Oi, amigo! Estava com saudades!', 'Que bom que você voltou!']
    }
  });
  function clamp(value, lo, hi) { return Math.min(hi, Math.max(lo, value)); }
  function finite(value, fallback, lo, hi) {
    const v = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(v) ? clamp(v, lo, hi) : fallback;
  }
  function initial(now) {
    return {
      schemaVersion: VERSION, needs: { ...defaults }, happiness: 80, xp: 0, careCount: 0,
      interactions: 0, lastCare: '', lifeSeconds: 0, activeSeconds: 0,
      skills: { play: 0, bond: 0, creativity: 0, reading: 0, numbers: 0, arts: 0 },
      schoolVisits: 0, memories: [], memoryCounts: {}, cooldowns: {}, achievements: [], lastSpoken: '',
      savedAt: finite(now, Date.now(), 0, 9999999999999)
    };
  }
  function sanitize(raw) {
    const v = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const base = initial();
    const needs = {};
    for (const key of Object.keys(defaults))
      needs[key] = finite(v.needs && v.needs[key], defaults[key], 0, 100);
    const skills = {};
    for (const key of Object.keys(base.skills))
      skills[key] = Math.floor(finite(v.skills && v.skills[key], 0, 0, 10000));
    const cooldowns = {};
    for (const key of [...Object.keys(actions), ...Object.keys(activities), 'school']) {
      cooldowns[key] = finite(v.cooldowns && v.cooldowns[key], 0, 0, 9999999999999);
    }
    const cleanStrings = (list, max, limit) => Array.isArray(list) ? list.filter(x => typeof x === 'string').slice(-max).map(x => x.slice(0, limit)) : [];
    const memories = cleanStrings(v.memories, 24, 120);
    const memoryCounts = Object.create(null);
    if (v.memoryCounts && typeof v.memoryCounts === 'object' && !Array.isArray(v.memoryCounts)) {
      for (const [rawLabel, rawCount] of Object.entries(v.memoryCounts).slice(-80)) {
        const label = rawLabel.trim().slice(0, 120);
        const count = Math.floor(finite(rawCount, 0, 0, 1000000));
        if (label && count > 0) memoryCounts[label] = count;
      }
    }
    // Migrate existing saves: only the most recent 24 events are recoverable.
    if (Object.keys(memoryCounts).length === 0) {
      for (const label of memories) {
        if (label.trim()) memoryCounts[label] = (memoryCounts[label] || 0) + 1;
      }
    }
    return {
      schemaVersion: VERSION,
      needs, happiness: finite(v.happiness, 80, 0, 100),
      xp: Math.floor(finite(v.xp, 0, 0, 1000000)),
      careCount: Math.floor(finite(v.careCount, 0, 0, 1000000)),
      interactions: Math.floor(finite(v.interactions, 0, 0, 1000000)),
      lastCare: typeof v.lastCare === 'string' ? v.lastCare.slice(0, 32) : '',
      lifeSeconds: finite(v.lifeSeconds, 0, 0, 100000000),
      activeSeconds: finite(v.activeSeconds, v.lifeSeconds || 0, 0, 100000000),
      skills, schoolVisits: Math.floor(finite(v.schoolVisits, 0, 0, 100000)),
      memories, memoryCounts,
      cooldowns, achievements: cleanStrings(v.achievements, 30, 64),
      lastSpoken: typeof v.lastSpoken === 'string' ? v.lastSpoken.slice(0, 120) : '',
      savedAt: finite(v.savedAt, Date.now(), 0, 9999999999999)
    };
  }
  function addMemory(state, label) {
    if (typeof label !== 'string' || !label.trim()) return;
    const key = label.trim().slice(0, 120);
    // Recent history stays bounded for small saves; aggregates do not lose old events.
    state.memories.push(key);
    state.memories = state.memories.slice(-24);
    const counts = state.memoryCounts;
    if (!Object.hasOwn(counts, key) && Object.keys(counts).length >= 80) {
      delete counts[Object.keys(counts)[0]];
    }
    counts[key] = Math.min(1000000, (counts[key] || 0) + 1);
  }
  function memorySummary(input) {
    const state = sanitize(input);
    const counts = state.memoryCounts;
    const ordered = [];
    const seen = new Set();
    // Show the most recently experienced types first, including existing saves.
    for (const label of state.memories.slice().reverse()) {
      if (counts[label] && !seen.has(label)) { ordered.push(label); seen.add(label); }
    }
    for (const label of Object.keys(counts).reverse()) {
      if (!seen.has(label)) { ordered.push(label); seen.add(label); }
    }
    const groups = ordered.map(label => ({ label, count: counts[label] }));
    return { total: groups.reduce((sum, item) => sum + item.count, 0), groups };
  }
  function ageStage(input) {
    const s = sanitize(input);
    let stage = stages[0];
    for (const item of stages) {
      if (s.activeSeconds >= item.minutes * 60 && s.careCount >= item.cares) stage = item;
    }
    return stage;
  }
  function ageDays(input) { return 1 + Math.floor(sanitize(input).activeSeconds / 900); }
  function level(input) { return Math.min(20, 1 + Math.floor(sanitize(input).xp / 100)); }
  function concern(input) {
    const n = sanitize(input).needs;
    return Object.keys(defaults).sort((a, b) => n[a] - n[b])[0];
  }
  function urgency(input) {
    const s = sanitize(input), need = concern(s);
    if (s.needs[need] < 48) return { need, level: 'crying', value: s.needs[need] };
    if (s.needs[need] < 72) return { need, level: 'asking', value: s.needs[need] };
    return { need, level: 'calm', value: s.needs[need] };
  }
  function unlock(s) {
    const unlocked = [];
    const stage = ageStage(s);
    const checks = [
      ['first-care', s.careCount >= 1, 'Meu primeiro cuidado!'],
      ['friendship', s.skills.bond >= 5, 'Nossa amizade cresceu'],
      ['playing', s.skills.play >= 10, 'Adora brincar'],
      ['first-words', stage.id === 'toddler' || stage.id === 'child', 'Primeiras palavras'],
      ['first-steps', stage.id === 'toddler' || stage.id === 'child', 'Primeiros passos'],
      ['childhood', stage.id === 'child', 'Cheguei à infância'],
      ['first-class', s.schoolVisits >= 1, 'Primeiro dia de aula']
    ];
    for (const [key, done, label] of checks) {
      if (done && !s.achievements.includes(key)) {
        s.achievements.push(key);
        addMemory(s, label);
        unlocked.push(label);
      }
    }
    return unlocked;
  }
  function tick(input, seconds, opts) {
    const s = sanitize(input), dt = clamp(Number(seconds) || 0, 0, 600);
    if (dt <= 0) return s;
    const active = !opts || opts.active !== false;
    if (active) { s.activeSeconds += dt; s.lifeSeconds += dt; }
    for (const key of Object.keys(rates)) {
      let drain = rates[key] * dt;
      if (key === 'health' && (s.needs.food < 25 || s.needs.energy < 20 || s.needs.hygiene < 20)) drain += .020 * dt;
      s.needs[key] = clamp(s.needs[key] - drain, 0, 100);
    }
    const unhappy = urgency(s).level !== 'calm';
    s.happiness = clamp(s.happiness + (unhappy ? -.035 : .006) * dt, 0, 100);
    unlock(s);
    return s;
  }
  function ready(input, key, now) {
    const s = sanitize(input);
    return finite(now, Date.now(), 0, 9999999999999) >= (s.cooldowns[key] || 0);
  }
  function care(input, name, now) {
    const s = sanitize(input), item = actions[name], time = finite(now, Date.now(), 0, 9999999999999);
    if (!item) return { state: s, applied: false, reason: 'unknown' };
    if (!ready(s, name, time)) return { state: s, applied: false, reason: 'cooldown' };
    if (s.needs[item.need] > 74) return { state: s, applied: false, reason: 'not-needed' };
    s.needs[item.need] = clamp(s.needs[item.need] + item.amount, 0, 100);
    s.happiness = clamp(s.happiness + 7, 0, 100);
    s.xp = clamp(s.xp + 10, 0, 1000000);
    s.careCount++; s.lastCare = name;
    s.skills.bond = clamp(s.skills.bond + 1, 0, 10000);
    s.cooldowns[name] = time + item.cooldown * 1000;
    s.savedAt = time;
    const achievements = unlock(s);
    return { state: s, applied: true, reason: 'ok', achievements };
  }
  function interact(input, name, now) {
    const s = sanitize(input), item = activities[name], time = finite(now, Date.now(), 0, 9999999999999);
    if (!item) return { state: s, applied: false, reason: 'unknown' };
    if (!ready(s, name, time)) return { state: s, applied: false, reason: 'cooldown' };
    s.happiness = clamp(s.happiness + item.happiness, 0, 100);
    s.skills[item.skill] = clamp(s.skills[item.skill] + 1, 0, 10000);
    s.interactions++; s.xp = clamp(s.xp + 7, 0, 1000000);
    s.cooldowns[name] = time + item.cooldown * 1000;
    const notes = {
      toy: 'Brincamos com um brinquedo!',
      letter: 'Ganhei uma cartinha carinhosa!',
      drawing: 'Criamos um desenho juntas!'
    };
    addMemory(s, notes[name]);
    s.savedAt = time;
    return { state: s, applied: true, reason: 'ok', achievements: unlock(s) };
  }
  function school(input, subject, now) {
    const s = sanitize(input), lesson = schoolSubjects[subject], time = finite(now, Date.now(), 0, 9999999999999);
    if (!lesson) return { state: s, applied: false, reason: 'unknown' };
    if (ageStage(s).id !== 'child') return { state: s, applied: false, reason: 'too-young' };
    if (!ready(s, 'school', time)) return { state: s, applied: false, reason: 'cooldown' };
    if (s.needs.energy < 35 || s.needs.food < 35) return { state: s, applied: false, reason: 'needs-care' };
    s.schoolVisits++; s.skills[lesson.skill]++;
    s.xp = clamp(s.xp + 30, 0, 1000000);
    s.needs.energy = clamp(s.needs.energy - 12, 0, 100);
    s.needs.food = clamp(s.needs.food - 8, 0, 100);
    s.happiness = clamp(s.happiness + 8, 0, 100);
    s.cooldowns.school = time + 360 * 1000; s.savedAt = time;
    addMemory(s, 'Aprendi ' + lesson.label.toLowerCase() + ' na escola!');
    return { state: s, applied: true, reason: 'ok', achievements: unlock(s) };
  }
  function speak(input, context, random) {
    const s = sanitize(input), bank = speech[ageStage(s).id], urgent = urgency(s);
    let key = typeof context === 'string' ? context : 'idle';
    if (key === 'idle' && urgent.level === 'crying') key = 'cry';
    else if (key === 'idle' && urgent.level === 'asking') key = urgent.need;
    const pool = bank[key] || bank.idle;
    const n = finite(random, .25, 0, .999999);
    const phrase = pool[Math.floor(pool.length * n)] || pool[0];
    return phrase;
  }
  function exportSave(input) {
    return JSON.stringify({ application: 'baby-on-screen', version: VERSION, exportedAt: new Date().toISOString(), progress: sanitize(input) }, null, 2);
  }
  function importSave(data) {
    let parsed = data;
    if (typeof parsed === 'string') {
      if (parsed.length > 100000) throw new Error('Arquivo muito grande.');
      try { parsed = JSON.parse(parsed); } catch { throw new Error('Arquivo JSON inválido.'); }
    }
    if (!parsed || parsed.application !== 'baby-on-screen' || ![1, 2].includes(parsed.version) || !parsed.progress || typeof parsed.progress !== 'object')
      throw new Error('Este arquivo não é um salvamento Baby On Screen.');
    return sanitize(parsed.progress);
  }
  return Object.freeze({
    VERSION, defaults, stages, actions, activities, schoolSubjects, speech,
    initial, sanitize, tick, care, interact, school, ageStage, ageDays, level, concern, urgency,
    speak, ready, exportSave, importSave, memorySummary, clamp
  });
});
