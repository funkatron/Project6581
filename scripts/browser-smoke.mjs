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
    const waitReady = async (model, timeout = 25000) => {
      await page.waitForFunction(expected => {
        const status = document.querySelector('#sidEngineStatus')?.textContent || '';
        const led = document.querySelector('#sidLed')?.dataset.state;
        return (led === 'on' || led === 'ready') &&
          (status.includes(String(expected)) || status.includes('SID ready'));
      }, model, { timeout });
      const state = await page.locator('#sidLed').getAttribute('data-state');
      const status = await page.locator('#sidEngineStatus').textContent();
      const activation = state === 'on' ? 'running' : 'suspended';
      console.log(engine + ' SID ' + model + ': activation=' + activation + '; ' + status);
      assert.ok(['on', 'ready'].includes(state), 'SID failed to initialize: ' + status);
    };
    await waitReady(6581);
    // Exercise the model-switch lifecycle that historically stalled in Safari.
    // This measures engine readiness, not physical speaker latency.
    const switchModel = async model => {
      const started = Date.now();
      await page.locator('#chip').selectOption(String(model));
      await page.waitForFunction(expected => {
        const status = document.querySelector('#sidEngineStatus')?.textContent || '';
        const led = document.querySelector('#sidLed')?.dataset.state;
        return (led === 'on' || led === 'ready') &&
          status.includes(String(expected)) &&
          !document.querySelector('#chip')?.disabled;
      }, model, { timeout: 25000 });
      await waitReady(model);
      const elapsed = Date.now() - started;
      console.log(engine + ' SID ' + model + ' model switch ready in ' + elapsed + ' ms');
      assert.equal(await page.locator('#chip').inputValue(), String(model));
    };
    await switchModel(8580);
    await switchModel(6581);
    // Create a valid v4 user preset using the application's own schema.
    // Exercise the actual preset picker, rather than only changing #chip.
    await page.evaluate(async () => {
      const { defaultPresetSettings } = await import('./src/preset-library.js');
      const settings = defaultPresetSettings();
      settings.sound.model = 8580;
      localStorage.setItem('project6581.user-presets.v4', JSON.stringify({
        version: 4, presets: [{ id: 'smoke-8580', name: 'Smoke 8580', settings }]
      }));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(6581);
    await page.locator('#presetOpen').click();
    const preset = page.locator('#userPresetList button[data-id="smoke-8580"]');
    await preset.waitFor();
    const presetStarted = Date.now();
    await preset.click();
    await page.waitForFunction(() => {
      const status = document.querySelector('#sidEngineStatus')?.textContent || '';
      return document.querySelector('#chip')?.value === '8580'
        && (document.querySelector('#sidLed')?.dataset.state === 'on'
          || document.querySelector('#sidLed')?.dataset.state === 'ready')
        && status.includes('8580')
        && document.querySelector('#presetDialog')?.open === false;
    }, null, { timeout: 25000 });
    console.log(engine + ' 8580 user preset loaded in ' + (Date.now() - presetStarted) + ' ms');
    await waitReady(8580);
    assert.equal(await page.locator('#chip').inputValue(), '8580');
    // Switching back must still recover the original engine.
    await switchModel(6581);
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
