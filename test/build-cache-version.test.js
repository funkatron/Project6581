import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

test('build stamps matching lifecycle URLs in HTML and bridge, including transitive batching imports',()=>{
 const root=mkdtempSync(join(tmpdir(),'sid-stamp-'));
 try{
  mkdirSync(join(root,'scripts'));mkdirSync(join(root,'src'));
  for(const file of ['scripts/stamp-build.mjs','scripts/version-policy.mjs','package.json','index.html','src/create-residfp-audio.js','src/sid-studio.js','src/studio-bootstrap.js'])
   copyFileSync(new URL('../'+file,import.meta.url),join(root,file));
  const result=spawnSync(process.execPath,['scripts/stamp-build.mjs'],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const html=readFileSync(join(root,'index.html'),'utf8');
  const bridge=readFileSync(join(root,'src/create-residfp-audio.js'),'utf8');
  const studio=readFileSync(join(root,'src/sid-studio.js'),'utf8');
  const pageVersion=html.match(/studio-bootstrap\.js\?v=([^']+)/)[1];
  assert.equal(readFileSync(join(root,'src/studio-bootstrap.js'),'utf8').match(/sid-studio\.js\?v=([^']+)/)[1],pageVersion);
  assert.notEqual(pageVersion,'__BUILD_ID__');
  assert.equal(studio.match(/sid-audio-lifecycle\.js\?v=([^']+)/)[1],pageVersion);
  assert.equal(bridge.match(/sid-audio-lifecycle\.js\?v=([^']+)/)[1],pageVersion);
  assert.equal(bridge.match(/sid-write-batcher\.js\?v=([^']+)/)[1],pageVersion);
 }finally{rmSync(root,{recursive:true,force:true})}
});
