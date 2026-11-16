import test from 'node:test';
import assert from 'node:assert/strict';
import {createArpKeyVisual} from '../src/arp-key-visual.js';

function key() {
 const classes = new Set();
 return {
  classList: {
   add(...names) { for (const name of names) classes.add(name); },
   remove(...names) { for (const name of names) classes.delete(name); },
   contains(name) { return classes.has(name); }
  }
 };
}
function fixture() {
 const keys = new Map([[60,key()],[61,key()],[64,key()],[67,key()]]);
 const visual = createArpKeyVisual({getKey: note => keys.get(note)});
 return {keys,visual};
}

function assertOnlySource(keys,note,source){
 const rootClass='arp-playing-root';
 const gameClass='arp-playing-game';
 for(const [candidate,element] of keys){
  const active=candidate===note;
  assert.equal(element.classList.contains(rootClass),active&&source==='root');
  assert.equal(element.classList.contains(gameClass),active&&source==='game');
 }
}

test('regular arp stepping highlights only the generated white or black key',()=>{
 const {keys,visual}=fixture();
 for(const note of [60,64,67,61,60]){
  visual.show(note,'root');
  assert.equal(visual.note,note);
  assert.equal(visual.source,'root');
  assertOnlySource(keys,note,'root');
 }
});

test('Game Arp stepping uses a distinct highlight class from root arp',()=>{
 const {keys,visual}=fixture();
 visual.show(60,'game');
 assert.equal(visual.source,'game');
 assertOnlySource(keys,60,'game');
 visual.show(64,'game');
 assertOnlySource(keys,64,'game');
 visual.show(67,'root');
 assertOnlySource(keys,67,'root');
});

test('out-of-range Game Arp notes are silent in the UI, with no false highlight',()=>{
 const {keys,visual}=fixture();
 visual.show(60,'game');
 visual.show(84,'game');
 assert.equal(visual.note,84);
 for(const element of keys.values()){
  assert.equal(element.classList.contains('arp-playing-root'),false);
  assert.equal(element.classList.contains('arp-playing-game'),false);
 }
 assert.equal('showLabel' in visual,false);
});

test('visual highlights never disturb independently held physical keys',()=>{
 const {keys,visual}=fixture();
 keys.get(60).classList.add('down');
 visual.show(60,'root');
 assert.equal(keys.get(60).classList.contains('arp-playing-root'),true);
 visual.show(64,'root');
 assert.equal(keys.get(60).classList.contains('down'),true);
 assert.equal(keys.get(60).classList.contains('arp-playing-root'),false);
 visual.clear();
 assert.equal(keys.get(60).classList.contains('down'),true);
 assert.equal(keys.get(64).classList.contains('arp-playing-root'),false);
});

test('clear removes the indicator on stop, latch clearing, mode switch and panic',()=>{
 const {keys,visual}=fixture();
 for(const note of [60,64,67]){
  visual.show(note,'game');
  visual.clear();
  assert.equal(visual.note,null);
  assert.equal(visual.source,null);
  for(const element of keys.values()){
   assert.equal(element.classList.contains('arp-playing-game'),false);
   assert.equal(element.classList.contains('arp-playing-root'),false);
  }
 }
});

test('refresh updates key bindings across octave changes without labels',()=>{
 const {keys,visual}=fixture();
 visual.show(60,'root');
 const old=keys.get(60);
 keys.set(60,key());
 visual.refresh();
 assert.equal(old.classList.contains('arp-playing-root'),false);
 assert.equal(keys.get(60).classList.contains('arp-playing-root'),true);
 keys.delete(60);
 visual.refresh();
 assert.equal(visual.note,60);
 for(const element of keys.values()){
  assert.equal(element.classList.contains('arp-playing-root'),false);
  assert.equal(element.classList.contains('arp-playing-game'),false);
 }
});

test('repeated fast arp notes avoid unnecessary keyboard repaints',()=>{
 const {keys,visual}=fixture();
 let additions=0;
 const first=keys.get(60);
 const original=first.classList.add;
 first.classList.add=(...args)=>{additions++;original(...args)};
 visual.show(60,'root');
 visual.show(60,'root');
 visual.show(60,'root');
 assert.equal(additions,1);
 keys.set(60,key());
 visual.show(60,'root');
 assert.equal(first.classList.contains('arp-playing-root'),false);
 assert.equal(keys.get(60).classList.contains('arp-playing-root'),true);
 visual.clear();
 visual.clear();
 assert.equal(visual.note,null);
});

test('invalid notes cannot corrupt the current highlight',()=>{
 const {keys,visual}=fixture();
 visual.show(60,'root');
 for(const note of [-1,128,1.5,NaN,null,undefined])
  assert.throws(()=>visual.show(note,'root'),RangeError);
 assert.equal(visual.note,60);
 assert.equal(keys.get(60).classList.contains('arp-playing-root'),true);
});

test('invalid arp sources are rejected',()=>{
 const {visual}=fixture();
 assert.throws(()=>visual.show(60,'arp'),TypeError);
 assert.throws(()=>visual.show(60,null),TypeError);
});