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
 const labels = [];
 const visual = createArpKeyVisual({
  getKey: note => keys.get(note),
  noteName: note => ({60:'C4',61:'C♯4',64:'E4',67:'G4',84:'C6'})[note] || String(note),
  showLabel: text => labels.push(text)
 });
 return {keys,labels,visual};
}

test('regular arp stepping moves its highlight across visible white and black keys',()=>{
 const {keys,labels,visual}=fixture();
 for(const note of [60,64,67,61,60]) {
  visual.show(note);
  assert.equal(visual.note,note);
  for(const [candidate,element] of keys)assert.equal(element.classList.contains('arp-playing'),candidate===note);
 }
 assert.equal(labels.at(-1),'C4');
});

test('Game Arp notes outside visible octave show the exact note, not a false key',()=>{
 const {keys,labels,visual}=fixture();
 visual.show(60);
 visual.show(84);
 for(const element of keys.values())assert.equal(element.classList.contains('arp-playing'),false);
 assert.equal(labels.at(-1),'C6 · outside keyboard');
 assert.equal(visual.note,84);
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

test('clear works after stopping, clearing latch, changing modes, or panic',()=>{
 const {keys,labels,visual}=fixture();
 for(const note of [60,64,67]) {
  visual.show(note);
  visual.clear();
  assert.equal(visual.note,null);
  assert.equal(labels.at(-1),'');
  for(const element of keys.values())assert.equal(element.classList.contains('arp-playing'),false);
 }
});

test('refresh rebinds highlight on keyboard re-render or octave change',()=>{
 const {keys,visual,labels}=fixture();
 visual.show(60);
 const old=keys.get(60);
 keys.set(60,key());
 visual.refresh();
 assert.equal(old.classList.contains('arp-playing'),false);
 assert.equal(keys.get(60).classList.contains('arp-playing'),true);
 keys.delete(60);
 visual.refresh();
 assert.equal(labels.at(-1),'C4 · outside keyboard');
 assert.equal(visual.note,60);
});

test('invalid note values are rejected without corrupting the active highlight',()=>{
 const {keys,visual}=fixture();
 visual.show(60);
 for(const note of [-1,128,1.5,NaN,null,undefined])assert.throws(()=>visual.show(note),RangeError);
 assert.equal(visual.note,60);
 assert.equal(keys.get(60).classList.contains('arp-playing'),true);
});
