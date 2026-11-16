import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('diagnostics panel is footer-driven and not in the tab bar',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const studio=readFileSync(new URL('../src/sid-studio.js',import.meta.url),'utf8');
 const tabs=readFileSync(new URL('../src/editor-tabs.js',import.meta.url),'utf8');
 assert.match(html,/id="diagPanel"/);
 assert.match(html,/footer-diagnostics-link/);
 assert.match(html,/id="diagnosticsDownload"/);
 assert.match(html,/id="diagnosticsActivityView"/);
 assert.doesNotMatch(html,/id="studioDiagnostics"/);
 assert.doesNotMatch(html,/header-icon-btn[^>]*id="diagnosticsOpen"/);
 assert.match(studio,/mountDiagnosticsPanel/);
 assert.match(tabs,/diagPanel/);
});