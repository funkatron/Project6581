import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const worklet=readFileSync(new URL('../src/residfp-worklet.js',import.meta.url),'utf8');
const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];

test('recording UI script compiles and exports a persistent link',()=>{
 assert.ok(script);
 const result=spawnSync(process.execPath,['--check','--input-type=module'],{input:script,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 assert.match(html,/id="recordFormat"/);
 assert.match(html,/id="recordToggle"/);
 assert.match(html,/id="recordDownload" hidden/);
 assert.match(script,/createSidRecorder\(audio\)/);
 assert.match(script,/await sidRecorder\.stop\(\)/);
 assert.match(script,/prepareRecordingDownload\(blob,extension,\$\('recordDownload'\)\)/);
 assert.match(script,/3\*60\*1000/);
});
test('WAV capture transfers SID renderer PCM, not microphone or synthesis impostors',()=>{
 const syntax=spawnSync(process.execPath,['--check'],{input:worklet,encoding:'utf8'});
 assert.equal(syntax.status,0,syntax.stderr);
 assert.match(worklet,/this\.port\.onmessage/);
 assert.match(worklet,/type:'record-start'/);
 assert.match(worklet,/type:'record-stop'/);
 assert.match(worklet,/this\.recordSamples\.set\(pcm\.subarray/);
 assert.match(worklet,/type:'record-chunk',samples/);
 assert.match(worklet,/type:'record-stopped'/);
 assert.doesNotMatch(html,/getUserMedia\(/);
});
