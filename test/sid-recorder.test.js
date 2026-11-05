import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeWav} from '../src/wav-encoder.js';
import {m4aMimeType,createSidRecorder} from '../src/sid-recorder.js';

test('WAV contains real mono 16-bit SID samples with a valid RIFF header',()=>{
 const bytes=encodeWav([new Int16Array([0,32767]),new Int16Array([-32768,1])],48000);
 const view=new DataView(bytes);
 const ascii=(at,len)=>String.fromCharCode(...new Uint8Array(bytes,at,len));
 assert.equal(ascii(0,4),'RIFF');
 assert.equal(view.getUint32(4,true),44);
 assert.equal(ascii(8,4),'WAVE');
 assert.equal(ascii(12,4),'fmt ');
 assert.equal(view.getUint16(20,true),1);
 assert.equal(view.getUint16(22,true),1);
 assert.equal(view.getUint32(24,true),48000);
 assert.equal(view.getUint32(28,true),96000);
 assert.equal(view.getUint16(34,true),16);
 assert.equal(ascii(36,4),'data');
 assert.equal(view.getUint32(40,true),8);
 assert.deepEqual([44,46,48,50].map(x=>view.getInt16(x,true)),[0,32767,-32768,1]);
});
test('invalid WAV rates and chunk formats cannot create a misleading file',()=>{
 assert.throws(()=>encodeWav([new Int16Array(1)],NaN),RangeError);
 assert.throws(()=>encodeWav([new Float32Array(1)],48000),TypeError);
 assert.throws(()=>encodeWav([],0),RangeError);
});
test('M4A availability is capability-based, without falsely exporting MP3',()=>{
 assert.equal(m4aMimeType({isTypeSupported:x=>x==='audio/mp4'}),'audio/mp4');
 assert.equal(m4aMimeType({isTypeSupported:x=>x==='audio/mp4;codecs=mp4a.40.2'}),'audio/mp4;codecs=mp4a.40.2');
 assert.equal(m4aMimeType({isTypeSupported:()=>false}),null);
 assert.equal(m4aMimeType(undefined),null);
});
test('WAV recording consumes only the SID worklet PCM stream',async()=>{
 let onChunk,stopCalls=0;
 const fake={
  context:{sampleRate:48000,state:'running'},
  startWavCapture(callback){onChunk=callback},
  async stopWavCapture(){stopCalls++;onChunk(new Int16Array([100,-100]))}
 };
 const recorder=createSidRecorder(fake,{MediaRecorderClass:null});
 assert.equal(recorder.supportsM4a,false);
 await recorder.start('wav');
 assert.equal(recorder.recording,true);
 const file=await recorder.stop();
 assert.equal(recorder.recording,false);
 assert.equal(file.extension,'wav');
 assert.equal(file.blob.type,'audio/wav');
 assert.equal(file.blob.size,48);
 assert.equal(stopCalls,1);
 assert.deepEqual([...new Int16Array(await file.blob.slice(44).arrayBuffer())],[100,-100]);
});
test('WAV recorder rejects unsupported M4A on browsers without an AAC recorder',async()=>{
 const recorder=createSidRecorder({context:{state:'running'}},{MediaRecorderClass:{isTypeSupported:()=>false}});
 await assert.rejects(()=>recorder.start('m4a'),/unavailable/);
});

test('native M4A captures SID stream, finalizes data, and releases destination',async()=>{
 const calls=[],tracks=[{stop(){calls.push('track-stop')}}];
 const stream={getTracks:()=>tracks};
 const destination={stream};
 const audio={
  context:{state:'running',createMediaStreamDestination(){calls.push('destination');return destination}},
  node:{
   connect(dest){assert.equal(dest,destination);calls.push('connect')},
   disconnect(dest){assert.equal(dest,destination);calls.push('disconnect')}
  },
  startM4aMonitor(){calls.push('monitor-start')},
  stopM4aMonitor(){calls.push('monitor-stop')}
 };
 class FakeMediaRecorder {
  static isTypeSupported(mime){return mime==='audio/mp4;codecs=mp4a.40.2'}
  constructor(incoming,options){
   assert.equal(incoming,stream);
   assert.equal(options.mimeType,'audio/mp4;codecs=mp4a.40.2');
   this.mimeType=options.mimeType;this.state='inactive';
   calls.push('construct');
  }
  start(period){assert.equal(period,1000);this.state='recording';calls.push('start')}
  stop(){
   this.state='inactive';calls.push('stop');
   this.ondataavailable({data:new Blob([new Uint8Array([0,1,2])],{type:this.mimeType})});
   this.ondataavailable({data:new Blob([new Uint8Array([3,4])],{type:this.mimeType})});
   this.onstop();
  }
 }
 const recorder=createSidRecorder(audio,{MediaRecorderClass:FakeMediaRecorder});
 assert.equal(recorder.supportsM4a,true);
 await recorder.start('m4a');
 assert.equal(recorder.recording,true);
 const saved=await recorder.stop();
 assert.equal(saved.extension,'m4a');
 assert.equal(saved.blob.type,'audio/mp4;codecs=mp4a.40.2');
 assert.deepEqual([...new Uint8Array(await saved.blob.arrayBuffer())],[0,1,2,3,4]);
 assert.equal(recorder.recording,false);
 assert.deepEqual(calls,['destination','construct','connect','start','monitor-start',
   'stop','monitor-stop','disconnect','track-stop']);
});

test('native M4A cleans up audio routing after recording fails',async()=>{
 const calls=[],stream={getTracks:()=>[{stop(){calls.push('track-stop')}}]};
 const destination={stream};
 const audio={
  context:{state:'running',createMediaStreamDestination(){return destination}},
  node:{connect(){calls.push('connect')},disconnect(){calls.push('disconnect')}},
  startM4aMonitor(){calls.push('monitor-start')},
  stopM4aMonitor(){calls.push('monitor-stop')}
 };
 class BadRecorder{
  static isTypeSupported(mime){return mime==='audio/mp4'}
  constructor(){this.state='inactive';this.mimeType='audio/mp4'}
  start(){this.state='recording'}
  stop(){
   this.state='inactive';
   this.onerror({error:new Error('Encoder stopped')});
  }
 }
 const recorder=createSidRecorder(audio,{MediaRecorderClass:BadRecorder});
 await recorder.start('m4a');
 await assert.rejects(()=>recorder.stop(),/Encoder stopped/);
 assert.equal(recorder.recording,false);
 assert.deepEqual(calls,['connect','monitor-start','monitor-stop','disconnect','track-stop']);
});
