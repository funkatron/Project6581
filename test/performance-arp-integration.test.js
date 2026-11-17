import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('sid-studio avoids raw arp flag checkbox writes',()=>{
  const script=readFileSync(new URL('../src/sid-studio.js',import.meta.url),'utf8');
  assert.doesNotMatch(script,/'\$?\('arpOn'\)\.checked\s*=/);
  assert.doesNotMatch(script,/'\$?\('gameArpOn'\)\.checked\s*=/);
  assert.doesNotMatch(script,/'\$?\('arpLatch'\)\.checked\s*=/);
  assert.match(script,/performanceArp\.set/);
  assert.match(script,/performanceArp\.applyFromPreset/);
});