#!/usr/bin/env node
/**
 * Evaluate recorded drum WAVs against fixture profiles (Layer C analyze step).
 *
 *   node scripts/drum-sequence-audition-analyze.mjs --manifest artifacts/drum-audio/manifest.json
 */
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  decodeWavMonoPcm,
  analyzeDrumStepWindows,
  evaluateDrumAudioProfile,
} from '../src/drum-audio-analysis.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

function parseArgs(argv){
 let manifest=path.join(root,'artifacts/drum-audio/manifest.json');
 let failOnWarn=false;
 for(let i=2;i<argv.length;i++){
  const a=argv[i];
  if(a==='--manifest'&&argv[i+1])manifest=path.resolve(argv[++i]);
  else if(a==='--help'){
   console.log('Usage: node scripts/drum-sequence-audition-analyze.mjs [--manifest PATH]');
   process.exit(0);
  }
 }
 return {manifest,failOnWarn};
}

function loadProfile(fixtureId){
 const profilePath=path.join(root,'test/fixtures/drum-audio/profiles',fixtureId+'.json');
 if(!existsSync(profilePath))throw new Error('Missing profile '+profilePath);
 return JSON.parse(readFileSync(profilePath,'utf8'));
}

function main(){
 const {manifest}=parseArgs(process.argv);
 if(!existsSync(manifest))throw new Error('Manifest not found: '+manifest);
 const baseDir=path.dirname(manifest);
 const bundle=JSON.parse(readFileSync(manifest,'utf8'));
 let failed=0;
 for(const entry of bundle.fixtures??[]){
  const wavPath=path.join(baseDir,entry.filename);
  if(!existsSync(wavPath)){
   console.error('Missing',wavPath);
   failed++;
   continue;
  }
  const wav=readFileSync(wavPath);
  const {samples,sampleRate}=decodeWavMonoPcm(wav);
  const profile=loadProfile(entry.fixtureId);
  const bpm=entry.bpm??profile.bpm??120;
  const rate=entry.rate??profile.rate??4;
  const bars=entry.bars??profile.bars??1;
  const analysis=analyzeDrumStepWindows({
   samples,sampleRate,bpm,rate,bars,
   skipFirstBar:Boolean(profile.skipFirstBar),
  });
  const result=evaluateDrumAudioProfile(analysis,profile);
  const label=entry.fixtureId+': ';
  if(result.pass)console.log('PASS',label,result.metrics);
  else{
   console.error('FAIL',label,result.failures.join('; '));
   failed++;
  }
 }
 if(failed)process.exit(1);
 console.log('All',bundle.fixtures?.length??0,'fixtures passed.');
}

main();