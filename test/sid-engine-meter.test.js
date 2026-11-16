import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readStudioCoreCss} from './studio-css.mjs';

test('per-chip rainbow meter is horizontal with width-driven fill',()=>{
 const css=readStudioCoreCss();
 assert.match(css,/\.sid-rainbow-meter\{[^}]*height:14px/);
 assert.match(css,/\.sid-rainbow-meter-fill\{[^}]*width:0/);
 assert.match(css,/\.sid-rainbow-meter-track\{[^}]*linear-gradient\(90deg/);
 const ui=readFileSync(new URL('../src/sid-engine-panels-ui.js',import.meta.url),'utf8');
 assert.match(ui,/meterDisplayWidth/);
 assert.doesNotMatch(ui,/meterDisplayHeight/);
 assert.match(ui,/fill\.style\.width/);
 assert.doesNotMatch(ui,/fill\.style\.height/);
 assert.match(ui,/sid-rainbow-meter-track/);
});