import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {loadSidWasm} from '../src/sid-wasm-cache.js';
import {createSidWriteBatcher} from '../src/sid-write-batcher.js';

const source=readFileSync(new URL('../src/create-residfp-audio.js',import.meta.url),'utf8')
  .replace(/^import .*;\n/gm,'').replace('export async function createReSidFpAudio','async function createReSidFpAudio');

test('concurrent audio factories share one WASM fetch and transfer independent buffers',async()=>{
  let fetches=0,compiles=0;
  const binary=new Uint8Array([0,97,115,109,1,0,0,0]).buffer;
  const load=url=>loadSidWasm(url,{
    fetchImpl:async()=>{fetches++;await Promise.resolve();return {ok:true,arrayBuffer:async()=>binary}},
    compile:async()=>{compiles++;return {}},imports:()=>[]
  });
  const nodes=[];
  class AudioWorkletNode{
    constructor(context){this.context=context;this.port={messages:[],postMessage:(message,transfers)=>{
      if(message.type==='load'){
        const received=structuredClone(message,{transfer:transfers});
        this.port.messages.push(received);
      }else this.port.messages.push(message);
    },close(){}};nodes.push(this)}
    connect(){} disconnect(){}
  }
  const context=()=>({resume:async()=>{},audioWorklet:{addModule:async()=>{}},destination:{},close:async()=>{}});
  const scope=vm.createContext({loadSidWasm:load,createSidWriteBatcher,closeSidContext:async c=>c.close(),
    AudioWorkletNode,AudioContext:class{},performance:{now:()=>0},setTimeout,clearTimeout});
  vm.runInContext(source+'\nthis.factory=createReSidFpAudio;',scope);
  const [a,b]=await Promise.all([
    scope.factory({model:6581,context:context()}),
    scope.factory({model:8580,context:context()})
  ]);
  assert.equal(fetches,1);
  assert.equal(compiles,1);
  assert.equal(nodes.length,2);
  const first=nodes[0].port.messages.find(m=>m.type==='load');
  const second=nodes[1].port.messages.find(m=>m.type==='load');
  assert.equal(first.model,6581);
  assert.equal(second.model,8580);
  assert.notStrictEqual(first.bytes,second.bytes);
  assert.deepEqual([...new Uint8Array(first.bytes)],[0,97,115,109,1,0,0,0]);
  assert.deepEqual([...new Uint8Array(second.bytes)],[0,97,115,109,1,0,0,0]);
  await Promise.all([a.close(),b.close()]);
});
