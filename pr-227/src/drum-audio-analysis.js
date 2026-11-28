import {stepMilliseconds} from './arp-composition.js?v=0.31.0+20261128T022520326Z';

/** Decode 16-bit PCM mono WAV produced by encodeWav (44-byte header). */
export function decodeWavMonoPcm(wavBytes){
 const view=new DataView(wavBytes.buffer??wavBytes,wavBytes.byteOffset??0,wavBytes.byteLength??wavBytes.length);
 const tag=(offset,len)=>String.fromCharCode(...new Uint8Array(view.buffer,view.byteOffset+offset,len));
 if(tag(0,4)!=='RIFF'||tag(8,4)!=='WAVE')throw new TypeError('Not a PCM WAV');
 const sampleRate=view.getUint32(24,true);
 const channels=view.getUint16(22,true);
 if(channels!==1)throw new RangeError('Expected mono WAV');
 const dataOffset=44;
 const bytes=view.byteLength-dataOffset;
 if(bytes<=0||bytes%2!==0)throw new RangeError('Invalid WAV data chunk');
 const samples=new Float32Array(bytes/2);
 for(let i=0;i<samples.length;i++){
  samples[i]=view.getInt16(dataOffset+i*2,true)/32768;
 }
 return {sampleRate,samples};
}

function measureWindow(slice){
 if(!slice.length)return {rms:0,lowRms:0,highRms:0,highToLow:0,lowDominance:0};
 let sumSq=0,lowSq=0;
 let smooth=0;
 const alpha=0.08;
 for(let i=0;i<slice.length;i++){
  const x=slice[i];
  smooth+=(alpha*(x-smooth));
  sumSq+=x*x;
  lowSq+=smooth*smooth;
 }
 const n=slice.length;
 const rms=Math.sqrt(sumSq/n);
 const lowRms=Math.sqrt(lowSq/n);
 const highSq=Math.max(0,sumSq-lowSq);
 const highRms=Math.sqrt(highSq/n);
 const highToLow=lowRms>1e-9?highRms/lowRms:highRms*1e9;
 const lowDominance=highRms>1e-9?lowRms/highRms:lowRms*1e9;
 return {rms,lowRms,highRms,highToLow,lowDominance};
}

/** Slice one or more bars into per-step RMS metrics. */
export function analyzeDrumStepWindows({samples,sampleRate,bpm,rate,steps=16,bars=1,skipFirstBar=false}){
 const stepMs=stepMilliseconds(bpm,rate);
 const stepSamples=Math.max(1,Math.round((sampleRate*stepMs)/1000));
 const totalSteps=steps*bars;
 const startStep=skipFirstBar?steps:0;
 const windows=[];
 for(let s=startStep;s<totalSteps;s++){
  const from=s*stepSamples;
  windows.push(measureWindow(samples.subarray(from,from+stepSamples)));
 }
 return {stepMs,stepSamples,windows};
}

/** Compare measured windows to a fixture profile JSON object. */
export function evaluateDrumAudioProfile({windows},profile){
 const failures=[];
 const active=windows.filter(w=>w.rms>=Number(profile.minRms??0));
 if(active.length<(profile.minActiveSteps??1))
  failures.push('active steps '+active.length+' < min '+profile.minActiveSteps);
 if(profile.maxActiveSteps!=null&&active.length>profile.maxActiveSteps)
  failures.push('active steps '+active.length+' > max '+profile.maxActiveSteps);
 if(active.length){
  const avgHighToLow=active.reduce((s,w)=>s+w.highToLow,0)/active.length;
  const avgLowDom=active.reduce((s,w)=>s+w.lowDominance,0)/active.length;
  if(profile.minHighToLowRatio!=null&&avgHighToLow<profile.minHighToLowRatio)
   failures.push('avg high/low '+avgHighToLow.toFixed(3)+' < '+profile.minHighToLowRatio);
  if(profile.maxHighToLowRatio!=null&&avgHighToLow>profile.maxHighToLowRatio)
   failures.push('avg high/low '+avgHighToLow.toFixed(3)+' > '+profile.maxHighToLowRatio);
  if(profile.maxLowDominanceRatio!=null&&avgLowDom>profile.maxLowDominanceRatio)
   failures.push('avg low dominance '+avgLowDom.toFixed(3)+' > '+profile.maxLowDominanceRatio);
 }
 return {
  pass:failures.length===0,
  failures,
  metrics:{activeSteps:active.length},
 };
}