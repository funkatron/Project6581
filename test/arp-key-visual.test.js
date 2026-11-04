import test from 'node:test';
import assert from 'node:assert/strict';
import {createArpKeyVisual} from '../src/arp-key-visual.js';

function key() {
 const classes = new Set();
 return {
  classList: {
   add(name) { classes.add(name); },
   remove(name) { classes.delete(name); },
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
  visual.show(note);
  assert.equal(visual.note,note);
  for(const [candidate,element] of keys)
   assert.equal(element.classList.contains('arp-playing'),candidate===note);
 }
});

test('out-of-range Game Arp notes are silent in the UI, with no false highlight',()=>{
 const {keys,visual}=fixture();
 visual.show(60);
 visual.show(84);
 assert.equal(visual.note,84);
 for(const element of keys.values())
  assert.equal(element.classList.contains('arp-playing'),false);
 // There is deliberately no note-label callback or status text.
 assert.equal('showLabel' in visual,false);
});

test('visual highlights never disturb independently held physical keys',()=>{
 const {keys,visual}=fixture();
 keys.get(60).classList.add('down');
 visual.show(60);
 assert.equal(keys.get(60).classList.contains('arp-playing'),true);
 visual.show(64);
 assert.equal(keys.get(60).classList.contains('down'),true);
 assert.equal(keys.get(60).classList.contains('arp-playing'),false);
 visual.clear();
 assert.equal(keys.get(60).classList.contains('down'),true);
 assert.equal(keys.get(64).classList.contains('arp-playing'),false);
});

test('clear removes the indicator on stop, latch clearing, mode switch and panic',()=>{
 const {keys,visual}=fixture();
 for(const note of [60,64,67]){
  visual.show(note);
  visual.clear();
  assert.equal(visual.note,null);
  for(const element of keys.values())
   assert.equal(element.classList.contains('arp-playing'),false);
 }
});

test('refresh updates key bindings across octave changes without labels',()=>{
 const {keys,visual}=fixture();
 visual.show(60);
 const old=keys.get(60);
 keys.set(60,key());
 visual.refresh();
 assert.equal(old.classList.contains('arp-playing'),false);
 assert.equal(keys.get(60).classList.contains('arp-playing'),true);
 keys.delete(60);
 visual.refresh();
 assert.equal(visual.note,60);
 for(const element of keys.values())
  assert.equal(element.classList.contains('arp-playing'),false);
});

test('repeated fast arp notes avoid unnecessary keyboard repaints',()=>{
 const {keys,visual}=fixture();
 let additions=0;
 const first=keys.get(60);
 const original=first.classList.add;
 first.classList.add=(...args)=>{additions++;original(...args)};
 visual.show(60);
 visual.show(60);
 visual.show(60);
 assert.equal(additions,1);
 keys.set(60,key());
 visual.show(60);
 assert.equal(first.classList.contains('arp-playing'),false);
 assert.equal(keys.get(60).classList.contains('arp-playing'),true);
 visual.clear();
 visual.clear();
 assert.equal(visual.note,null);
});

test('invalid notes cannot corrupt the current highlight',()=>{
 const {keys,visual}=fixture();
 visual.show(60);
 for(const note of [-1,128,1.5,NaN,null,undefined])
  assert.throws(()=>visual.show(note),RangeError);
 assert.equal(visual.note,60);
 assert.equal(keys.get(60).classList.contains('arp-playing'),true);
});
