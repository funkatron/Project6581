import test from 'node:test';
import assert from 'node:assert/strict';
import {
 detectPitchTemplate,
 pitchEnvelopeTemplates,
 pitchEnvelopesEqual
} from '../src/pitch-envelope-editor.js';
import {validatePitchEnvelope} from '../src/pitch-envelope.js';

test('pitch envelope templates validate and kick matches detection',()=>{
 const templates=pitchEnvelopeTemplates();
 assert.equal(templates.off.enabled,false);
 assert.equal(templates.kick.enabled,true);
 assert.equal(templates.tom.points.length,3);
 assert.equal(detectPitchTemplate(templates.off), 'off');
 assert.equal(detectPitchTemplate(templates.kick), 'kick');
 assert.equal(detectPitchTemplate(templates.tom), 'tom');
 assert.equal(detectPitchTemplate(templates.laser), 'laser');
});

test('custom edits are not mistaken for factory templates',()=>{
 const templates=pitchEnvelopeTemplates();
 const custom=validatePitchEnvelope({
  enabled:true,interpolation:'linear',end:'hold',
  points:[{ms:0,semitones:5},{ms:90,semitones:-3}]
 });
 assert.equal(detectPitchTemplate(custom,templates),'custom');
});

test('pitchEnvelopesEqual compares normalized validation output',()=>{
 const templates=pitchEnvelopeTemplates();
 assert.ok(pitchEnvelopesEqual(templates.kick,templates.kick));
 assert.equal(pitchEnvelopesEqual(templates.kick,templates.tom),false);
});
