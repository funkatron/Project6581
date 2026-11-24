import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Renders blocks whose size does not divide the 4,096-sample record buffer, so
// one block straddles a flush. Every frame must be captured once, in order.
function harness(blockFrames){
 let Processor;const messages=[];
 class Port{postMessage(message){messages.push(message)}}
 const scope=vm.createContext({AudioWorkletProcessor:class{port=new Port()},
  sampleRate:48000,currentFrame:0,registerProcessor(_name,constructor){Processor=constructor}});
 vm.runInContext(readFileSync(new URL('../src/residfp-worklet.js',import.meta.url),'utf8'),scope);
 const processor=new Processor();
 const memory={buffer:new ArrayBuffer(65536)};
 const pcm=new Int16Array(memory.buffer,0,blockFrames*2);
 processor.exports={sid_write(){},sid_render:n=>n,sid_pcm_ptr:()=>0,sid_reset(){},memory};
 let next=0;
 return {messages,
  send:data=>processor.port.onmessage({data}),
  render(){
   for(let i=0;i<blockFrames;i++){const value=next++%30000;pcm[i*2]=value;pcm[i*2+1]=value}
   processor.process([],[[new Float32Array(blockFrames)]]);
  }};
}

test('recording captures every frame when a block straddles a buffer flush',()=>{
 const blockFrames=100,blocks=50;
 const h=harness(blockFrames);
 h.send({type:'record-start'});
 for(let b=0;b<blocks;b++)h.render();
 h.send({type:'record-stop'});
 const recorded=h.messages.filter(m=>m.type==='record-chunk').flatMap(m=>Array.from(m.samples));
 assert.equal(recorded.length,blockFrames*blocks);
 recorded.forEach((value,index)=>assert.equal(value,index,'sample '+index));
});
