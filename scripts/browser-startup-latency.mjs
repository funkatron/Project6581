// Startup-path diagnostic for keyboard-first vs Enable-audio-first activation.
// Proves suspended-context preconditions and records processing timings.
// This is NOT a measurement of physical speaker latency.
import {chromium, webkit} from 'playwright';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixturePath = join(root, 'test/fixtures/fnk-deep-bass.json');
const artifactDir = join(root, 'tmp/startup-latency');
const presetBytes = readFileSync(fixturePath);
const engineName = process.env.BROWSER === 'chromium' ? 'chromium' : 'webkit';
const engine = engineName === 'chromium' ? chromium : webkit;
const baseUrl = process.env.SID_URL || 'http://127.0.0.1:8765/';

mkdirSync(artifactDir, {recursive: true});

function snapshotSelector() {
  return {
    chip: document.querySelector('#chip')?.value,
    led: document.querySelector('#sidLed')?.dataset.state,
    status: document.querySelector('#sidEngineStatus')?.textContent,
    unlockHidden: document.querySelector('#sidUnlock')?.hidden,
    unlockDisabled: document.querySelector('#sidUnlock')?.disabled,
    contextState: window.__sidDiagnosticContext?.state,
    contextTime: window.__sidDiagnosticContext?.currentTime,
    playback: document.querySelector('#sidPlaybackStatus')?.textContent,
    timing: document.querySelector('#audioTimingSummary')?.textContent?.slice(0, 4000),
    eventLog: document.querySelector('#sidEventLogging')?.checked,
    gameArp: document.querySelector('#gameArpOn')?.checked,
    wallTime: performance.now()
  };
}

async function captureFailure(page, label, error) {
  const safe = label.replace(/[^a-z0-9_-]+/gi, '-');
  const shot = join(artifactDir, safe + '.png');
  try {
    await page.screenshot({path: shot, fullPage: true});
  } catch {
    // Page may already be closed.
  }
  let snap = null;
  try {
    snap = await page.evaluate(snapshotSelector);
  } catch {
    snap = {evaluateFailed: true};
  }
  const report = {
    label,
    message: error?.message || String(error),
    snapshot: snap,
    at: new Date().toISOString()
  };
  writeFileSync(join(artifactDir, safe + '.json'), JSON.stringify(report, null, 2));
  console.error('FAILURE_ARTIFACT', JSON.stringify(report));
}

async function waitSidReady(page, model, label) {
  try {
    await page.waitForFunction(expected => {
      const chip = document.querySelector('#chip')?.value;
      const led = document.querySelector('#sidLed')?.dataset.state;
      const busy = document.querySelector('#chip')?.disabled;
      return chip === String(expected) && (led === 'ready' || led === 'on') && !busy;
    }, model, {timeout: 30000});
  } catch (error) {
    await captureFailure(page, label + '-sid-ready', error);
    throw error;
  }
}

async function enableDiagnosticsWhileRunning(page, label) {
  const state = await page.evaluate(() => window.__sidDiagnosticContext?.state);
  if (state !== 'running' && state !== 'suspended' && state !== 'interrupted') {
    const error = new Error('No diagnostic AudioContext for ' + label + ' (state=' + state + ')');
    await captureFailure(page, label + '-no-context', error);
    throw error;
  }
  // Open diagnostics and enable logging BEFORE forced suspension.
  // Any pointerdown while suspended would call unlockSidAudio and invalidate the test.
  const details = page.locator('#audioTimingDetails');
  if (!(await details.evaluate(el => el.open))) {
    await page.locator('#audioTimingDetails > summary').click();
  }
  const logging = page.locator('#sidEventLogging');
  if (!(await logging.isChecked())) {
    await logging.check();
  }
}

async function forceSuspended(page, label) {
  await page.evaluate(async () => {
    const context = window.__sidDiagnosticContext;
    if (!context) throw new Error('Missing __sidDiagnosticContext');
    if (context.state !== 'suspended') await context.suspend();
  });
  const initial = await page.evaluate(snapshotSelector);
  if (initial.contextState !== 'suspended') {
    const error = new Error('Invalid diagnostic: context not suspended before ' + label);
    await captureFailure(page, label + '-not-suspended', error);
    throw error;
  }
  console.log('SUSPENDED_CONTEXT', label, JSON.stringify(initial));
  return initial;
}

async function assertStillSuspended(page, label) {
  const before = await page.evaluate(snapshotSelector);
  if (before.contextState !== 'suspended') {
    const error = new Error(
      'Context left suspended before activation gesture for ' + label + ': ' + JSON.stringify(before)
    );
    await captureFailure(page, label + '-resumed-early', error);
    throw error;
  }
  return before;
}

async function tapFirstKey(page, label) {
  const key = page.locator('#keyboard .key').first();
  await key.scrollIntoViewIfNeeded();
  const rect = await key.boundingBox();
  if (!rect) {
    const error = new Error('Keyboard key not visible for ' + label);
    await captureFailure(page, label + '-no-key', error);
    throw error;
  }
  await page.touchscreen.tap(rect.x + rect.width / 2, rect.y + rect.height / 2);
}

async function importAndSelectExactPreset(page, label) {
  await page.locator('#presetOpen').click();
  await page.locator('#presetFile').setInputFiles({
    name: 'fnk-deep-bass.json',
    mimeType: 'application/json',
    buffer: presetBytes
  });
  await page.locator('#userPresetList button').filter({hasText: 'FNK Deep Bass'}).click();
  await waitSidReady(page, 8580, label + '-preset');
  console.log('PRESET_LOADED', label, JSON.stringify(await page.evaluate(snapshotSelector)));
}

async function runPath(pathName) {
  // Fresh browser per path keeps WebKit memory bounded on small hosts.
  const browser = await engine.launch({headless: true});
  let context = null;
  let page = null;
  try {
    context = await browser.newContext({
      viewport: {width: 820, height: 1180},
      hasTouch: true,
      isMobile: engineName === 'webkit'
    });
    page = await context.newPage();
    page.on('pageerror', e => console.error(pathName, 'pageerror', e.message));
    page.on('console', message => {
      if (message.type() === 'error') console.error(pathName, 'console', message.text());
    });
    page.on('crash', () => console.error(pathName, 'page crashed'));
    await page.addInitScript(() => {
      const NativeAudioContext = window.AudioContext;
      window.AudioContext = class extends NativeAudioContext {
        constructor(...args) {
          super(...args);
          window.__sidDiagnosticContext = this;
        }
      };
    });
    await page.goto(baseUrl, {waitUntil: 'domcontentloaded'});
    await waitSidReady(page, 6581, pathName + '-boot');

    await importAndSelectExactPreset(page, pathName);

    if (pathName === 'keyboard-game-arp-off') {
      // Control case: disable sequencer via UI after exact import, before the measured tap.
      await page.locator('#tabPlay').click();
      const game = page.locator('#gameArpOn');
      if (await game.isChecked()) await game.uncheck();
      const gameState = await page.evaluate(snapshotSelector);
      if (gameState.gameArp) {
        const error = new Error('Game Arp remained enabled for control case');
        await captureFailure(page, pathName + '-game-still-on', error);
        throw error;
      }
      console.log('GAME_ARP_OFF_ARMED', pathName, JSON.stringify(gameState));
    }

    await enableDiagnosticsWhileRunning(page, pathName);
    const initial = await forceSuspended(page, pathName);

    if (pathName === 'enable-audio-first') {
      await assertStillSuspended(page, pathName + '-pre-unlock');
      const unlock = page.locator('#sidUnlock');
      if (!(await unlock.isVisible()) || await unlock.isDisabled()) {
        const error = new Error('#sidUnlock not actionable while suspended');
        await captureFailure(page, pathName + '-unlock-hidden', error);
        throw error;
      }
      await unlock.click();
      try {
        await page.waitForFunction(
          () => window.__sidDiagnosticContext?.state === 'running',
          null,
          {timeout: 10000}
        );
      } catch (error) {
        await captureFailure(page, pathName + '-unlock-timeout', error);
        throw error;
      }
    } else {
      // keyboard-first paths: the activation gesture itself must start suspended.
      await assertStillSuspended(page, pathName + '-pre-key');
    }

    const before = await page.evaluate(snapshotSelector);
    await tapFirstKey(page, pathName);
    await page.waitForTimeout(900);
    const snapshot = await page.evaluate(snapshotSelector);
    if (snapshot.contextState !== 'running') {
      const error = new Error('Audio context did not resume after gesture: ' + JSON.stringify(snapshot));
      await captureFailure(page, pathName + '-not-running', error);
      throw error;
    }
    console.log('STARTUP_PATH_DIAGNOSTIC', JSON.stringify({path: pathName, initial, before, snapshot}));

    if (pathName === 'keyboard-then-model-switch') {
      await page.locator('#chip').selectOption('6581');
      await waitSidReady(page, 6581, pathName + '-to-6581');
      await enableDiagnosticsWhileRunning(page, pathName + '-after-switch');
      const afterSwitchSuspended = await forceSuspended(page, pathName + '-after-switch');
      await assertStillSuspended(page, pathName + '-after-switch-pre-key');
      const beforeSecond = await page.evaluate(snapshotSelector);
      await tapFirstKey(page, pathName + '-second');
      await page.waitForTimeout(900);
      const second = await page.evaluate(snapshotSelector);
      if (second.contextState !== 'running') {
        const error = new Error('Context did not resume after 6581 switch: ' + JSON.stringify(second));
        await captureFailure(page, pathName + '-second-not-running', error);
        throw error;
      }
      console.log(
        'MODEL_SWITCH_PERSISTENCE',
        JSON.stringify({path: pathName, afterSwitchSuspended, beforeSecond, second})
      );
    }
  } catch (error) {
    if (page) await captureFailure(page, pathName + '-uncaught', error);
    throw error;
  } finally {
    if (context) await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

const defaultPaths = [
  'keyboard-first',
  'enable-audio-first',
  'keyboard-then-model-switch',
  'keyboard-game-arp-off'
];
const paths = process.env.SID_LATENCY_PATHS
  ? process.env.SID_LATENCY_PATHS.split(',').map(s => s.trim()).filter(Boolean)
  : defaultPaths;
for (const pathName of paths) {
  console.log('RUN_PATH', pathName, 'engine', engineName);
  await runPath(pathName);
  await new Promise(resolve => setTimeout(resolve, 500));
}
