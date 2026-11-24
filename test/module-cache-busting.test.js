import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';

// A module imported both with and without ?v= loads as two separate instances,
// and the unversioned URL can be served stale after a deploy. stamp-build.mjs
// replaces __BUILD_ID__ in every src file, so every relative import must carry it.
test('every relative import in src carries the build cache-busting query',()=>{
 const unversioned=[];
 for(const path of readdirSync(new URL('../src/',import.meta.url),{recursive:true})){
  if(!path.endsWith('.js'))continue;
  const source=readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
  for(const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*)(['"])(\.\.?\/[^'"]+)\1/g)){
   if(!match[2].endsWith('?v=__BUILD_ID__'))unversioned.push(path+': '+match[2]);
  }
 }
 assert.deepEqual(unversioned,[]);
});
