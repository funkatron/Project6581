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
    let recorder;
    try{
     recorder=new MediaRecorderClass(destination.stream,{mimeType:availableM4a});
     audio.node.connect(destination);
     recorder.ondataavailable=event=>{if(event.data?.size)chunks.push(event.data)};
     recorder.start(1000);
    }catch(error){
     try{audio.node.disconnect(destination)}catch{}
     for(const track of destination.stream.getTracks())track.stop();
     throw error;
    }
    session={format,recorder,destination,chunks};return;
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
      const mime=recorder.mimeType||availableM4a;
      const data=new Blob(active.chunks,{type:mime});
      data.size?resolve(data):reject(new Error('No M4A audio was captured'));
     };
     try{recorder.stop()}catch(error){reject(error)}
    });
    return {blob,extension:'m4a'};
   }finally{
    if(active.destination){
     try{audio.node.disconnect(active.destination)}catch{}
     for(const track of active.destination.stream.getTracks())track.stop();
    }
    session=null;
   }
  }
 };
}

export function downloadRecording(blob,extension){
 const filename='project6581-'+new Date().toISOString().replace(/[:.]/g,'-')+'.'+extension;
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
 // iPad Safari may defer processing the tapped download until after click returns.
 setTimeout(()=>URL.revokeObjectURL(url),60000);
 return filename;
}
