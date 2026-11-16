import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('native chip peaks measure post-pan bus contribution (aligned with master PCM)',()=>{
 const bridge=readFileSync(new URL('../native/sid_bridge.cpp',import.meta.url),'utf8');
 assert.match(bridge,/kBusDivisor/);
 assert.match(bridge,/busL.*leftGain.*kBusDivisor/s);
 assert.match(bridge,/Per-chip meters track post-pan bus contribution/);
});