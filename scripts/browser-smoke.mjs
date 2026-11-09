// Optional integration smoke. Run via workflow_dispatch, not the fast Node suite.
import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';

const engines = process.env.BROWSER === 'both' || !process.env.BROWSER
  ? ['chromium', 'webkit'] : [process.env.BROWSER];
const url = 'http://127.0.0.1:8765/';
let failures = 0;
for (const engine of engines) {
  if (!({ chromium, webkit })[engine]) throw new Error('Unsupported browser: ' + engine);
  const browser = await ({ chromium, webkit })[engine].launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: engine === 'webkit' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.locator('#tabLfos').click();
    assert.equal(await page.locator('#workspace').getAttribute('data-tab'), 'lfos');
    assert.equal(await page.locator('#tabLfos').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('#lfoPanel').isVisible(), true);
    assert.equal(await page.locator('#voicePanel').isVisible(), false);
    assert.equal(await page.locator('#playPanel').isVisible(), false);
    assert.equal(await page.locator('#keyboard').isVisible(), true);
    await page.locator('#tabPlay').click();
    assert.equal(await page.locator('#playPanel').isVisible(), true);
    assert.equal(await page.locator('#voicePanel').isVisible(), false);
    assert.equal(await page.locator('#lfoPanel').isVisible(), false);
    assert.equal(await page.locator('#keyboard').isVisible(), true);
    await page.locator('#tabVoice').click();
    assert.equal(await page.locator('#voicePanel').isVisible(), true);
    assert.equal(await page.locator('#playPanel').isVisible(), false);
    assert.equal(await page.locator('#lfoPanel').isVisible(), false);
    assert.equal(await page.locator('#keyboard').isVisible(), true);
    await page.locator('#keyboardToggle').click();
    assert.equal(await page.locator('#keyboardToggle').getAttribute('aria-expanded'), 'false');
    await page.locator('#keyboardToggle').click();
    assert.equal(await page.locator('#keyboardToggle').getAttribute('aria-expanded'), 'true');
    // The engine must actually finish initialization, not merely display its UI.
    await page.waitForFunction(() => {
      const text = document.querySelector('#sidEngineStatus')?.textContent || '';
      return /ready|unavailable|failed|error/i.test(text);
    }, { timeout: 20000 });
    const status = await page.locator('#sidEngineStatus').textContent();
    assert.match(status, /ready/i, 'SID engine did not become ready: ' + status);
    assert.equal(errors.length, 0, 'Unexpected JavaScript errors: ' + errors.join('; '));
    console.log('PASS ' + engine + ': tabs, visibility, keyboard toggle');
    await context.close();
  } catch (error) {
    failures++;
    console.error('FAIL ' + engine, error);
  } finally {
    await browser.close();
  }
}
if (failures) process.exitCode = 1;
