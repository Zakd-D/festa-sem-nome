/**
 * verifica-live.js — screenshots del sitio PUBLICADO (Render) para confirmar en vivo.
 */
const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.join(__dirname, 'shots');
const URL = 'https://festa-sem-nome.onrender.com';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--enable-unsafe-swiftshader', '--no-sandbox', '--window-size=1440,1000'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.waitForSelector('#ev-list .ev-row', { timeout: 60000 });
  const marca = await page.$eval('.brand-text', (e) => e.textContent.trim());
  const titulo = await page.title();
  const filas = await page.$$eval('#ev-list .ev-row', (r) => r.length);
  console.log('LIVE marca="%s" title="%s" filas=%d', marca, titulo, filas);
  const rows = await page.$$('#ev-list .ev-row');
  await rows[0].hover();
  await new Promise((r) => setTimeout(r, 600));
  await page.mouse.move(5, 5);
  await new Promise((r) => setTimeout(r, 400));
  const sec = await page.$('#eventos');
  await sec.screenshot({ path: path.join(OUT, 'live-eventos.png') });
  await page.screenshot({ path: path.join(OUT, 'live-full.png') });
  console.log('OK shots/live-eventos.png + live-full.png');
  await browser.close();
})();
