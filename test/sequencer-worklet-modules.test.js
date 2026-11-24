import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {formatSequencerSupport} from '../src/audio-timing-panel.js';

test('the worklet module graph evaluates without a DOM and publishes the sequencer on globalThis',async()=>{
 assert.equal(typeof globalThis.document,'undefined');
 assert.equal(typeof globalThis.window,'undefined');
 const {default:api,sequencerSelfTest}=await import('../src/sequencer-worklet-modules.js');
 assert.equal(globalThis.project6581Sequencer,api);
 assert.ok(Object.isFrozen(api));
 for(const name of ['arpStep','gameStep','drumStep','createTransportState','arpNotes','resolveNote','drumSequence','createNoteWriter','selfTest'])
  assert.equal(typeof api[name],'function',name);
 assert.deepEqual(sequencerSelfTest(),{ok:true});
});

test('every module the worklet probe imports avoids DOM and timer globals at load time',()=>{
 const seen=new Set(),queue=['sequencer-worklet-modules.js'];
 while(queue.length){
  const file=queue.shift();
  if(seen.has(file))continue;
  seen.add(file);
  const source=readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
  for(const [,dep] of source.matchAll(/from '\.\/([\w-]+\.js)\?v=__BUILD_ID__'/g))queue.push(dep);
  assert.doesNotMatch(source,/\bdocument\.|\bwindow\.|\blocalStorage\b|\bsetInterval\(|\bsetTimeout\(/,file);
 }
 assert.ok(seen.has('sequencer-steps.js')&&seen.has('transport-state.js')&&seen.has('western-scales.js'));
 assert.ok(seen.has('note-writes.js')&&seen.has('unison-sid-controller.js')&&seen.has('sid-registers.js'));
});

test('the diagnostics line describes each probe outcome',()=>{
 assert.match(formatSequencerSupport(null),/not reported/);
 assert.match(formatSequencerSupport({loadError:'SyntaxError: import'}),/failed to load \(SyntaxError: import\)/);
 assert.match(formatSequencerSupport({available:false}),/not available/);
 assert.match(formatSequencerSupport({available:true,selfTest:{ok:true}}),/ready \(self-test passed\)/);
 assert.match(formatSequencerSupport({available:true,selfTest:{ok:false,error:'arpStep: x'}}),/self-test failed \(arpStep: x\)/);
});
