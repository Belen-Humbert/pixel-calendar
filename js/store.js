// Datos, fechas y cálculos. Todo se guarda en localStorage del celular.

export const CATS = [
  { id: 'lectura',   name: 'Lectura',          chip: '#f1effa', color: '#4a4680', bar: '#d9d6f0' },
  { id: 'ejercicio', name: 'Ejercicio',        chip: '#1f3566', color: '#7fa6ff' },
  { id: 'programar', name: 'Programar',        chip: '#173f2a', color: '#5be38a' },
  { id: 'estudiar',  name: 'Estudiar',         chip: '#4a3b12', color: '#ffd35a' },
  { id: 'trabajo',   name: 'Trabajo',          chip: '#4f2a17', color: '#ff9b5c' },
  { id: 'play',      name: 'Momento play',     chip: '#36255a', color: '#c79bff' },
  { id: 'novia',     name: 'Horario de novia', chip: '#4d1f36', color: '#ff8cc0' },
  { id: 'tv',        name: 'Series / pelis',   chip: '#4d1a22', color: '#ff6b7d' },
  { id: 'otra',      name: 'Otra',             chip: '#123f3b', color: '#4fe0cf' },
];
export const CAT = Object.fromEntries(CATS.map(c => [c.id, c]));
// color para puntitos y barras (la lectura es "blanca")
export const dotColor = id => (CAT[id] || CAT.otra).bar || (CAT[id] || CAT.otra).color;

/* ---------- fechas (siempre 'YYYY-MM-DD' en hora local) ---------- */
export const DN = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'];
export const DLONG = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const pad = n => String(n).padStart(2, '0');
export const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = s => { const [a, b, c] = s.split('-').map(Number); return new Date(a, b - 1, c, 12); };
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
export const weekIdx = s => (parse(s).getDay() + 6) % 7; // 0 = lunes
export const mondayOf = s => addDays(s, -weekIdx(s));
export const today = () => ymd(new Date());
export const hm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const mins = t => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + m; };
export const plusMins = (t, n) => { const m = ((mins(t) + n) % 1440 + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
export const dur = e => { let x = mins(e.end) - mins(e.start); if (x < 0) x += 1440; return x; };
export const fmtH = m => { const h = Math.floor(m / 60), r = m % 60; return h ? `${h}h${r ? ' ' + pad(r) : ''}` : `${r}m`; };
export const shortDay = s => `${DN[weekIdx(s)]} ${parse(s).getDate()}`;

/* ---------- estado ---------- */
const KEY = 'pixelplan.v2';
const DEFAULTS = {
  events: [],   // {id, date, cat, title, start, end, status: pending|done|moved|skipped, movedTo?, from?, demo?}
  shows: ['One Piece', 'The Office', 'Stranger Things', 'Peli de terror', 'Anime nuevo'],
  sound: true,
  seenWeek: '',  // lunes de la última semana cuyo resumen ya vio
  seenMonth: '', // 'YYYY-MM' del último mes cuyo resumen ya vio
  demoSeeded: false,
  deleted: {},   // id -> momento en que se borró (para sincronizar borrados)
  showsU: 0,     // última vez que se editó la lista de series
};

export const now = () => Date.now();
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function load() {
  let s;
  try { s = { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) || 'null') || {}) }; }
  catch { s = { ...DEFAULTS }; }
  // la app arranca vacía: si quedaron ejemplos de versiones anteriores, se borran
  s.events = s.events.filter(e => !e.demo);
  s.demoSeeded = true;
  return s;
}
export function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* sin espacio o modo privado */ } }


/* ---------- consultas ---------- */
export const eventsOn = (s, d) => s.events.filter(e => e.date === d).sort((a, b) => mins(a.start) - mins(b.start));
export const eventsBetween = (s, a, b) => s.events.filter(e => e.date >= a && e.date <= b);
/** pendiente de un día que ya pasó = no hecho */
export const statusOf = e => (e.status === 'pending' && e.date < today() ? 'skipped' : e.status);

export function rangeStats(s, from, to) {
  const ev = eventsBetween(s, from, to);
  const n = { done: 0, moved: 0, skipped: 0, pending: 0 };
  const lists = { done: [], moved: [], skipped: [], pending: [] };
  ev.forEach(e => { const st = statusOf(e); n[st]++; lists[st].push(e); });
  Object.values(lists).forEach(l => l.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)));
  const due = n.done + n.skipped; // lo que ya "tocaba" hacer
  const pct = due ? Math.round((n.done / due) * 100) : 0;
  const rows = CATS.map(c => {
    const es = ev.filter(e => e.cat === c.id && e.status !== 'moved');
    if (!es.length) return null;
    const plan = es.reduce((a, e) => a + dur(e), 0);
    const done = es.filter(e => e.status === 'done').reduce((a, e) => a + dur(e), 0);
    const name = c.id === 'otra' ? [...new Set(es.map(e => e.title))].slice(0, 3).join(', ') : c.name;
    return { cat: c, name, plan, done, count: es.filter(e => e.status === 'done').length };
  }).filter(Boolean).sort((a, b) => b.done - a.done || b.plan - a.plan);
  const total = rows.reduce((a, r) => a + r.done, 0);
  const activeDays = new Set(lists.done.map(e => e.date)).size;
  return { ev, n, lists, due, pct, rows, total, activeDays };
}
export const weekStats = (s, monday) => rangeStats(s, monday, addDays(monday, 6));

/* ---------- meses ('YYYY-MM') ---------- */
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const monthOf = d => d.slice(0, 7);
export const monthName = ym => MESES[+ym.slice(5, 7) - 1];
export const monthStart = ym => `${ym}-01`;
export const monthEnd = ym => { const [y, m] = ym.split('-').map(Number); return ymd(new Date(y, m, 0, 12)); };
export const addMonths = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1, 12); return ymd(d).slice(0, 7); };
export const monthStats = (s, ym) => rangeStats(s, monthStart(ym), monthEnd(ym));

/** Resumen chico de un mes, para guardar en la nube. */
export function monthSummary(s, ym) {
  const M = monthStats(s, ym);
  return {
    month: ym, pct: M.pct, totalMin: M.total, activeDays: M.activeDays, counts: M.n,
    rows: M.rows.map(r => ({ cat: r.cat.id, name: r.name, doneMin: r.done, planMin: r.plan, times: r.count })),
  };
}

/* ---------- sincronización: unir datos de dos dispositivos ---------- */
/** Une el estado local con el de la nube. Gana el cambio más nuevo de cada actividad. */
export function mergeStates(local, remote) {
  if (!remote) return local;
  const deleted = { ...(remote.deleted || {}), ...(local.deleted || {}) };
  const byId = new Map();
  for (const e of [...(remote.events || []), ...(local.events || [])]) {
    const prev = byId.get(e.id);
    if (!prev || (e.u || 0) > (prev.u || 0)) byId.set(e.id, e);
  }
  const events = [...byId.values()].filter(e => !deleted[e.id]);
  const showsFromRemote = (remote.showsU || 0) > (local.showsU || 0);
  return {
    ...local,
    events,
    deleted,
    shows: showsFromRemote ? remote.shows : local.shows,
    showsU: Math.max(local.showsU || 0, remote.showsU || 0),
    seenWeek: [local.seenWeek || '', remote.seenWeek || ''].sort().pop(),
    seenMonth: [local.seenMonth || '', remote.seenMonth || ''].sort().pop(),
    demoSeeded: true,
  };
}
/** Lo que se sube a la nube (el sonido queda en cada dispositivo). */
export const cloudPayload = s => ({
  events: s.events.filter(e => !e.demo),
  deleted: s.deleted || {},
  shows: s.shows,
  showsU: s.showsU || 0,
  seenWeek: s.seenWeek || '',
  seenMonth: s.seenMonth || '',
});
