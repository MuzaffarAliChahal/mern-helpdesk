// Captures the running app (seeded demo data) and writes docs/cover.jpg for the README.
// Usage: start the API with CLIENT_DIST set, run the seed, then:
//   BASE_URL=http://localhost:4000 node scripts/readme-screenshots.mjs
import fs from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.BASE_URL ?? 'http://localhost:4000';
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1180, height: 760 }, deviceScaleFactor: 1.5 });
page.on('pageerror', (e) => console.error('page error:', e.message));

async function login(email) {
  await page.goto(`${base}/login`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForSelector('table.tickets');
}

await login('agent@example.com');
await page.waitForTimeout(500);
const queue = (await page.screenshot()).toString('base64');

await page.getByRole('link', { name: 'Cannot reset my password' }).click();
await page.waitForSelector('.message');
await page.getByLabel('Reply').fill('Found it: your mail provider was rejecting our sender. Fixed, please try again.');
await page.waitForTimeout(300);
const detail = (await page.screenshot()).toString('base64');

const shot = (img, style) =>
  `<div style="position:absolute;${style};width:580px;border-radius:14px;overflow:hidden;box-shadow:0 30px 60px rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.15)">` +
  `<img src="data:image/png;base64,${img}" style="width:580px;display:block"/></div>`;
const chip = 'background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);padding:10px 14px;border-radius:10px';
const html = `<html><body style="margin:0;width:1200px;height:675px;background:linear-gradient(135deg,#042f2e,#134e4a 55%,#0f766e);font-family:Inter,Segoe UI,Arial,sans-serif;overflow:hidden;position:relative;color:#fff">
<div style="position:absolute;left:60px;top:70px;width:380px">
<div style="color:#5eead4;letter-spacing:3px;font-weight:600;font-size:15px">OPEN SOURCE · MERN STACK</div>
<div style="font-size:52px;font-weight:800;line-height:1.08;margin-top:16px">Helpdesk Ticketing</div>
<div style="font-size:20px;color:#ccfbf1;margin-top:16px;line-height:1.4">MongoDB, Express, React and Node.js with JWT roles</div>
<div style="margin-top:28px;display:grid;gap:10px;font-size:16px">
<div style="${chip}">Customer and agent roles, row-level access</div>
<div style="${chip}">Queue filters, search, stats, assignment</div>
<div style="${chip}">Vitest + Supertest, Docker, GitHub Actions</div>
</div>
<div style="margin-top:30px;color:#99f6e4;font-size:14px">Muzaffar Ali Hakim · github.com/MuzaffarAliChahal</div>
</div>
${shot(queue, 'left:480px;top:56px;transform:rotate(-2deg)')}
${shot(detail, 'left:590px;top:262px;transform:rotate(2deg)')}
</body></html>`;

const cover = await browser.newPage({ viewport: { width: 1200, height: 675 } });
await cover.setContent(html);
await cover.waitForTimeout(300);
fs.mkdirSync('docs', { recursive: true });
await cover.screenshot({ path: 'docs/cover.jpg', type: 'jpeg', quality: 82 });
console.log('wrote docs/cover.jpg');
await browser.close();
