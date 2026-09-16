import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/zhouyuxuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4330/Peter-personal-website/';
const output = path.resolve('docs/cp-app-review');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const report = { widths: [], tabs: [], runtimeErrors: [], failedLocalRequests: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1040 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => report.runtimeErrors.push(error.message));
  page.on('response', response => {
    if (response.url().startsWith(base) && response.status() >= 400) report.failedLocalRequests.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(`${base}projects/cp-app/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
  assert.equal(await page.locator('.cp-case h1').count(), 1);
  assert.doesNotMatch(await page.locator('.cp-case').innerText(), /[\u3400-\u9fff]/);
  await page.screenshot({ path: path.join(output, 'desktop-hero.png') });
  await page.screenshot({ path: path.join(output, 'desktop-full.png'), fullPage: true });
  for (const width of [1440, 1280, 1024, 850, 768, 600, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.locator('.cp-case').evaluate(root => [...root.querySelectorAll('*')].filter(node => {
      const bounds = node.getBoundingClientRect();
      return bounds.width && (bounds.right > innerWidth + 1 || bounds.left < -1);
    }).map(node => `${node.tagName}.${node.className}`));
    assert.deepEqual(overflow, [], `Overflow at ${width}px`);
    report.widths.push({ width, overflow });
    if (width === 390) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(output, 'mobile-390.png') });
      await page.locator('#cp-experience').screenshot({ path: path.join(output, 'mobile-experience.png') });
    }
  }
  const tabs = page.getByRole('tab');
  assert.equal(await tabs.count(), 5);
  for (let index = 0; index < 5; index++) {
    await tabs.nth(index).click();
    const panel = page.locator('[role=tabpanel]:not([hidden])');
    assert.equal(await panel.count(), 1);
    assert.equal(await tabs.nth(index).getAttribute('aria-selected'), 'true');
    assert.equal(await panel.getAttribute('aria-labelledby'), await tabs.nth(index).getAttribute('id'));
    await panel.locator('img').evaluate(async image => { await image.decode(); });
    assert.ok(await panel.locator('img').evaluate(image => image.naturalWidth > 0));
    report.tabs.push(await tabs.nth(index).textContent());
  }
  await tabs.first().focus();
  await page.keyboard.press('End');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'cp-tab-week');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'cp-tab-home');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'cp-tab-week');
  await page.keyboard.press('Home');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'cp-tab-home');
  report.keyboard = 'Arrow navigation, wrapping, Home and End passed';
  // Chapter links must point to real headings and clear the sticky header.
  await page.setViewportSize({ width: 1440, height: 1040 });
  for (const href of await page.locator('.chapter-nav a').evaluateAll(links => links.map(link => link.getAttribute('href')))) {
    assert.equal(await page.locator(href).count(), 1);
  }
  await page.locator('.primary-link').click();
  await page.waitForTimeout(600);
  const headingTop = await page.locator('#experience-title').evaluate(node => node.getBoundingClientRect().top);
  assert.ok(headingTop > 82, `Heading covered by navigation: ${headingTop}`);
  // Capture sections without duplicating the global sticky header in a tall element screenshot.
  await page.addStyleTag({ content: '.site-header{visibility:hidden}' });
  await page.locator('#cp-experience').screenshot({ path: path.join(output, 'desktop-experience.png') });
  await page.locator('#cp-consent').screenshot({ path: path.join(output, 'desktop-consent.png') });
  await page.locator('#cp-system').screenshot({ path: path.join(output, 'desktop-system.png') });
  await page.goto(`${base}#projects`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
  const entry = page.getByRole('button', { name: 'Preview CP-APP / Our Little World', exact: true });
  await entry.scrollIntoViewIfNeeded();
  await entry.click();
  assert.equal(await page.locator('[data-brief-title]').textContent(), 'CP-APP / Our Little World');
  const expected = new URL('projects/cp-app/', base).href;
  assert.equal(await page.locator('[data-brief-link]').evaluate(link => link.href), expected);
  await page.waitForTimeout(300);
  await page.locator('#projects').screenshot({ path: path.join(output, 'orbit.png') });
  report.orbitCount = await page.locator('.project-object').count();
  await page.locator('[data-brief-link]').click();
  await page.waitForURL(expected);
  report.orbitNavigation = 'passed';
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}#projects`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'astro-dev-toolbar{display:none!important}' });
  await entry.scrollIntoViewIfNeeded();
  await entry.click();
  await page.waitForTimeout(300);
  await page.locator('#projects').screenshot({ path: path.join(output, 'mobile-orbit.png') });
  await page.locator('[data-brief-link]').click();
  await page.waitForURL(expected);
  report.mobileOrbitNavigation = 'passed';
  // Enhancement must not hide the evidence when JavaScript is unavailable.
  const fallback = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  await fallback.goto(expected, { waitUntil: 'networkidle' });
  assert.equal(await fallback.locator('.screen-panel:visible').count(), 5);
  assert.equal(await fallback.locator('.screen-tabs:visible').count(), 0);
  report.noJavaScript = 'All five screen stories visible';
  assert.deepEqual(report.runtimeErrors, []);
  assert.deepEqual(report.failedLocalRequests, []);
  await fs.writeFile(path.join(output, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
