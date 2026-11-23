// Convert worklet first-energy timing into an estimated key → device output latency.
export function applyFirstEnergyTiming(audioTiming,event,context,now=performance.now()){
 if(!audioTiming||audioTiming.keyAt===null)return;
 if(event?.hit){
  const elapsed=now-audioTiming.keyAt;
  audioTiming.keyEnergyMs=elapsed;
  const blockFrames=Number.isFinite(event.frames)&&event.frames>0?event.frames:128;
  const sampleRate=Number.isFinite(event.sampleRate)&&event.sampleRate>0
   ?event.sampleRate
   :(context?.sampleRate??48000);
  const remainder=Number.isInteger(event.sampleOffset)&&event.sampleOffset>=0
   ?(blockFrames-event.sampleOffset)*1000/sampleRate
   :0;
  const outputMs=Number.isFinite(context?.outputLatency)
   ?context.outputLatency*1000
   :audioTiming.outputMs;
  audioTiming.keyBufferRemainderMs=remainder;
  audioTiming.keyToOutputEstimateMs=Number.isFinite(outputMs)?elapsed+remainder+outputMs:null;
  audioTiming.keyEnergyMissed=false;
 }else{
  audioTiming.keyEnergyMs=null;
  audioTiming.keyBufferRemainderMs=null;
  audioTiming.keyToOutputEstimateMs=null;
  audioTiming.keyEnergyMissed=true;
 }
 audioTiming.keyAt=null;
}