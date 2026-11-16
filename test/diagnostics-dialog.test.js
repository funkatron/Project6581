import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('diagnostics dialog markup and modules are wired',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const studio=readFileSync(new URL('../src/sid-studio.js',import.meta.url),'utf8');
 assert.match(html,/id="studioDiagnostics"/);
 assert.match(html,/id="diagnosticsOpen"/);
 assert.match(studio,/mountDiagnosticsDialog/);
 assert.match(studio,/createStudioTraceLog/);
 assert.match(studio,/function traceStudio/);
});