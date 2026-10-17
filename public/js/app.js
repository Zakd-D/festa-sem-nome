/**
 * FESTA SEM NOME — app.js
 * Interface: hero + lista de edições no padrão RA, troca de pôster 3D ao vivo.
 */

import { Poster } from './scenes.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const els = {
  kicker: $('#hero-kicker'),
  title: $('#hero-title'),
  tagline: $('#hero-tagline'),
  meta: $('#hero-meta'),
  desc: $('#hero-desc'),
  index: $('#hero-index'),
  list: $('#ev-list'),
  posterCode: $('#poster-code'),
  ticketsSub: $('#tickets-sub'),
  listaEvento: $('#lista-evento')
};

let poster = null;
let events = [];
let activeId = null;
let switching = false;

const MONTHS = {
  0: 'jan', 1: 'fev', 2: 'mar', 3: 'abr', 4: 'mai', 5: 'jun',
  6: 'jul', 7: 'ago', 8: 'set', 9: 'out', 10: 'nov', 11: 'dez'
};

function shortDate(iso) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  return { day: dd, month: MONTHS[d.getMonth()], year: d.getFullYear() };
}

function fadeSwap(fn) {
  if (switching) return;
  switching = true;
  const nodes = [els.title, els.tagline, els.desc, els.meta];
  nodes.forEach((n) => n && n.classList.add('fade-out'));
  const frame = $('#poster-frame');
  if (frame) frame.style.opacity = '0.25';
  frame && (frame.style.transition = 'opacity .22s ease');

  setTimeout(() => {
    fn();
    nodes.forEach((n) => n && n.classList.remove('fade-out'));
    if (frame) frame.style.opacity = '1';
    setTimeout(() => { switching = false; }, 260);
  }, 190);
}

/* ───────────────────────────── render */

function renderList() {
  els.list.innerHTML = '';
  events.forEach((ev, i) => {
    const { day, month, year } = shortDate(ev.isoDate);
    const li = document.createElement('li');
    li.className = 'ev-row' + (ev.id === activeId ? ' active' : '');
    li.dataset.id = ev.id;
    li.innerHTML = `
      <div class="ev-date"><b>${day} ${month}</b>${year} · ${ev.timeLabel}</div>
      <div class="ev-main">
        <span class="ev-title">${ev.title}</span>
        <span class="ev-tag">${ev.tagline}</span>
      </div>
      <div class="ev-venue">${ev.venue}<span>${ev.venueNote}</span></div>
      <div class="ev-cta">${ev.status === 'onsale' ? 'ingressos' : 'em breve'}</div>
    `;
    li.addEventListener('click', () => selectEvent(ev.id, true));
    els.list.appendChild(li);
  });
}

function renderIndex() {
  els.index.innerHTML = '';
  events.forEach((ev) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = ev.id === activeId ? 'on' : '';
    b.setAttribute('aria-label', ev.title);
    b.addEventListener('click', () => selectEvent(ev.id, true));
    els.index.appendChild(b);
  });
}

function applyEvent(ev) {
  const { day, month, year } = shortDate(ev.isoDate);
  els.kicker.textContent = `${ev.subtitle.toLowerCase()} · ${day}.${String(new Date(ev.isoDate).getMonth() + 1).padStart(2, '0')}.${year} · são paulo`;
  els.title.textContent = ev.title;
  els.tagline.textContent = ev.tagline;
  els.desc.textContent = ev.description;
  els.meta.innerHTML = `
    <span class="m-date">${ev.dateLabel}</span>
    <span class="m-sep">/</span>
    <span class="m-time">${ev.timeLabel}</span>
    <span class="m-sep">/</span>
    <span class="m-venue">${ev.venue}</span>
  `;
  els.posterCode.textContent = `FS-0${events.indexOf(ev) + 1} / ${ev.title.split(' ')[0].slice(0, 3)}`;
  document.documentElement.style.setProperty('--accent', ev.accent);
  if (els.listaEvento) els.listaEvento.value = ev.id;
  if (els.ticketsSub) els.ticketsSub.textContent = `${ev.title} · ${ev.dateLabel} · lotes pelo Shotgun. Sem lista, sujeito à lotação.`;

  if (poster) poster.setScene(ev.scene, ev.accent);
}

function selectEvent(id, pushHash = false) {
  if (id === activeId) return;
  const ev = events.find((e) => e.id === id);
  if (!ev) return;
  activeId = id;
  fadeSwap(() => {
    applyEvent(ev);
    renderList();
    renderIndex();
  });
  if (pushHash) history.replaceState(null, '', `#${id}`);
}

/* ───────────────────────────── lista */

function initForm() {
  const form = $('#form-lista');
  const msg = $('#form-msg');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.classList.remove('err');
    msg.textContent = 'enviando…';

    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch('/api/lista', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'falhou');
      msg.textContent = `dentro. posição ${json.posicao} na lista — a gente confirma no whatsapp.`;
      form.reset();
      if (els.listaEvento) els.listaEvento.value = activeId || 'rawmorphic';
    } catch (err) {
      msg.classList.add('err');
      msg.textContent = err.message === 'esse telefone já está na lista'
        ? 'esse número já está na lista.'
        : 'não deu para enviar agora. tente de novo.';
    }
  });
}

/* ───────────────────────────── boot */

async function boot() {
  const canvas = $('#poster');
  try {
    poster = new Poster(canvas);
  } catch (err) {
    console.warn('WebGL indisponível:', err);
    canvas.style.display = 'none';
  }

  try {
    const res = await fetch('/api/events');
    const json = await res.json();
    events = json.events || [];
  } catch (_) {
    events = [];
  }

  if (!events.length) {
    els.desc.textContent = 'não foi possível carregar as edições.';
    return;
  }

  const fromHash = location.hash.replace('#', '');
  activeId = events.some((e) => e.id === fromHash) ? fromHash : events[0].id;

  applyEvent(events.find((e) => e.id === activeId));
  renderList();
  renderIndex();
  initForm();

  // navegação por hash (voltar/avançar do browser)
  window.addEventListener('hashchange', () => {
    const id = location.hash.replace('#', '');
    if (events.some((e) => e.id === id)) selectEvent(id);
  });

  // pequeno respiro para o canvas medir o layout antes do primeiro frame
  setTimeout(() => poster && poster.resize(), 60);
}

document.addEventListener('DOMContentLoaded', boot);
