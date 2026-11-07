import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function harness(){
 let Processor;const writes=[];
 const scope=vm.createContext({AudioWorkletProcessor:class{port={postMessage(){}}},
  sampleRate:48000,currentFrame:0,registerProcessor(_name,constructor){Processor=constructor}});
 vm.runInContext(readFileSync(new URL('../src/residfp-worklet.js',import.meta.url),'utf8'),scope);
 const processor=new Processor();
 processor.exports={sid_write:(reg,value)=>writes.push([reg,value]),sid_render:n=>n,
  sid_pcm_ptr:()=>0,sid_reset(){},memory:{buffer:new ArrayBuffer(4096)}};
 return {processor,writes,send:data=>processor.port.onmessage({data}),render:frame=>{
  scope.currentFrame=frame;
  processor.process([],[ [new Float32Array(128)] ]);
 }};
}
const sweep={type:'pitch-envelope-start',register:0,baseFrequency:1000,
 points:[{ms:0,semitones:12},{ms:100,semitones:0}],interpolation:'linear',end:'hold'};

test('worklet pitch envelope uses audio frame time and avoids duplicate register writes',()=>{
 const h=harness();h.send(sweep);
 h.render(0);assert.deepEqual(h.writes,[[0,208],[1,7]]); // 2000 = 0x07d0
 h.render(0);assert.equal(h.writes.length,2);
 h.render(2400);assert.equal(h.writes.length,4);
 assert.deepEqual(h.writes.slice(-2),[[0,134],[1,5]]); // round(1000*sqrt(2)) = 1414
 h.render(4800);assert.deepEqual(h.writes.slice(-2),[[0,232],[1,3]]);
});

test('disabled protocol leaves existing writes alone and reset cancels sweep',()=>{
 const h=harness();h.send({type:'pitch-envelope-start',...sweep,points:[{ms:1,semitones:12}]});
 h.send({type:'writes',writes:[[0,123],[1,4]]});h.render(0);
 assert.deepEqual(h.writes,[[0,123],[1,4]]);
 h.send(sweep);h.render(128);const before=h.writes.length;
 h.send({type:'reset'});h.render(256);assert.equal(h.writes.length,before);
});

test('stopping a voice cancels future pitch updates',()=>{
 const h=harness();h.send(sweep);h.render(0);
 h.send({type:'pitch-envelope-stop',register:0});h.render(2400);
 assert.equal(h.writes.length,2);
});

test('retuning changes base pitch without restarting the audio-frame envelope',()=>{
 const h=harness();h.send(sweep);h.render(0);
 h.send({type:'pitch-envelope-retune',register:0,baseFrequency:2000});
 h.render(2400);
 assert.deepEqual(h.writes.slice(-2),[[0,12],[1,11]]); // 2828 at 50 ms, not 4000 at a restarted 0 ms
 h.render(4800);assert.deepEqual(h.writes.slice(-2),[[0,208],[1,7]]);
});
