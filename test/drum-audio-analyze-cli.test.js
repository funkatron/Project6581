import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {encodeWav} from '../src/wav-encoder.js';

test('drum-sequence-audition-analyze accepts manifest with synthetic ch-only wav',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'drum-audio-'));
 const sampleRate=48000;
 const stepSamples=6000;
 const chunks=[];
 for(let i=0;i<16;i++){
  const block=new Int16Array(stepSamples);
  for(let j=0;j<stepSamples;j++)block[j]=Math.round((Math.random()*2-1)*20000);
  chunks.push(block);
 }
 const wav=encodeWav(chunks,sampleRate);
 writeFileSync(path.join(dir,'ch-only-16.wav'),Buffer.from(wav));
 const manifest={
  fixtures:[{fixtureId:'ch-only-16',filename:'ch-only-16.wav',bpm:120,rate:4,bars:1}],
 };
 writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest));
 const out=execFileSync(
  process.execPath,
  ['scripts/drum-sequence-audition-analyze.mjs','--manifest',path.join(dir,'manifest.json')],
  {cwd:path.join(import.meta.dirname,'..'),encoding:'utf8'},
 );
 assert.match(out,/PASS ch-only-16/);
});