/**
 * FESTA SEM NOME — server.js
 * Servidor Node.js + Express.
 *
 * - Serve o frontend inteiro a partir de /public
 * - Serve three.js local a partir de node_modules (funciona offline, sem CDN)
 * - API de eventos, lineup e lista de convidados
 *
 * Rodar:  node server.js   (ou run.bat no Windows)
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;

const app = express();
const PORT = process.env.PORT || 3018;   // 3000 lo ocupa Docker Desktop en este equipo
const HOST = process.env.HOST || '127.0.0.1';

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const LISTA_FILE = path.join(DATA_DIR, 'lista.json');
const THREE_DIR = path.join(ROOT, 'node_modules', 'three', 'build');

// ---------------------------------------------------------------- middlewares

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// log curto e legível
app.use((req, _res, next) => {
  if (!req.path.startsWith('/vendor') && !req.path.match(/\.(css|js|svg|png|jpg|webp|woff2?)$/)) {
    console.log(`[${new Date().toISOString().slice(11, 19)}] ${req.method} ${req.path}`);
  }
  next();
});

// three.js servido localmente: /vendor/three.module.js
app.use('/vendor', express.static(THREE_DIR, { maxAge: '7d', fallthrough: true }));

// frontend
app.use(express.static(PUBLIC_DIR, { extensions: ['html'], maxAge: '1h' }));

// ---------------------------------------------------------------- dados

/**
 * Cada evento tem:
 *  - um poster 3D generativo (scene: chave usada no frontend)
 *  - o nome do evento FORA da arte (a arte não escreve o nome)
 *  - uma descrição misteriosa curta, uma linha, tipo ficha de galeria
 */
const EVENTS = [
  {
    id: 'rawmorphic',
    title: 'RAWMORPHIC',
    subtitle: 'Edição 01',
    scene: 'rawmorphic',
    isoDate: '2026-11-18T18:00:00-03:00',
    dateLabel: 'Qua, 18 de novembro de 2026',
    timeLabel: '18h às 3h',
    venue: 'Bar do Lado',
    venueNote: 'segundo ambiente: Galeria Bar',
    city: 'São Paulo, BR',
    capacity: '150–200 pessoas',
    tagline: 'A matéria ainda não decidiu a forma.',
    description:
      'A primeira noite começa onde nada tem nome. Matéria bruta, luz violeta, som subindo ' +
      'lounge e terminando em pista. Uma porta no fundo que ninguém sabe onde leva — até levar.',
    lineup: ['a confirmar'],
    status: 'onsale',
    ticketUrl: '#tickets',
    instagram: 'https://instagram.com/',
    accent: '#7b5cff'
  },
  {
    id: 'analogic-samb',
    title: 'ANALOGIC SAMB',
    subtitle: 'Edição 02',
    scene: 'poster-analogic-samb',
    poster: {
      color: '/assets/posters/analogic-samb.png',
      depth: '/assets/posters/analogic-samb-depth.png',
      generated: 'ComfyUI · Z-Image turbo'
    },
    isoDate: '2026-12-18T18:00:00-03:00',
    dateLabel: 'Sex, 18 de dezembro de 2026',
    timeLabel: '18h às 3h',
    venue: 'Bar do Lado',
    venueNote: 'segundo ambiente: Galeria Bar',
    city: 'São Paulo, BR',
    capacity: '150–200 pessoas',
    tagline: 'O calor gravado em fita continua girando.',
    description:
      'Uma noite passada por fita magnética: chiado, granulação, ritmo que respira fora do compasso. ' +
      'Onde o analógico encontra o samba sem pedir licença a ninguém.',
    lineup: ['a confirmar'],
    status: 'soon',
    ticketUrl: '#tickets',
    instagram: 'https://instagram.com/',
    accent: '#ff7a3d'
  },
  {
    id: 'pro-vynil-techno',
    title: 'PRO VYNIL TECHNO',
    subtitle: 'Edição 03 · New Year',
    scene: 'poster-pro-vynil-techno',
    poster: {
      color: '/assets/posters/pro-vynil-techno.png',
      depth: '/assets/posters/pro-vynil-techno-depth.png',
      generated: 'ComfyUI · Z-Image turbo'
    },
    isoDate: '2026-12-31T22:00:00-03:00',
    dateLabel: 'Qui, 31 de dezembro de 2026',
    timeLabel: '22h às 6h',
    venue: 'Galeria Bar',
    venueNote: 'palco maior · 6 lounges',
    city: 'São Paulo, BR',
    capacity: '450 pessoas',
    tagline: 'Sulco, agulha, repetição. A virada é um loop.',
    description:
      'A virada do ano em vinil: sulcos, agulha, techno em rotação contínua. Sem contagem regressiva ' +
      'no telão — só a pista entendendo sozinha que o ano já virou.',
    lineup: ['a confirmar'],
    status: 'soon',
    ticketUrl: '#tickets',
    instagram: 'https://instagram.com/',
    accent: '#c8b6ff'
  }
];

const SITE = {
  brand: 'Festa sem Nome',
  claim: 'Uma festa sem nome, num bar que ainda não tem nome.',
  instagram: 'https://instagram.com/',
  contact: 'contato@festasemnome.com',
  venue: 'Bar do Lado → Galeria Bar · São Paulo',
  nextEdition: 'rawmorphic'
};

// ---------------------------------------------------------------- API

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'festa-sem-nome',
    uptime: Math.round(process.uptime()),
    events: EVENTS.length,
    three: fs.existsSync(THREE_DIR)
  });
});

app.get('/api/site', (_req, res) => res.json(SITE));

app.get('/api/events', (_req, res) => {
  res.json({ count: EVENTS.length, events: EVENTS });
});

app.get('/api/events/:id', (req, res) => {
  const ev = EVENTS.find((e) => e.id === req.params.id);
  if (!ev) return res.status(404).json({ error: 'evento não encontrado' });
  res.json(ev);
});

// lista de convidados: nome, telefone, quem trouxe
app.post('/api/lista', async (req, res) => {
  try {
    const { nome, telefone, quemTrouxe, evento } = req.body || {};
    if (!nome || String(nome).trim().length < 2) {
      return res.status(400).json({ error: 'nome obrigatório' });
    }
    if (!telefone || String(telefone).replace(/\D/g, '').length < 8) {
      return res.status(400).json({ error: 'telefone inválido' });
    }

    await fsp.mkdir(DATA_DIR, { recursive: true });
    let lista = [];
    try {
      lista = JSON.parse(await fsp.readFile(LISTA_FILE, 'utf8'));
      if (!Array.isArray(lista)) lista = [];
    } catch (_) {
      lista = [];
    }

    const tel = String(telefone).replace(/\D/g, '');
    if (lista.some((p) => p.telefone === tel && p.evento === (evento || 'rawmorphic'))) {
      return res.status(409).json({ error: 'esse telefone já está na lista' });
    }

    const entry = {
      nome: String(nome).trim().slice(0, 80),
      telefone: tel,
      quemTrouxe: String(quemTrouxe || '').trim().slice(0, 80),
      evento: String(evento || 'rawmorphic').slice(0, 40),
      criadoEm: new Date().toISOString(),
      ip: req.ip
    };
    lista.push(entry);
    await fsp.writeFile(LISTA_FILE, JSON.stringify(lista, null, 2), 'utf8');

    res.status(201).json({ ok: true, posicao: lista.length });
  } catch (err) {
    console.error('erro /api/lista', err);
    res.status(500).json({ error: 'falha ao salvar' });
  }
});

app.get('/api/lista/count', async (_req, res) => {
  try {
    const lista = JSON.parse(await fsp.readFile(LISTA_FILE, 'utf8'));
    res.json({ total: Array.isArray(lista) ? lista.length : 0 });
  } catch (_) {
    res.json({ total: 0 });
  }
});

// ---------------------------------------------------------------- fallback SPA

app.use((req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'rota não encontrada' });
  res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'), (err) => {
    if (err) res.type('text').send('404 — não encontrado');
  });
});

// ---------------------------------------------------------------- boot

if (!fs.existsSync(THREE_DIR)) {
  console.warn('\n[AVISO] three.js não encontrado em node_modules.');
  console.warn('        Rode: npm install   (ou o install.bat)\n');
}

const server = app.listen(PORT, HOST, () => {
  console.log('');
  console.log('  ┌─────────────────────────────────────────────┐');
  console.log('  │  FESTA SEM NOME — servidor no ar            │');
  console.log('  └─────────────────────────────────────────────┘');
  console.log(`  local:   http://${HOST}:${PORT}`);
  console.log(`  eventos: ${EVENTS.length}  ·  three.js: ${fs.existsSync(THREE_DIR) ? 'ok' : 'FALTANDO'}`);
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[ERRO] A porta ${PORT} já está em uso. Rode com outra porta:`);
    console.error(`       set PORT=3001 && node server.js\n`);
    process.exit(1);
  }
  throw err;
});

process.on('SIGINT', () => {
  console.log('\n  encerrando…');
  server.close(() => process.exit(0));
});
