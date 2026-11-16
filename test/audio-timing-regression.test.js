import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSidWriteBatcher} from '../src/sid-write-batcher.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const code=readFileSync(new URL('../src/sid-studio.js',import.meta.url),'utf8');
const timingPanel=readFileSync(new URL('../src/audio-timing-panel.js',import.meta.url),'utf8');
const bootstrap=readFileSync(new URL('../src/studio-bootstrap.js',import.meta.url),'utf8');
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
 assert.match(code,/const token=sidController\.noteOn\(note,voiceSettingsForSlot,\{chipMask,layerChip\}\)/);
 assert.match(code,/sidAudio\?\.noteDispatched\?\.\(ownerKey\.startsWith\('key:'\)\?'keyboard':ownerKey\.split\('@'\)\[0\]\)/);
 assert.match(code,/function playOne\(note,ownerKey,chipMask,\{layer=false\}/);
 assert.match(bridge,/noteDispatched\(source='keyboard'\)\{\s*batcher\.flush\(\)/);
 assert.match(bridge,/if\(now-lastProbeAt<500\|\|pendingProbes\.size>=4\)\{/);
 assert.match(bridge,/onStatus\(\{type:'latency-probe-skipped',source\}\)/);
 assert.match(bridge,/if\(now-probe\.at>3000\)pendingProbes\.delete\(id\)/);
 assert.match(bridge,/if\(context\.state!=='running'\)return/);
 assert.match(bridge,/node\.port\.postMessage\(\{type:'latency-probe',id\}\)/);
});

test('Worklet probe is acknowledged only after a render block',()=>{
 assert.match(worklet,/else if\(data\?\.type==='latency-probe'\)/);
 const renderAt=worklet.indexOf('if(e.sid_render(frames)!==frames)return true;');
 const replyAt=worklet.indexOf("this.port.postMessage({type:'latency-probe-result',id})");
 const energyAt=worklet.indexOf("this.port.postMessage({type:'first-energy'");
 assert.ok(renderAt>=0&&replyAt>renderAt,'probe reply must follow sid_render');
 assert.ok(energyAt>renderAt,'first loud sample is measured after sid_render');
 assert.match(worklet,/first-energy',hit:sampleOffset>=0,sampleOffset,blocks:this\.energyBlocks,sampleRate,frames/);
 assert.match(worklet,/if\(\(this\.keyLatencyEnabled\|\|this\.timingEnabled\)&&queuedWrites>0\)/);
 assert.match(worklet,/renderBudgetMs:frames\*1000\/sampleRate/);
 assert.match(worklet,/this\.renderMsTotal\+=elapsed/);
 assert.match(bridge,/dispatchToWorkletRoundTripMs:performance\.now\(\)-pending\.at/);
});

test('timing panel stays honest about limits; footer shows touch to output estimate',()=>{
 assert.match(html,/<details id="audioTimingDetails"><summary>Audio timing<\/summary>/);
 assert.match(html,/id="audioTimingReport"/);
 assert.match(timingPanel,/Key → loud PCM in worklet:/);
 assert.match(timingPanel,/Estimated key → device output:/);
 assert.match(timingPanel,/Main thread ↔ worklet control ping/);
 assert.match(timingPanel,/This note kept the previous acknowledgment/);
 assert.match(timingPanel,/Screen recording A\/V sync can differ\./);
 assert.match(timingPanel,/Browser base\/output latency:/);
 assert.match(html,/import \{bootSidStudio\} from '\.\/src\/studio-bootstrap\.js\?v=__BUILD_ID__';/);
 assert.match(html,/bootSidStudio\(\);/);
 assert.match(bootstrap,/import \{startSidStudio\} from '\.\/sid-studio\.js/);
 assert.match(code,/if\(event\.type==='latency-probe'\)/);
 assert.match(code,/if\(event\.type==='audio-stats'\)/);
 assert.match(css,/#audioTimingReport\{position:absolute/);
});

test('touch-to-output measurement runs without opening the timing panel',()=>{
 assert.match(worklet,/this\.keyLatencyEnabled=true/);
 assert.match(worklet,/key-latency-measure/);
 assert.match(worklet,/this\.keyLatencyEnabled\|\|this\.timingEnabled/);
 assert.match(bridge,/setKeyLatencyMeasureEnabled/);
 assert.match(code,/setKeyLatencyMeasureEnabled\(true\)/);
});

test('control ping and render stats stay off unless the timing panel is open',()=>{
 assert.match(bridge,/let probeId=0,lastProbeAt=-Infinity,timingEnabled=false/);
 assert.match(bridge,/batcher\.flush\(\);\s*if\(!timingEnabled\)return/);
 assert.match(bridge,/setTimingEnabled\(enabled\)\{/);
 assert.match(worklet,/this\.pendingLatencyProbes=\[\];this\.timingEnabled=false/);
 assert.match(worklet,/const clock=this\.timingEnabled&&typeof performance/);
 assert.match(timingPanel,/audioTimingDetails'\)\.addEventListener\('toggle'/);
 assert.match(timingPanel,/setTimingEnabled\?\.\(\$\('audioTimingDetails'\)\.open\)/);
 assert.match(timingPanel,/formatPlaybackLatencyStatus/);
 assert.match(html,/Touch → output:/);
});

test('optional timing control is reachable on narrow screens',()=>{
 assert.match(css,/footer #buildInfo\{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\}/);
 assert.match(css,/#audioTimingDetails\{[^}]*flex:none/);
});
