import {encodeWav} from './wav-encoder.js';

// Safari typically records AAC in audio/mp4. MediaRecorder does not reliably
// produce MP3, so never label a different codec as .mp3.
export function m4aMimeType(MediaRecorderClass=globalThis.MediaRecorder){
 if(typeof MediaRecorderClass?.isTypeSupported!=='function')return null;
 for(const mime of ['audio/mp4;codecs=mp4a.40.2','audio/mp4'])
  if(MediaRecorderClass.isTypeSupported(mime))return mime;
 return null;
}

export function createSidRecorder(audio,{MediaRecorderClass=globalThis.MediaRecorder}={}){
 let session=null;
 const availableM4a=m4aMimeType(MediaRecorderClass);
 return {
  supportsM4a:Boolean(availableM4a),
  get recording(){return Boolean(session)},
  async start(format){
   if(session)throw new Error('A recording is already active');
   if(audio.context.state==='closed')throw new Error('SID audio is closed');
   if(format==='wav'){
    const chunks=[];
    const next={format,chunks,frames:0};
    audio.startWavCapture(samples=>{
     if(!(samples instanceof Int16Array))throw new TypeError('Invalid PCM chunk');
     next.chunks.push(samples);
     next.frames+=samples.length;
    });
    session=next;return;
   }
   if(format==='m4a'&&availableM4a){
    const destination=audio.context.createMediaStreamDestination();
    const chunks=[];
    // AudioWorklet enforces a 180-second audio-frame limit. Cap encoded chunks
    // independently in case Safari delays the main-thread stop message.
    const maxEncodedBytes=16*1024*1024;
    let encodedBytes=0,overflow=false;
    let recorder,monitorStarted=false;
    try{
     recorder=new MediaRecorderClass(destination.stream,{mimeType:availableM4a});
     audio.node.connect(destination);
     recorder.ondataavailable=event=>{
      if(!event.data?.size)return;
      encodedBytes+=event.data.size;
      if(encodedBytes>maxEncodedBytes){
       overflow=true;
       // Do not keep unbounded chunks if a browser delays finalization.
       if(recorder.state==='recording')recorder.stop();
       return;
      }
      chunks.push(event.data);
     };
     recorder.start(1000);
     audio.startM4aMonitor();
     monitorStarted=true;
    }catch(error){
     if(monitorStarted)audio.stopM4aMonitor();
     try{if(recorder?.state==='recording')recorder.stop()}catch{}
     try{audio.node.disconnect(destination)}catch{}
     for(const track of destination.stream.getTracks())track.stop();
     throw error;
    }
    session={format,recorder,destination,chunks,get overflow(){return overflow}};return;
   }
   throw new Error('The selected recording format is unavailable in this browser');
  },
  async stop(){
   if(!session)throw new Error('No recording is active');
   const active=session;
   // Stay busy until audio and container finalization finish.
   if(active.stopping)throw new Error('Recording is already stopping');
   active.stopping=true;
   try{
    if(active.format==='wav'){
     await audio.stopWavCapture();
     if(!active.frames)throw new Error('No SID audio samples were captured');
     return {blob:new Blob([encodeWav(active.chunks,audio.context.sampleRate)],{type:'audio/wav'}),extension:'wav'};
    }
    const blob=await new Promise((resolve,reject)=>{
     const recorder=active.recorder;
     recorder.onerror=event=>reject(event.error||new Error('M4A recording failed'));
     recorder.onstop=()=>{
      if(active.overflow){
       reject(new Error('M4A recording exceeded the safe file size limit'));
       return;
      }
      const mime=recorder.mimeType||availableM4a;
      const data=new Blob(active.chunks,{type:mime});
      data.size?resolve(data):reject(new Error('No M4A audio was captured'));
     };
     try{recorder.stop()}catch(error){reject(error)}
    });
    return {blob,extension:'m4a'};
   }finally{
    if(active.destination){
     audio.stopM4aMonitor();
     try{if(active.recorder?.state==='recording')active.recorder.stop()}catch{}
     try{audio.node.disconnect(active.destination)}catch{}
     for(const track of active.destination.stream.getTracks())track.stop();
    }
    session=null;
   }
  }
 };
}

export function prepareRecordingDownload(blob,extension,link){
 if(!link || typeof link.click!=='function')throw new TypeError('Expected a download link');
 const filename='project6581-'+new Date().toISOString().replace(/[:.]/g,'-')+'.'+extension;
 const url=URL.createObjectURL(blob);
 link.href=url;link.download=filename;link.hidden=false;
 link.textContent='Download '+extension.toUpperCase();
 // The persistent link is particularly useful on iPad Safari if the browser
 // declines an automatic download after async audio encoder finalization.
 link.click();
 return {filename,url};
}
