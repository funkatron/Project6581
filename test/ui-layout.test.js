import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setLayoutInert} from '../src/ui-layout.js';

test('setLayoutInert toggles class and inert without display:none',()=>{
 const el={classList:{value:'',toggle(name,on){this.value=on?name:''}},attributes:new Map(),
  setAttribute(k,v){this.attributes.set(k,v)},
  removeAttribute(k){this.attributes.delete(k)}
 };
 setLayoutInert(el,true);
 assert.equal(el.classList.value,'layout-inert');
 assert.equal(el.attributes.get('aria-hidden'),'true');
 setLayoutInert(el,false);
 assert.equal(el.classList.value,'');
 assert.equal(el.attributes.has('aria-hidden'),false);
});

test('engine pulse rows use layout-inert instead of hidden attribute',()=>{
 const ui=readFileSync(new URL('../src/sid-engine-panels-ui.js',import.meta.url),'utf8');
 assert.match(ui,/setLayoutInert\(row,!show\)/);
 assert.doesNotMatch(ui,/row\.hidden=!show/);
});

test('arp local bpm keeps layout space when sync is on',()=>{
 const css=readFileSync(new URL('../src/studio-core.css',import.meta.url),'utf8');
 const studio=readFileSync(new URL('../src/sid-studio.js',import.meta.url),'utf8');
 assert.match(css,/\.layout-inert\{visibility:hidden/);
 assert.doesNotMatch(css,/\.arp-local-bpm\[hidden\]/);
 assert.match(studio,/syncArpLocalBpmLayout/);
 assert.match(studio,/setLayoutInert\(document\.querySelector\('\.arp-local-bpm'\)/);
});