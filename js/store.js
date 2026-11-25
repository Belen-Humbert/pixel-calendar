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
  seenWeek: '', // lunes de la última semana cuyo resumen ya vio
  demoSeeded: false,
};

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function load() {
  let s;
  try { s = { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) || 'null') || {}) }; }
  catch { s = { ...DEFAULTS }; }
  if (!s.demoSeeded && !s.events.length) seedDemo(s);
  return s;
}
export function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* sin espacio o modo privado */ } }

function seedDemo(s) {
  const t = today(), m = addDays(t, 1);
  const mk = (date, cat, start, end, title, status = 'pending') => ({ id: uid(), date, cat, start, end, title, status, demo: true });
  s.events = [
    mk(t, 'ejercicio', '08:00', '09:00', 'Salir a correr', 'done'),
    mk(t, 'programar', '10:00', '12:00', 'Proyecto personal', 'done'),
    mk(t, 'programar', '15:00', '16:30', 'Curso de React'),
    mk(t, 'play', '17:30', '18:30', 'Partida online'),
    mk(t, 'lectura', '19:00', '19:45', 'Leer antes de cenar'),
    mk(t, 'novia', '21:00', '23:00', 'Horario de novia'),
    mk(m, 'estudiar', '10:00', '12:00', 'Estudiar inglés'),
    mk(m, 'trabajo', '14:00', '18:00', 'Trabajo'),
  ];
  s.demoSeeded = true;
}

/* ---------- consultas ---------- */
export const eventsOn = (s, d) => s.events.filter(e => e.date === d).sort((a, b) => mins(a.start) - mins(b.start));
export const eventsBetween = (s, a, b) => s.events.filter(e => e.date >= a && e.date <= b);
/** pendiente de un día que ya pasó = no hecho */
export const statusOf = e => (e.status === 'pending' && e.date < today() ? 'skipped' : e.status);

export function weekStats(s, monday) {
  const ev = eventsBetween(s, monday, addDays(monday, 6));
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
    return { cat: c, name, plan, done };
  }).filter(Boolean).sort((a, b) => b.done - a.done);
  const total = rows.reduce((a, r) => a + r.done, 0);
  return { ev, n, lists, due, pct, rows, total };
}
