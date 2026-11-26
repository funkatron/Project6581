import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('action buttons never open help from a plain click',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 // data-help binds help to click, so only dedicated ? triggers may carry it.
 for(const [tag] of html.matchAll(/<[a-z]+\b[^<>]*\bdata-help="[^"]*"[^<>]*>/g))assert.match(tag,/class="help-trigger"/);
});
