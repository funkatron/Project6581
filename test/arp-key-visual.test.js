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

test('regular arp stepping highlights only the generated white or black key',()=>{
 const {keys,visual}=fixture();
 for(const note of [60,64,67,61,60]){
  visual.show(note,'root');
  assert.equal(visual.getNote('root'),note);
  assert.equal(visual.getNote('game'),null);
  for(const [candidate,element] of keys)
   assert.equal(element.classList.contains('arp-playing-root'),candidate===note);
 }
});

test('Game Arp and Root Arp highlights can be shown at the same time',()=>{
 const {keys,visual}=fixture();
 visual.show(64,'game');
 visual.show(67,'root');
 assert.equal(visual.getNote('game'),64);
 assert.equal(visual.getNote('root'),67);
 assert.equal(keys.get(64).classList.contains('arp-playing-game'),true);
 assert.equal(keys.get(67).classList.contains('arp-playing-root'),true);
 assert.equal(keys.get(60).classList.contains('arp-playing-game'),false);
 visual.show(60,'game');
 assert.equal(keys.get(64).classList.contains('arp-playing-game'),false);
 assert.equal(keys.get(60).classList.contains('arp-playing-game'),true);
 assert.equal(keys.get(67).classList.contains('arp-playing-root'),true);
});

test('out-of-range Game Arp notes are silent in the UI, with no false highlight',()=>{
 const {keys,visual}=fixture();
 visual.show(60,'game');
 visual.show(84,'game');
 assert.equal(visual.getNote('game'),84);
 for(const element of keys.values())
  assert.equal(element.classList.contains('arp-playing-game'),false);
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

test('scoped clear removes one arp source without disturbing the other',()=>{
 const {keys,visual}=fixture();
 visual.show(60,'root');
 visual.show(64,'game');
 visual.clear('game');
 assert.equal(visual.getNote('game'),null);
 assert.equal(visual.getNote('root'),60);
 assert.equal(keys.get(64).classList.contains('arp-playing-game'),false);
 assert.equal(keys.get(60).classList.contains('arp-playing-root'),true);
 visual.clear('root');
 assert.equal(visual.getNote('root'),null);
 visual.show(67,'game');
 visual.clear();
 assert.equal(visual.getNote('root'),null);
 assert.equal(visual.getNote('game'),null);
 for(const element of keys.values()){
  assert.equal(element.classList.contains('arp-playing-game'),false);
  assert.equal(element.classList.contains('arp-playing-root'),false);
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
 assert.equal(visual.getNote('root'),60);
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
 assert.equal(visual.getNote('root'),null);
});

test('invalid notes cannot corrupt the current highlight',()=>{
 const {keys,visual}=fixture();
 visual.show(60,'root');
 for(const note of [-1,128,1.5,NaN,null,undefined])
  assert.throws(()=>visual.show(note,'root'),RangeError);
 assert.equal(visual.getNote('root'),60);
 assert.equal(keys.get(60).classList.contains('arp-playing-root'),true);
});

test('invalid arp sources are rejected',()=>{
 const {visual}=fixture();
 assert.throws(()=>visual.show(60,'arp'),TypeError);
 assert.throws(()=>visual.show(60,null),TypeError);
 assert.throws(()=>visual.clear('arp'),TypeError);
});