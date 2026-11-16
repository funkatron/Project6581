import test from 'node:test';
import assert from 'node:assert/strict';
import {
 GAME_PATTERNS,selectRoot,patternPitch,stepMilliseconds,resolveGameRoot
} from '../src/arp-composition.js';
import {defaultSequence,sequenceEvent} from '../src/game-step-sequencer.js';

test('selectRoot orders held notes for each pattern',()=>{
 const notes=[67,60,64];
 assert.equal(selectRoot(notes,'up',0),60);
 assert.equal(selectRoot(notes,'up',1),64);
 assert.equal(selectRoot(notes,'down',0),67);
 assert.equal(selectRoot(notes,'updown',0),60);
 assert.equal(selectRoot(notes,'updown',1),64);
 assert.equal(selectRoot(notes,'updown',2),67);
 assert.equal(selectRoot(notes,'updown',3),64);
 assert.equal(selectRoot(notes,'random',0,0.1),60);
 assert.equal(selectRoot([],'up',0),null);
});

test('patternPitch clamps built-in styles to MIDI range',()=>{
 assert.equal(patternPitch(60,'action',0),60);
 assert.equal(patternPitch(60,'action',1),72);
 assert.equal(patternPitch(3,'action',0),3);
 assert.equal(patternPitch(3,'action',3),15);
 assert.equal(patternPitch(120,'arcade',5),127);
 assert.deepEqual(GAME_PATTERNS.action.slice(0,3),[0,12,7]);
});

test('stepMilliseconds uses independent BPM and rate divisors',()=>{
 assert.equal(stepMilliseconds(120,4),125);
 assert.equal(stepMilliseconds(120,16),31.25);
 assert.equal(stepMilliseconds(90,8),83.33333333333333);
 assert.throws(()=>stepMilliseconds(0,4),RangeError);
});

test('resolveGameRoot prefers regular Arp root when both generators run',()=>{
 assert.equal(resolveGameRoot({
  arpEnabled:true,arpRoot:64,heldNotes:[60,67],seqPreview:false,previewRootMidi:48
 }),64);
 assert.equal(resolveGameRoot({
  arpEnabled:false,arpRoot:null,heldNotes:[60,67],seqPreview:false,previewRootMidi:48
 }),67);
 assert.equal(resolveGameRoot({
  arpEnabled:false,arpRoot:null,heldNotes:[],seqPreview:true,previewRootMidi:60
 }),60);
 assert.equal(resolveGameRoot({
  arpEnabled:true,arpRoot:null,heldNotes:[55],seqPreview:false,previewRootMidi:48
 }),55);
});

test('both on: Game Arp melody follows selected root through the sequence',()=>{
 const notes=[60,64,67];
 const root=selectRoot(notes,'up',1);
 assert.equal(root,64);
 const phrase=defaultSequence();
 phrase.steps[0].offset=7;
 const event=sequenceEvent(root,phrase,0);
 assert.equal(event.note,71);
 assert.equal(event.gate,true);
});