import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {formatHzBrief,formatPanBrief,formatPercent} from '../src/control-format.js';

test('brief formatters for param-row values',()=>{
 assert.equal(formatPanBrief(0),'Ctr');
 assert.equal(formatPanBrief(-80),'L80');
 assert.equal(formatHzBrief(7000),'7k');
 assert.equal(formatPercent(55),'55%');
});

test('sid engine panels use param-row markup',()=>{
 const ui=readFileSync(new URL('../src/sid-engine-panels-ui.js',import.meta.url),'utf8');
 assert.match(ui,/className='param-row'/);
 assert.match(ui,/formatPanBrief/);
 assert.match(ui,/formatHzBrief/);
 assert.match(ui,/sid-engine-control-grid/);
 assert.match(ui,/param-values/);
 assert.match(ui,/appendParamRow\(controlGrid,name/);
});