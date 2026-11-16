import test from 'node:test';
import assert from 'node:assert/strict';
import {readStudioCoreCss} from './studio-css.mjs';

test('main shell disables accidental text selection on controls and keys',()=>{
 const css=readStudioCoreCss();
 assert.match(css,/main\{[^}]*user-select:none/);
 assert.match(css,/main\{[^}]*touch-action:manipulation/);
 assert.match(css,/\.key\{[^}]*user-select:none/);
 assert.match(css,/#sidReportFallback\{[^}]*user-select:text/);
});