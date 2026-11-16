import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeMasterPeak,mountMasterLoudnessMeter} from '../src/master-loudness-meter-ui.js';

test('normalizeMasterPeak clamps invalid input',()=>{
 assert.equal(normalizeMasterPeak(-1),0);
 assert.equal(normalizeMasterPeak(0.42),0.42);
 assert.equal(normalizeMasterPeak(Number.NaN),0);
});

test('master loudness meter updates fill width',()=>{
 const fill={style:{width:''}};
 const root={
  setAttribute(){},
  querySelector:()=>fill
 };
 const meter=mountMasterLoudnessMeter(id=>id==='masterLoudnessMeter'?root:null);
 meter.update(0.2);
 assert.notEqual(fill.style.width,'');
 assert.match(fill.style.width,/\d+\.\d%/);
});

test('status strip includes Plus/4 style master meter markup',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/id="masterLoudnessMeter"/);
 assert.match(html,/master-rainbow-meter-fill/);
});

test('worklet publishes mixed master peak with chip meter levels',()=>{
 const worklet=readFileSync(new URL('../src/residfp-worklet.js',import.meta.url),'utf8');
 assert.match(worklet,/masterPeakHold/);
 assert.match(worklet,/masterPeak:this\.masterPeakHold/);
});