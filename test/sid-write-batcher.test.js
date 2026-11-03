import test from 'node:test';
import assert from 'node:assert/strict';
import {createSidWriteBatcher} from '../src/sid-write-batcher.js';

test('combines same-turn writes in order',()=>{
  const messages=[],jobs=[];
  const batch=createSidWriteBatcher(m=>messages.push(m),job=>jobs.push(job));
  batch.write(0,12);batch.write(1,34);batch.write(4,65);
  assert.equal(jobs.length,1);
  assert.deepEqual(messages,[]);
  jobs.shift()();
  assert.deepEqual(messages,[{type:'writes',writes:[[0,12],[1,34],[4,65]]}]);
});

test('subsequent writes schedule a new batch',()=>{
  const messages=[],jobs=[];
  const batch=createSidWriteBatcher(m=>messages.push(m),job=>jobs.push(job));
  batch.write(4,64);jobs.shift()();
  batch.write(4,65);jobs.shift()();
  assert.deepEqual(messages.map(m=>m.writes),[[[4,64]],[[4,65]]]);
});

test('close cancels pending messages and ignores later writes',()=>{
  const messages=[],jobs=[];
  const batch=createSidWriteBatcher(m=>messages.push(m),job=>jobs.push(job));
  batch.write(0,12);batch.close();batch.write(1,34);
  jobs.shift()();
  assert.deepEqual(messages,[]);
});
