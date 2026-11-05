import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSidWriteBatcher} from '../src/sid-write-batcher.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const code=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1]??'';
const bridge=readFileSync(new URL('../src/create-residfp-audio.js',import.meta.url),'utf8');
const worklet=readFileSync(new URL('../src/residfp-worklet.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/seq-ui.css',import.meta.url),'utf8');

test('immediate note-on flush preserves register ordering and does not double-post',()=>{
 const messages=[],jobs=[];
 const batch=createSidWriteBatcher(m=>messages.push(m),job=>jobs.push(job));
 batch.write(0,51);batch.write(1,7);batch.write(4,65);
 batch.flush();
 assert.deepEqual(messages,[{type:'writes',writes:[[0,51],[1,7],[4,65]]}]);
 assert.equal(jobs.length,1);
 jobs[0]();
 assert.equal(messages.length,1);
});

test('keyboard and Game Arp note-ons use the same immediate dispatch path',()=>{
 assert.match(code,/const token=sidController\.noteOn\(note,\(\)=>currentSidSettings\);/);
 assert.match(code,/sidAudio\?\.noteDispatched\?\.\(source\.startsWith\('key:'\)\?'keyboard':source\)/);
 assert.match(bridge,/noteDispatched\(source='keyboard'\)\{\s*batcher\.flush\(\)/);
 assert.match(bridge,/if\(now-lastProbeAt<500\)return/);
 assert.match(bridge,/node\.port\.postMessage\(\{type:'latency-probe',id\}\)/);
});

test('Worklet probe is acknowledged only after a render block',()=>{
 assert.match(worklet,/else if\(data\?\.type==='latency-probe'\)/);
 const renderAt=worklet.indexOf('if(e.sid_render(frames)!==frames)return true;');
 const replyAt=worklet.indexOf("this.port.postMessage({type:'latency-probe-result',id})");
 assert.ok(renderAt>=0&&replyAt>renderAt,'probe reply must follow sid_render');
 assert.match(worklet,/renderBudgetMs:frames\*1000\/sampleRate/);
 assert.match(worklet,/this\.renderMsTotal\+=elapsed/);
 assert.match(bridge,/dispatchToWorkletRoundTripMs:performance\.now\(\)-pending\.at/);
});

test('optional timing display is clearly labeled and never claims speaker latency',()=>{
 assert.match(html,/<details id="audioTimingDetails"><summary>Audio timing<\/summary>/);
 assert.match(html,/id="audioTimingReport"/);
 assert.match(code,/Screen recording A\/V sync can differ\./);
 assert.match(code,/Browser base\/output latency:/);
 assert.match(code,/if\(event\.type==='latency-probe'\)/);
 assert.match(code,/if\(event\.type==='audio-stats'\)/);
 assert.match(css,/#audioTimingReport\{position:absolute/);
});
