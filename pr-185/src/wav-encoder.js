// True 16-bit mono PCM WAV encoding from the SID renderer's output samples.
// No browser AudioContext or MediaRecorder dependency: easy to validate offline.
export function encodeWav(chunks,sampleRate){
 const rate=Number(sampleRate);
 if(!Number.isInteger(rate)||rate<8000||rate>192000)throw new RangeError('Invalid sample rate');
 if(!Array.isArray(chunks)||chunks.some(c=>!(c instanceof Int16Array)))
  throw new TypeError('Expected Int16Array PCM chunks');
 const frames=chunks.reduce((sum,c)=>sum+c.length,0);
 const bytes=frames*2;
 if(!Number.isSafeInteger(bytes)||bytes>0xFFFFFFFF-36)
  throw new RangeError('WAV exceeds RIFF size limit');
 const output=new ArrayBuffer(44+bytes),view=new DataView(output);
 const ascii=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i))};
 ascii(0,'RIFF');view.setUint32(4,36+bytes,true);ascii(8,'WAVE');
 ascii(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true); // PCM
 view.setUint16(22,1,true); // SID bridge output is mono, mirrored to both speakers
 view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);
 view.setUint16(32,2,true);view.setUint16(34,16,true);
 ascii(36,'data');view.setUint32(40,bytes,true);
 let index=44;
 for(const chunk of chunks)for(const sample of chunk){view.setInt16(index,sample,true);index+=2}
 return output;
}
