import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSidWasm} from '../src/sid-wasm-cache.js';

test('concurrent and repeated SID model loads reuse the validated binary', async () => {
  let fetches = 0, compilations = 0;
  const bytes = new Uint8Array([0,97,115,109,1,0,0,0]).buffer;
  const deps = {
    fetchImpl: async () => { fetches++; return {ok:true,arrayBuffer:async()=>bytes}; },
    compile: async () => { compilations++; return {}; },
    imports: () => []
  };
  const [first,second] = await Promise.all([
    loadSidWasm('test-concurrent.wasm',deps),
    loadSidWasm('test-concurrent.wasm',deps)
  ]);
  assert.strictEqual(first,second);
  assert.equal(await loadSidWasm('test-concurrent.wasm',deps),bytes);
  assert.equal(fetches,1);
  assert.equal(compilations,1);
});

test('failed WASM download is evicted and retried', async () => {
  let attempts = 0;
  const deps = {
    fetchImpl: async () => ({ok:++attempts > 1,arrayBuffer:async()=>new ArrayBuffer(8)}),
    compile: async () => ({}),
    imports: () => []
  };
  await assert.rejects(loadSidWasm('test-retry.wasm',deps),/unavailable/);
  await loadSidWasm('test-retry.wasm',deps);
  assert.equal(attempts,2);
});

test('rejects unsupported WASM imports', async () => {
  const deps = {
    fetchImpl: async () => ({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}),
    compile: async () => ({}),
    imports: () => [{module:'env',name:'invoke_ii'}]
  };
  await assert.rejects(loadSidWasm('test-imports.wasm',deps),/unsupported imports/);
});

test('stalled fetch times out, aborts, and next attempt refetches', async () => {
  let fetches=0, aborted=false, fireTimeout;
  const deps={
    fetchImpl:async (_url,{signal})=>{
      fetches++;
      if(fetches===1){signal.addEventListener('abort',()=>{aborted=true});return new Promise(()=>{});}
      return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};
    },
    compile:async()=>({}),imports:()=>[],
    setTimer:callback=>{fireTimeout=callback;return 1;},
    clearTimer:()=>{}
  };
  const first=loadSidWasm('test-timeout.wasm',deps);
  fireTimeout();
  await assert.rejects(first,/timed out/);
  assert.equal(aborted,true);
  await loadSidWasm('test-timeout.wasm',deps);
  assert.equal(fetches,2);
});

test('each audio processor can transfer a distinct copy of cached bytes', async () => {
  let fetches=0;
  const deps={
    fetchImpl:async()=>{fetches++;return {ok:true,arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer};},
    compile:async()=>({}),imports:()=>[]
  };
  const [a,b]=await Promise.all([loadSidWasm('test-transfer.wasm',deps),loadSidWasm('test-transfer.wasm',deps)]);
  const copy=a.slice(0);
  const first=structuredClone(copy,{transfer:[copy]});
  const second=b.slice(0);
  assert.deepEqual([...new Uint8Array(first)],[1,2,3]);
  assert.deepEqual([...new Uint8Array(second)],[1,2,3]);
  assert.equal(fetches,1);
});
