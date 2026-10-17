/**
 * captura.js — screenshot da seção de edições (para conferir o vidro).
 * Roda contra o servidor local em 127.0.0.1:3018.
 */
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.join(__dirname, 'shots');
const URL = 'http://127.0.0.1:3018';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--enable-unsafe-swiftshader', '--no-sandbox', '--window-size=1440,1000'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#ev-list .ev-row');
  // hover numa linha para capturar os dois estados
  const rows = await page.$$('#ev-list .ev-row');
  // estado normal
  await page.mouse.move(5, 5);
  await new Promise((r) => setTimeout(r, 400));
  await rows[0].screenshot({ path: path.join(OUT, 'evento-row-normal.png') });
  // estado hover
  await rows[0].hover();
  await new Promise((r) => setTimeout(r, 600));
  await rows[0].screenshot({ path: path.join(OUT, 'evento-row-hover.png') });
  // sección completa con la fila del medio en hover
  await rows[1].hover();
  await new Promise((r) => setTimeout(r, 500));
  const sec = await page.$('#eventos');
  await sec.screenshot({ path: path.join(OUT, 'eventos-vidro.png') });
  console.log('OK shots/eventos-vidro.png + evento-row-normal.png + evento-row-hover.png');
  await browser.close();
})();
