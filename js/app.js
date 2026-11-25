import { icon, pixelArt, ART, PAL } from './icons.js';
import {
  CATS, CAT, dotColor, DN, DLONG, MES, ymd, parse, addDays, weekIdx, mondayOf, today, hm, plusMins,
  dur, fmtH, shortDay, uid, now, load, save, eventsOn, eventsBetween, statusOf, weekStats,
  monthStats, monthOf, monthName, addMonths, monthSummary, mergeStates, cloudPayload,
} from './store.js';
import { cloud, cloudConfigured, initCloud, login, logout, pushSoon } from './cloud.js';

/* ---------- estado ---------- */
let S = load();
save(S);
const ui = { sel: today(), wk: mondayOf(today()), tab: 'dia', detail: null, pick: null, editList: false, mode: 'semana', month: monthOf(today()) };

const $ = s => document.querySelector(s);
const main = $('#main'), veil = $('#veil'), sheet = $('#sheet');
const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const commit = () => { save(S); render(); sync(); };
const touch = e => { e.u = now(); return e; };

/* ---------- nube ---------- */
function sync() {
  if (!cloud.user) return;
  const cur = monthOf(today());
  pushSoon(cloudPayload(S), [monthSummary(S, addMonths(cur, -1)), monthSummary(S, cur)].filter(m => m.counts.done + m.counts.pending + m.counts.skipped + m.counts.moved), renderChrome);
}
function onRemote(data) {
  if (data) {
    // en un dispositivo nuevo, los ejemplos no se mezclan con los datos reales
    if (S.events.length && S.events.every(e => e.demo)) S.events = [];
    S = mergeStates(S, data);
    save(S);
    render();
  }
  sync(); // sube lo que la nube todavía no tiene (no hace nada si ya está igual)
}
const findEv = id => S.events.find(e => e.id === id);
const chip = (cat, size = 20) => { const c = CAT[cat] || CAT.otra; return `<span class="chip" style="background:${c.chip}">${icon(cat in CAT ? cat : 'otra', size, c.color)}</span>`; };
const weekLabel = m => { const a = parse(m), b = parse(addDays(m, 6)); return `${a.getDate()}${a.getMonth() !== b.getMonth() ? ' ' + MES[a.getMonth()] : ''}–${b.getDate()} ${MES[b.getMonth()]}`; };

/* ---------- sonido, monedita, toast ---------- */
let ac;
function beep(ok = true) {
  if (!S.sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    (ok ? [988, 1319] : [330, 220]).forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * 0.08;
      o.type = 'square'; o.frequency.value = f; o.connect(g); g.connect(ac.destination);
      g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + (ok && i ? 0.35 : 0.09));
      o.start(t); o.stop(t + 0.4);
    });
  } catch { /* sin audio */ }
}
function pop(el, txt) {
  const r = el.getBoundingClientRect(), p = document.createElement('div');
  p.className = 'pop'; p.textContent = txt; p.style.left = `${r.left + r.width / 2 - 14}px`; p.style.top = `${r.top - 4}px`;
  document.body.appendChild(p); setTimeout(() => p.remove(), 800);
}
let tt;
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('on'), 1900); }

/* ---------- marco: monedas, sonido, pestañas ---------- */
function renderChrome() {
  $('#coins').innerHTML = `${icon('coin', 16, '#ffd35a')}<span>${S.events.filter(e => e.status === 'done').length}</span>`;
  $('#sound').innerHTML = icon(S.sound ? 'sound' : 'mute', 16);
  const dot = { ok: '#5be38a', syncing: '#ffd35a', error: '#ff8c99' }[cloud.status];
  $('#acct').innerHTML = (cloud.user && cloud.user.photo
    ? `<img src="${esc(cloud.user.photo)}" alt="" referrerpolicy="no-referrer">`
    : icon(cloud.user ? 'user' : 'cloud', 16)) + (cloud.user && dot ? `<i class="dot" style="background:${dot}"></i>` : '');
  $('#acct').setAttribute('aria-label', cloud.user ? `Cuenta: ${cloud.user.name}` : 'Guardar en la nube');
  $('#sound').setAttribute('aria-label', S.sound ? 'Silenciar' : 'Activar sonido');
  const T = { dia: ['cal', 'día'], series: ['tv', 'series'], stats: ['chart', 'stats'] };
  document.querySelectorAll('[data-tab]').forEach(b => {
    const [ic, label] = T[b.dataset.tab];
    b.innerHTML = `${icon(ic, 22)}<span>${label}</span>`;
    b.setAttribute('aria-selected', String(b.dataset.tab === ui.tab));
  });
  $('#fab').innerHTML = icon('plus', 22, '#17162a');
  $('#fab').style.display = ui.tab === 'stats' ? 'none' : '';
}

const weekNav = () => `<div class="weeknav">
  <button data-act="wk" data-n="-7" aria-label="Semana anterior">${icon('left', 14)}</button>
  <span>${weekLabel(ui.wk)}</span>
  <button data-act="wk" data-n="7" aria-label="Semana siguiente">${icon('right', 14)}</button></div>`;

/* ---------- vista: día ---------- */
function evRow(e) {
  const c = CAT[e.cat] || CAT.otra, st = statusOf(e);
  const mv = st === 'moved' && e.movedTo ? findEv(e.movedTo) : null;
  const tag = st === 'moved' ? `<span class="tag" style="background:#4a3b12;color:#ffd35a">→ ${mv ? shortDay(mv.date) : 'movida'}</span>`
    : st === 'skipped' ? `<span class="tag" style="background:#4d1a22;color:#ff8c99">no hecha</span>` : '';
  return `<div class="row"><span class="t">${esc(e.start)}</span>
    <div class="ev ${st}">
      <button class="open" data-act="opts" data-id="${e.id}" aria-label="Opciones de ${esc(e.title || c.name)}">
        ${chip(e.cat)}
        <span class="body"><span class="ttl">${esc(e.title || c.name)}</span>
        <span class="sub" style="display:block">hasta ${esc(e.end)} · ${esc(c.name)}${tag}</span></span>
      </button>
      <button class="tick ${e.status === 'done' ? 'on' : ''}" data-act="tick" data-id="${e.id}" aria-label="Marcar como hecha" ${st === 'moved' ? 'disabled' : ''}>
        <span>${e.status === 'done' ? icon('check', 14, '#17162a') : ''}</span></button>
    </div></div>`;
}

function renderDay() {
  const ev = eventsOn(S, ui.sel), d = parse(ui.sel), isToday = ui.sel === today();
  const done = ev.filter(e => e.status === 'done').length;
  let banners = '';
  if (S.events.some(e => e.demo)) banners += `<div class="banner"><p>Estas actividades son <b>ejemplos</b> para que veas cómo funciona.</p><button class="btn o sm" data-act="nodemo">borrar ejemplos</button></div>`;
  const lastMon = addDays(mondayOf(today()), -7);
  if (S.seenWeek !== lastMon && eventsBetween(S, lastMon, addDays(lastMon, 6)).length)
    banners += `<div class="banner"><p>¡Terminó la semana! Mirá cuánto le dedicaste a cada cosa.</p><button class="btn y sm" data-act="lastweek">ver resumen</button></div>`;
  const lastMonth = addMonths(monthOf(today()), -1);
  if (S.seenMonth !== lastMonth && monthStats(S, lastMonth).ev.length)
    banners += `<div class="banner month"><p>${icon('trophy', 16, '#ffd35a')} ¡Terminó ${monthName(lastMonth)}! Mirá a qué le dedicaste más tiempo.</p><button class="btn y sm" data-act="lastmonth">ver el mes</button></div>`;

  const days = DN.map((n, i) => {
    const day = addDays(ui.wk, i), cats = [...new Set(eventsOn(S, day).map(e => e.cat))].slice(0, 4);
    return `<button class="day ${day === ui.sel ? 'sel' : ''} ${day === today() ? 'today' : ''}" data-act="day" data-d="${day}" aria-label="${DLONG[i]} ${parse(day).getDate()}">
      <span class="n">${n}</span><span class="num">${parse(day).getDate()}</span>
      <span class="dots">${cats.map(c => `<i style="background:${dotColor(c)}"></i>`).join('')}</span></button>`;
  }).join('');

  main.innerHTML = `${banners}
    <div class="hero"><div><div class="dow">${DLONG[weekIdx(ui.sel)]}${isToday ? ' · hoy' : ''}</div><div class="date">${d.getDate()} ${MES[d.getMonth()]}</div></div>
      ${ev.length ? `<div class="score"><b>${done}/${ev.length}</b><span>hechas${isToday ? ' hoy' : ''}</span></div>` : ''}</div>
    ${weekNav()}<div class="days">${days}</div>
    <div class="list">${ev.length ? ev.map(evRow).join('') : `<div class="empty"><span class="px">día libre</span>Tocá el botón amarillo para cargar lo que vas a hacer.</div>`}</div>`;
}

/* ---------- vista: series ---------- */
function renderSeries() {
  const end = addDays(ui.wk, 6);
  const seen = eventsBetween(S, ui.wk, end).filter(e => e.cat === 'tv' && e.status === 'done')
    .sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
  const total = seen.reduce((a, e) => a + dur(e), 0);
  const tv = CAT.tv;
  const tiles = S.shows.map((s, i) => ui.editList
    ? `<div class="show"><span class="chip" style="background:${tv.chip}">${icon('tv', 18, tv.color)}</span>${esc(s)}<button class="rm" data-act="rmshow" data-i="${i}" aria-label="Quitar ${esc(s)}">${icon('x', 12)}</button></div>`
    : `<button class="show" data-act="pickshow" data-i="${i}" aria-pressed="${ui.pick === i}"><span class="chip" style="background:${tv.chip}">${icon('tv', 18, tv.color)}</span>${esc(s)}</button>`).join('');
  const other = ui.editList ? '' : `<button class="show ghost" data-act="pickshow" data-i="-1" aria-pressed="${ui.pick === -1}"><span class="chip" style="background:#2b2950">${icon('plus', 16, '#b9b5e0')}</span>Otra cosa</button>`;
  const now = new Date(), from = hm(new Date(now - 3600e3));
  const form = ui.pick === null || ui.editList ? '' : `<form class="card red" data-form="watch">
    <b>${ui.pick >= 0 ? 'Anotar: ' + esc(S.shows[ui.pick]) : 'Anotar otra cosa'}</b>
    ${ui.pick < 0 ? `<input class="field" name="title" placeholder="¿Qué viste?" maxlength="60" required>` : ''}
    <input class="field date" type="date" name="date" value="${ui.sel}" aria-label="Día">
    <div class="two"><input class="field time" type="time" name="start" value="${from}" aria-label="Desde"><input class="field time" type="time" name="end" value="${hm(now)}" aria-label="Hasta"></div>
    <button class="btn y" type="submit">${icon('check', 14, '#17162a')} listo</button></form>`;
  const add = ui.editList ? `<form class="card" data-form="addshow"><div class="two" style="grid-template-columns:minmax(0,1fr) auto">
    <input class="field" name="title" placeholder="Agregar serie o peli" maxlength="60" required><button class="btn y" type="submit" aria-label="Agregar">${icon('plus', 14, '#17162a')}</button></div></form>` : '';

  main.innerHTML = `<div class="head-row"><div><h1 class="h1">series y pelis</h1><div class="muted" style="font-size:14px;font-weight:700;margin-top:4px">${ui.editList ? 'Editá tu lista' : 'Tocá lo que viste para anotarlo'}</div></div>
      <button class="btn o sm" data-act="editlist">${icon(ui.editList ? 'check' : 'pencil', 12)} ${ui.editList ? 'listo' : 'lista'}</button></div>
    <div class="shows">${tiles}${other}</div>${form}${add}
    ${weekNav()}
    <h2 class="sec-t"><span>visto esta semana</span><span>${fmtH(total)}</span></h2>
    <ul class="lines">${seen.map(e => `<li><span class="d">${shortDay(e.date)}</span><span class="w">${esc(e.title)}</span><span class="r">${esc(e.start)}–${esc(e.end)}</span></li>`).join('') || '<li class="none">Nada anotado esta semana.</li>'}</ul>`;
}

/* ---------- vista: stats ---------- */
function renderStats() {
  if (ui.mode === 'mes') return renderMonth();
  const W = weekStats(S, ui.wk), { n, pct, due } = W;
  const msg = !W.ev.length ? 'semana vacía' : !due ? '¡a jugar!' : pct >= 80 ? '¡nivel superado!' : pct >= 50 ? '¡buen nivel!' : 'nivel difícil';
  const txt = !W.ev.length ? 'Todavía no hay nada cargado esta semana.'
    : !due ? 'La semana recién arranca: todavía no venció nada.'
    : `Cumpliste ${n.done} de las ${due} cosas que tocaban. ${fmtH(W.total)} bien usadas.`;
  const on = Math.round(pct / 5);
  const K = [['done', n.done, 'cumplidas', '#5be38a'], ['moved', n.moved, 'reprogramé', '#ffd35a'], ['skipped', n.skipped, 'no hice', '#ff8c99']];
  const kpis = K.map(([id, v, l, c]) => `<button class="kpi" data-act="detail" data-k="${id}" aria-pressed="${ui.detail === id}" style="${ui.detail === id ? `border-color:${c}` : ''}"><b style="color:${c}">${v}</b><span>${l}</span></button>`).join('');
  const det = ui.detail && W.lists[ui.detail].length ? `<div class="detail"><ul class="lines">${W.lists[ui.detail].map(e => {
    const mv = e.movedTo ? findEv(e.movedTo) : null;
    return `<li><span class="d" style="color:var(--muted)">${shortDay(e.date)}</span><span class="w">${esc(e.title || CAT[e.cat].name)}</span><span class="r">${ui.detail === 'moved' && mv ? '→ ' + shortDay(mv.date) : fmtH(dur(e))}</span></li>`;
  }).join('')}</ul></div>` : '';
  const rows = W.rows.map(r => {
    const tvRow = r.cat.id === 'tv', w = tvRow ? 100 : (r.plan ? Math.round((r.done / r.plan) * 100) : 0);
    return `<div class="crow">${chip(r.cat.id, 15)}<span class="nm">${esc(r.name)}</span>
      <span class="h">${tvRow ? fmtH(r.done) + ' vistas' : fmtH(r.done) + ' / ' + fmtH(r.plan)}</span>
      <span class="bar"><i style="width:${w}%;background:${dotColor(r.cat.id)}"></i></span></div>`;
  }).join('');

  main.innerHTML = `${statsHead()}
    ${weekNav()}
    <div class="stat-hero"><div class="top2"><span class="pct">${pct}%</span><div><div class="msg">${msg}</div><p>${txt}</p></div></div>
      <div class="segs">${Array.from({ length: 20 }, (_, i) => `<i class="${i < on ? 'on' : ''}"></i>`).join('')}</div></div>
    <div class="kpis">${kpis}</div>${det}
    ${n.pending ? `<p class="pending-note">${n.pending} ${n.pending === 1 ? 'actividad pendiente' : 'actividades pendientes'} para los próximos días.</p>` : ''}
    <h2 class="sec-t"><span>tiempo por actividad</span><span>hecho / plan</span></h2>
    ${rows || '<p class="muted">Sin datos esta semana.</p>'}
    ${backupHtml()}`;
}

const statsHead = () => `<div class="head-row" style="align-items:center"><h1 class="h1">resumen</h1>
  <div class="seg" role="group" aria-label="Período">${['semana', 'mes'].map(m => `<button data-act="mode" data-m="${m}" aria-pressed="${ui.mode === m}">${m}</button>`).join('')}</div></div>`;

const backupHtml = () => `<h2 class="sec-t" style="margin-top:22px"><span>respaldo</span></h2>
    <div class="card"><span class="muted" style="font-size:14px">${cloud.user ? 'Tus datos ya se guardan en tu cuenta de Google. Igual podés copiar un respaldo extra.' : 'Los datos viven en este celular. Copiá el respaldo de vez en cuando o entrá con Google para guardarlos en la nube.'}</span>
      <button class="btn o" data-act="export">copiar respaldo</button>
      <textarea class="field" id="imp" placeholder="Pegá acá un respaldo"></textarea>
      <button class="btn y" data-act="import">restaurar</button></div>`;

/* ---------- vista: mes ---------- */
function renderMonth() {
  const M = monthStats(S, ui.month), { n, pct, due } = M;
  const [y] = ui.month.split('-');
  const isCur = ui.month === monthOf(today());
  const ranked = M.rows.filter(r => r.done > 0);
  const top = ranked.slice(0, 3);
  const podium = top.length ? [top[1], top[0], top[2]].map((r, i) => {
    if (!r) return '<div></div>';
    const place = [2, 1, 3][i], h = [74, 104, 56][i];
    return `<div class="pod">${chip(r.cat.id, 18)}<b>${esc(r.name)}</b><span>${fmtH(r.done)}</span>
      <i style="height:${h}px;background:${dotColor(r.cat.id)}">${place}</i></div>`;
  }).join('') : '';
  const max = ranked.length ? ranked[0].done : 1;
  const rows = M.rows.map(r => `<div class="crow">${chip(r.cat.id, 15)}<span class="nm">${esc(r.name)}</span>
      <span class="h">${fmtH(r.done)}${r.cat.id === 'tv' ? '' : ' / ' + fmtH(r.plan)}</span>
      <span class="bar"><i style="width:${Math.round((r.done / max) * 100)}%;background:${dotColor(r.cat.id)}"></i></span></div>`).join('');
  const tvTop = Object.entries(M.lists.done.filter(e => e.cat === 'tv').reduce((a, e) => { a[e.title] = (a[e.title] || 0) + dur(e); return a; }, {}))
    .sort((a, b) => b[1] - a[1]).slice(0, 3);
  const K = [['done', n.done, 'cumplidas', '#5be38a'], ['moved', n.moved, 'reprogramé', '#ffd35a'], ['skipped', n.skipped, 'no hice', '#ff8c99']];
  const kpis = K.map(([id, v, l, c]) => `<div class="kpi"><b style="color:${c}">${v}</b><span>${l}</span></div>`).join('');

  main.innerHTML = `${statsHead()}
    <div class="weeknav"><button data-act="mo" data-n="-1" aria-label="Mes anterior">${icon('left', 14)}</button>
      <span>${monthName(ui.month)} ${y}</span><button data-act="mo" data-n="1" aria-label="Mes siguiente">${icon('right', 14)}</button></div>
    <div class="stat-hero"><div class="top2"><span class="pct hrs">${fmtH(M.total)}</span>
      <div><div class="msg">${M.ev.length ? (isCur ? 'en lo que va del mes' : 'dedicadas en ' + monthName(ui.month)) : 'mes vacío'}</div>
      <p>${M.ev.length ? `${pct}% cumplido de lo que tocaba · ${M.activeDays} ${M.activeDays === 1 ? 'día activo' : 'días activos'}` : 'No hay actividades cargadas este mes.'}</p></div></div></div>
    ${top.length ? `<h2 class="sec-t"><span>${icon('trophy', 12, '#ffd35a')} a qué le dedicaste más tiempo</span></h2><div class="podium">${podium}</div>` : ''}
    ${M.ev.length ? `<div class="kpis">${kpis}</div>` : ''}
    ${rows ? `<h2 class="sec-t" style="margin-top:12px"><span>ranking del mes</span><span>hecho / plan</span></h2>${rows}` : ''}
    ${tvTop.length ? `<h2 class="sec-t" style="margin-top:16px"><span>lo que más viste</span></h2><ul class="lines">${tvTop.map(([t, m]) => `<li><span class="w">${esc(t)}</span><span class="r">${fmtH(m)}</span></li>`).join('')}</ul>` : ''}
    ${cloud.user ? '' : `<p class="pending-note" style="margin-top:12px">${icon('cloud', 12)} Entrá con Google (arriba a la derecha) para guardar tus meses en la nube.</p>`}`;
}

/* ---------- panel: cuenta ---------- */
function openAccount() {
  const draw = () => {
    const u = cloud.user;
    const when = cloud.lastSync ? new Date(cloud.lastSync).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '';
    const st = { ok: `guardado en la nube${when ? ' · ' + when : ''}`, syncing: 'guardando…', error: 'sin conexión: se guarda cuando vuelva internet', idle: '' }[cloud.status] || '';
    sheet.innerHTML = `<div class="grab"></div>
      <div class="sheet-head"><button class="icon-btn" data-act="close" aria-label="Cerrar">${icon('x', 12)}</button><div><h2>${u ? 'tu cuenta' : 'guardá tu progreso'}</h2></div></div>
      ${!cloudConfigured ? `<p class="muted" style="margin:0">Todavía falta conectar Firebase (ver README). Mientras tanto los datos se guardan solo en este celular.</p>`
      : u ? `<div class="acct-card">${u.photo ? `<img src="${esc(u.photo)}" alt="" referrerpolicy="no-referrer">` : `<span class="chip" style="background:#2b2950">${icon('user', 20, '#b9b5e0')}</span>`}
          <div><b>${esc(u.name)}</b><span>${esc(u.email)}</span></div></div>
        <p class="sync-st">${icon('cloud', 14, cloud.status === 'error' ? '#ff8c99' : '#5be38a')} ${esc(st)}</p>
        <p class="muted" style="margin:0;font-size:14px">Tus actividades y estadísticas se guardan en tu cuenta. Si cambiás de celular, entrás con Google y aparecen todas.</p>
        <button class="btn o block" data-act="logout">cerrar sesión</button>`
      : `<div class="cloud-hero">
          ${pixelArt(ART.coin, PAL.coin, 22, 'class="float c1"')}
          ${pixelArt(ART.cloud, PAL.cloud, 154, 'class="float main"')}
          ${pixelArt(ART.coin, PAL.coin, 16, 'class="float c2"')}
        </div>
        <p class="cloud-lead">Entrá con tu cuenta de Google y tus partidas quedan guardadas para siempre.</p>
        <ul class="perks">
          <li>${icon('cloud', 16, '#7fa6ff')}<span>Si cambiás o perdés el celu, no perdés nada</span></li>
          <li>${icon('trophy', 16, '#ffd35a')}<span>Se guarda el resumen de cada mes</span></li>
          <li>${icon('repeat', 16, '#5be38a')}<span>Lo ves igual en el celu y en la compu</span></li>
        </ul>
        <button class="gbtn" data-act="login">${pixelArt(ART.g, PAL.g, 20)}<span>Continuar con Google</span></button>
        <p class="fine">Solo usamos tu nombre, tu foto y tu mail para identificar tu cuenta.</p>`}`;
  };
  sheet.onclick = async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.act === 'close') return closeSheet();
    if (b.dataset.act === 'login') {
      try { b.disabled = true; await login(); closeSheet(); if (cloud.user) toast(`¡hola, ${cloud.user.name.split(' ')[0].toLowerCase()}!`); } catch (err) { console.warn(err); toast('no se pudo entrar'); b.disabled = false; }
    }
    if (b.dataset.act === 'logout') { await logout(); toast('sesión cerrada'); closeSheet(); }
  };
  accountRedraw = () => { if (veil.classList.contains('on') && sheet.querySelector('.acct-card, [data-act=login]')) draw(); };
  openSheet(''); draw();
}
let accountRedraw = () => {};

function render() {
  renderChrome();
  ({ dia: renderDay, series: renderSeries, stats: renderStats })[ui.tab]();
}

/* ---------- panel: nueva / editar actividad ---------- */
function openSheet(html) { sheet.innerHTML = html; veil.classList.add('on'); }
function closeSheet() { veil.classList.remove('on'); sheet.innerHTML = ''; sheet.onclick = null; sheet.onsubmit = null; }

function openForm(existing, preset = {}) {
  const base = existing ? { ...existing } : { cat: 'programar', title: '', date: ui.sel, start: plusMins(hm(new Date()), 60).slice(0, 3) + '00', ...preset };
  if (!base.end) base.end = plusMins(base.start, 60);
  const f = { ...base }, rep = new Set();
  const grab = () => {
    const q = n => sheet.querySelector(`[name=${n}]`);
    f.title = q('title').value.trim(); f.start = q('start').value || f.start; f.end = q('end').value || f.end; f.date = q('date').value || f.date;
  };
  const draw = () => {
    const c = f.cat, di = weekIdx(f.date), extra = rep.size;
    const label = c === 'otra' ? 'Nombre de la actividad' : c === 'tv' ? '¿Qué serie o peli?' : 'Detalle (opcional)';
    const ph = c === 'otra' ? 'Ej: médico, cocinar, trámite' : c === 'tv' ? 'Ej: One Piece' : `Ej: ${CAT[c].name.toLowerCase()}`;
    sheet.innerHTML = `<div class="grab"></div>
      <div class="sheet-head"><button class="icon-btn" data-act="close" aria-label="Cerrar">${icon('x', 12)}</button>
        <div><h2>${existing ? 'editar' : 'nueva actividad'}</h2><p>para el ${DLONG[di].toLowerCase()} ${parse(f.date).getDate()}</p></div></div>
      <div><div class="lbl">¿Qué vas a hacer?</div><div class="cats">${CATS.map(x => `<button class="cat" data-act="cat" data-c="${x.id}" aria-pressed="${x.id === c}">${chip(x.id, 18)}${esc(x.name)}</button>`).join('')}</div></div>
      <label><div class="lbl">${label}</div><input class="field" name="title" maxlength="60" value="${esc(f.title)}" placeholder="${ph}" ${c === 'tv' ? 'list="shows-dl"' : ''}></label>
      ${c === 'tv' ? `<datalist id="shows-dl">${S.shows.map(s => `<option value="${esc(s)}">`).join('')}</datalist>` : ''}
      <div class="two"><label><div class="lbl">${icon('clock', 14)}Desde</div><input class="field time" type="time" name="start" value="${esc(f.start)}"></label>
        <label><div class="lbl">${icon('clock', 14)}Hasta</div><input class="field time" type="time" name="end" value="${esc(f.end)}"></label></div>
      <label><div class="lbl">Día</div><input class="field date" type="date" name="date" value="${esc(f.date)}"></label>
      ${existing ? '' : `<div><div class="lbl">${icon('repeat', 14)}Repetir también esta semana</div>
        <div class="week7">${DN.map((n, i) => `<button data-act="rep" data-i="${i}" aria-pressed="${rep.has(i)}" ${i === di ? 'disabled' : ''}>${n}</button>`).join('')}</div></div>`}
      <button class="btn y block" data-act="save">${icon(existing ? 'check' : 'plus', 16, '#17162a')} ${existing ? 'guardar' : extra ? `agregar (${extra + 1} días)` : 'agregar'}</button>`;
  };
  sheet.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'close') return closeSheet();
    if (a === 'cat') { grab(); f.cat = b.dataset.c; return draw(); }
    if (a === 'rep') { grab(); const i = +b.dataset.i; rep.has(i) ? rep.delete(i) : rep.add(i); return draw(); }
    if (a === 'save') {
      grab();
      if ((f.cat === 'otra' || f.cat === 'tv') && !f.title) { toast('ponele un nombre'); sheet.querySelector('[name=title]').focus(); return; }
      if (existing) {
        Object.assign(findEv(existing.id), { cat: f.cat, title: f.title, start: f.start, end: f.end, date: f.date, u: now() });
        toast('¡guardado!');
      } else {
        const mon = mondayOf(f.date), dates = [f.date, ...[...rep].map(i => addDays(mon, i))];
        dates.forEach(date => S.events.push({ id: uid(), date, cat: f.cat, title: f.title, start: f.start, end: f.end, status: 'pending', u: now() }));
        if (f.cat === 'tv' && f.title && !S.shows.includes(f.title)) { S.shows.push(f.title); S.showsU = now(); }
        toast(dates.length > 1 ? `¡${dates.length} agregadas!` : '¡agregada!');
      }
      ui.sel = f.date; ui.wk = mondayOf(f.date); closeSheet(); commit();
    }
  };
  draw(); veil.classList.add('on');
}

/* ---------- panel: opciones de una actividad ---------- */
function openOptions(ev) {
  let repOpen = false, day = addDays(ev.date, 1);
  const c = CAT[ev.cat] || CAT.otra;
  const draw = () => {
    const st = statusOf(ev), five = Array.from({ length: 5 }, (_, i) => addDays(ev.date, i + 1));
    sheet.innerHTML = `<div class="grab"></div>
      <div class="opt-ev">${chip(ev.cat, 24)}<div><b>${esc(ev.title || c.name)}</b><span>${esc(ev.start)} – ${esc(ev.end)} · ${esc(c.name.toLowerCase())}</span></div></div>
      ${st === 'moved' ? `<p class="muted" style="margin:0">Esta actividad ya se reprogramó.</p>` :
        `<button class="btn g block" data-act="done">${icon('check', 16, '#17162a')} ${ev.status === 'done' ? 'desmarcar' : 'marcar como hecha'}</button>
      <div class="box ${repOpen ? 'on' : ''}"><button data-act="rep">${icon('repeat', 18, '#ffd35a')}<span style="flex:1;text-align:left">Reprogramar</span><span class="muted" style="font-size:13px">${repOpen ? 'elegí día' : ''}</span></button>
        ${repOpen ? `<div class="in"><div class="pick5">${five.map(d => `<button data-act="mday" data-d="${d}" aria-pressed="${d === day}"><small>${DN[weekIdx(d)]}</small>${parse(d).getDate()}</button>`).join('')}</div>
          <div class="two"><input class="field time" type="time" name="ms" value="${esc(ev.start)}" aria-label="Desde"><input class="field time" type="time" name="me" value="${esc(ev.end)}" aria-label="Hasta"></div>
          <button class="btn y" data-act="move">mover</button></div>` : ''}</div>`}
      <div class="trio">
        ${st === 'skipped' || st === 'moved' ? '<span></span>' : `<button class="bad" data-act="skip">${icon('x', 16)}No lo hice</button>`}
        <button data-act="edit">${icon('pencil', 16)}Editar</button>
        <button data-act="del">${icon('trash', 16)}Borrar</button></div>`;
  };
  sheet.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'done') { const was = ev.status === 'done'; ev.status = was ? 'pending' : 'done'; touch(ev); beep(!was); if (!was) toast('+1 moneda'); closeSheet(); return commit(); }
    if (a === 'rep') { repOpen = !repOpen; return draw(); }
    if (a === 'mday') { day = b.dataset.d; return draw(); }
    if (a === 'move') {
      const n = { id: uid(), date: day, cat: ev.cat, title: ev.title, start: sheet.querySelector('[name=ms]').value || ev.start,
        end: sheet.querySelector('[name=me]').value || ev.end, status: 'pending', from: ev.id, u: now() };
      ev.status = 'moved'; ev.movedTo = n.id; touch(ev); S.events.push(n);
      toast(`movida al ${shortDay(day).toLowerCase()}`); closeSheet(); return commit();
    }
    if (a === 'skip') { ev.status = 'skipped'; touch(ev); beep(false); closeSheet(); return commit(); }
    if (a === 'edit') { closeSheet(); return openForm(ev); }
    if (a === 'del') {
      S.events = S.events.filter(x => x !== ev);
      if (!ev.demo) S.deleted[ev.id] = now();
      S.events.forEach(x => { if (x.movedTo === ev.id) { x.status = 'pending'; delete x.movedTo; touch(x); } });
      toast('borrada'); closeSheet(); return commit();
    }
  };
  openSheet(''); draw();
}

/* ---------- clicks y formularios ---------- */
veil.addEventListener('click', e => { if (e.target === veil) closeSheet(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && veil.classList.contains('on')) closeSheet(); });

document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || sheet.contains(b)) return;
  if (b.dataset.tab) { ui.tab = b.dataset.tab; ui.detail = null; ui.pick = null; ui.editList = false; render(); window.scrollTo(0, 0); return; }
  if (b.id === 'fab') return openForm(null, ui.tab === 'series' ? { cat: 'tv' } : {});
  if (b.id === 'sound') { S.sound = !S.sound; commit(); beep(); return; }
  const a = b.dataset.act, ev = findEv(b.dataset.id);
  switch (a) {
    case 'day': ui.sel = b.dataset.d; return render();
    case 'wk': { const n = +b.dataset.n; ui.wk = addDays(ui.wk, n); ui.sel = addDays(ui.sel, n); ui.detail = null; return render(); }
    case 'tick': {
      if (!ev) return;
      if (ev.status === 'done') { ev.status = 'pending'; beep(false); } else { ev.status = 'done'; beep(); pop(b, '+1'); }
      touch(ev);
      return commit();
    }
    case 'opts': return ev && openOptions(ev);
    case 'nodemo': S.events = S.events.filter(x => !x.demo); toast('¡a empezar!'); return commit();
    case 'lastweek': S.seenWeek = addDays(mondayOf(today()), -7); ui.wk = S.seenWeek; ui.sel = S.seenWeek; ui.tab = 'stats'; window.scrollTo(0, 0); return commit();
    case 'pickshow': { const i = +b.dataset.i; ui.pick = ui.pick === i ? null : i; return render(); }
    case 'editlist': ui.editList = !ui.editList; ui.pick = null; return render();
    case 'rmshow': S.shows.splice(+b.dataset.i, 1); S.showsU = now(); return commit();
    case 'lastmonth': S.seenMonth = addMonths(monthOf(today()), -1); ui.month = S.seenMonth; ui.mode = 'mes'; ui.tab = 'stats'; ui.detail = null; window.scrollTo(0, 0); return commit();
    case 'mode': ui.mode = b.dataset.m; ui.detail = null; return render();
    case 'mo': ui.month = addMonths(ui.month, +b.dataset.n); ui.detail = null; return render();
    case 'acct': return openAccount();
    case 'detail': ui.detail = ui.detail === b.dataset.k ? null : b.dataset.k; return render();
    case 'export': {
      const t = JSON.stringify(S);
      const fallback = () => { const ta = $('#imp'); ta.value = t; ta.select(); toast('copialo del cuadro'); };
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast('respaldo copiado'), fallback); else fallback();
      return;
    }
    case 'import': {
      try {
        const o = JSON.parse($('#imp').value);
        if (!Array.isArray(o.events)) throw new Error();
        S = { ...S, ...o, deleted: { ...(S.deleted || {}), ...(o.deleted || {}) } }; S.events.forEach(touch); toast('¡restaurado!'); commit();
      } catch { toast('respaldo inválido'); }
    }
  }
});

document.addEventListener('submit', e => {
  const form = e.target.closest('form'); if (!form) return;
  e.preventDefault();
  const fd = new FormData(form);
  if (form.dataset.form === 'addshow') {
    const v = String(fd.get('title') || '').trim();
    if (v && !S.shows.includes(v)) { S.shows.push(v); S.showsU = now(); }
    return commit();
  }
  if (form.dataset.form === 'watch') {
    const title = ui.pick >= 0 ? S.shows[ui.pick] : String(fd.get('title') || '').trim();
    if (!title) return toast('¿qué viste?');
    const date = fd.get('date') || ui.sel;
    S.events.push({ id: uid(), date, cat: 'tv', title, start: fd.get('start') || '21:00', end: fd.get('end') || '22:00', status: 'done', u: now() });
    if (!S.shows.includes(title)) { S.shows.push(title); S.showsU = now(); }
    ui.pick = null; beep(); toast('+1 moneda'); commit();
  }
});

render();

initCloud({
  onUser: () => { render(); accountRedraw(); },
  onRemote,
  onStatus: () => { renderChrome(); accountRedraw(); },
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
