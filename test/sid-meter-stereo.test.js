import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chipPanStereoPeaks} from '../src/sid-meter-display.js';

test('chipPanStereoPeaks honors pan when splitting mono chip telemetry',()=>{
 const center=chipPanStereoPeaks(0.13,0);
 assert.ok(Math.abs(center.left-center.right)<0.002);
 const hardLeft=chipPanStereoPeaks(0.13,-100);
 assert.ok(hardLeft.left>hardLeft.right);
 const hardRight=chipPanStereoPeaks(0.13,100);
 assert.ok(hardRight.right>hardRight.left);
 assert.equal(chipPanStereoPeaks(0,40).left,0);
});

test('worklet includes drum chip in meter hold arrays',()=>{
 const worklet=readFileSync(new URL('../src/residfp-worklet.js',import.meta.url),'utf8');
 assert.match(worklet,/chipPeakHold=\[0,0,0,0\]/);
 assert.match(worklet,/for\(let i=0;i<chipCount;i\+\+\)/);
 assert.doesNotMatch(worklet,/for\(let i=0;i<3;i\+\+\)/);
});

test('SID 4 engine card uses stereo meter markup',()=>{
 const ui=readFileSync(new URL('../src/sid-engine-panels-ui.js',import.meta.url),'utf8');
 assert.match(ui,/renderStereoChipMeter/);
 assert.match(ui,/sid-stereo-meter--stacked/);
});