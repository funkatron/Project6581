import test from 'node:test';
import assert from 'node:assert/strict';
import {readStudioCoreCss} from './studio-css.mjs';

test('param-row tokens and grid are defined in studio CSS',()=>{
 const css=readStudioCoreCss();
 assert.match(css,/--bar-h:38px/);
 assert.match(css,/--label-w:6\.25rem/);
 assert.match(css,/--value-w:5rem/);
 assert.match(css,/\.sid-engine-control-grid/);
 assert.match(css,/grid-template-columns:subgrid/);
 assert.match(css,/\.param-row \.param-values/);
 assert.match(css,/\.param-row\{[^}]*grid-template-columns:var\(--label-w\) minmax\(0,1fr\) var\(--value-w\)/);
});