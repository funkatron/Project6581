import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMidiMessage} from '../src/midi-message.js';

test('parseMidiMessage handles note on, velocity-zero note on, and note off',()=>{
 assert.deepEqual(parseMidiMessage([0x90,60,100]),{kind:'note-on',channel:1,note:60,velocity:100});
 assert.deepEqual(parseMidiMessage([0x90,60,0]),{kind:'note-off',channel:1,note:60,velocity:0});
 assert.deepEqual(parseMidiMessage([0x80,48,64]),{kind:'note-off',channel:1,note:48,velocity:64});
 assert.deepEqual(parseMidiMessage([0x92,55,90]),{kind:'note-on',channel:3,note:55,velocity:90});
});

test('parseMidiMessage handles sustain pedal CC64',()=>{
 assert.deepEqual(parseMidiMessage([0xb0,64,127]),{kind:'cc',channel:1,controller:64,value:127});
 assert.deepEqual(parseMidiMessage([0xb1,64,0]),{kind:'cc',channel:2,controller:64,value:0});
});