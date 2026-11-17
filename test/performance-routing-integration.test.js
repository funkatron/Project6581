import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('sid-studio avoids raw routing select writes',()=>{
  const script=readFileSync(new URL('../src/sid-studio.js',import.meta.url),'utf8');
  assert.doesNotMatch(script,/'\$?\('keyboardRoute'\)\.value\s*=/);
  assert.doesNotMatch(script,/'\$?\('arpRoute'\)\.value\s*=/);
  assert.doesNotMatch(script,/'\$?\('gameRoute'\)\.value\s*=/);
  assert.match(script,/createPerformanceRoutingState/);
  assert.match(script,/performanceRouting\.applyFromPreset/);
  assert.match(script,/performanceRouting\.getState\(\)/);
});