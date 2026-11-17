import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const studio=readFileSync(new URL('../src/sid-studio.js',import.meta.url),'utf8');
const midi=readFileSync(new URL('../src/midi-input.js',import.meta.url),'utf8');

test('MIDI input UI and studio hookup exist',()=>{
 for(const id of ['midiEnable','midiPort','midiChannel','midiStatus','preferencesDialog','preferencesOpen'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.doesNotMatch(html,/playPanel[\s\S]*id="midiEnable"/);
 assert.match(studio,/import \{mountMidiInput\} from "\.\/midi-input\.js\?v=__BUILD_ID__";/);
 assert.match(studio,/pitchPhysicallyHeld:note=>arp\.held\.has\(note\)\|\|directOwned\.has\(note\)/);
 assert.match(studio,/releaseMidiNotes\(\)/);
});

test('desktop Step E note lifecycle hooks stay wired',()=>{
 assert.match(midi,/releaseAll/);
 assert.match(midi,/CC64|sustain/i);
 assert.match(midi,/midiChannel/);
 assert.match(midi,/navigator\.requestMIDIAccess/);
 assert.match(studio,/panic\(\)[\s\S]*releaseMidiNotes/);
});