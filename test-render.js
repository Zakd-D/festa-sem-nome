/**
 * test-render.js — verificação real no Chrome (headless).
 * Abre a página, coleta erros de console, troca as 3 cenas e salva screenshots.
 */
const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.join(__dirname, 'shots');
const URL = 'http://127.0.0.1:3000';

(async () => {
  const fs = require('fs');
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: [
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1440,1000'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });

  const logs = [];
  page.on('console', (m) => logs.push(`${m.type().toUpperCase()}: ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`PAGEERROR: ${e.message}`));
  page.on('requestfailed', (r) => logs.push(`REQFAIL: ${r.url()} — ${r.failure()?.errorText}`));

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 2500));

  const info = await page.evaluate(() => {
    const c = document.querySelector('#poster');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    return {
      title: document.querySelector('#hero-title')?.textContent,
      rows: document.querySelectorAll('.ev-row').length,
      canvas: c ? { w: c.width, h: c.height, cw: c.clientWidth, ch: c.clientHeight } : null,
      webgl: !!gl,
      renderer: gl ? gl.getParameter(gl.VERSION) : null
    };
  });

  console.log('INFO', JSON.stringify(info));

  await page.screenshot({ path: path.join(OUT, 'full.png') });
  const frame = await page.$('#poster-frame');

  const scenes = ['rawmorphic', 'analogic-samb', 'pro-vynil-techno'];
  for (const id of scenes) {
    await page.evaluate((idd) => {
      const row = [...document.querySelectorAll('.ev-row')].find((r) => r.dataset.id === idd);
      row && row.click();
    }, id);
    await new Promise((r) => setTimeout(r, 2200));
    const el = await page.$('#poster-frame');
    await el.screenshot({ path: path.join(OUT, `poster-${id}.png`) });
    const t = await page.$eval('#hero-title', (n) => n.textContent);
    console.log(`SCENE ${id} -> hero "${t}"`);
  }

  // mobile
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(OUT, 'mobile.png'), fullPage: false });

  // formulário
  await page.setViewport({ width: 1440, height: 1000 });
  await page.evaluate(() => document.querySelector('#lista').scrollIntoView());
  await page.type('input[name="nome"]', 'Teste Browser');
  await page.type('input[name="telefone"]', '11988887777');
  await page.type('input[name="quemTrouxe"]', 'Felippe');
  await page.click('#form-lista button[type="submit"]');
  await new Promise((r) => setTimeout(r, 1200));
  const msg = await page.$eval('#form-msg', (n) => n.textContent);
  console.log('FORM MSG:', msg);

  console.log('--- CONSOLE ---');
  console.log(logs.length ? logs.join('\n') : '(sem mensagens)');

  await browser.close();
})().catch((e) => { console.error('FALHOU', e); process.exit(1); });
