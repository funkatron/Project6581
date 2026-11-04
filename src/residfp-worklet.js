// AudioWorklet using native libresidfp compiled to standalone WebAssembly.
// Receives the WASM bytes from the main thread; never fetches from the audio thread.
class ReSidFpProcessor extends AudioWorkletProcessor {
  constructor(){
    super();
    this.exports=null;
    this.queue=[];
    this.blocks=0;this.lastPeak=0;this.writes=0;
    this.recording=false;this.recordSamples=new Int16Array(4096);this.recordLength=0;
    this.port.onmessage=({data})=>{
      if(data?.type==='load')this.load(data.bytes,data.model??6581);
      else if(data?.type==='write')this.queue.push([data.register,data.value]);
      else if(data?.type==='writes'&&Array.isArray(data.writes))this.queue.push(...data.writes);
      else if(data?.type==='reset')this.exports?.sid_reset();
      else if(data?.type==='record-start'){
        this.recordLength=0;this.recording=true;
        this.port.postMessage({type:'record-started'});
      }else if(data?.type==='record-stop'){
        this.recording=false;this.flushRecording();
        this.port.postMessage({type:'record-stopped'});
      }
    };
  }
  async load(bytes,model){
    try{
      const wasi={fd_write:()=>0,fd_close:()=>0,fd_seek:()=>0,proc_exit:()=>0,environ_sizes_get:()=>0,environ_get:()=>0,args_sizes_get:()=>0,args_get:()=>0};
      const {instance}=await WebAssembly.instantiate(bytes,{wasi_snapshot_preview1:wasi,env:{}});
      const e=instance.exports;
      if(!e.memory || !e.sid_init || !e.sid_write || !e.sid_render || !e.sid_pcm_ptr)throw Error('Missing required WASM exports');
      e._initialize?.();
      if(!e.sid_init(model,sampleRate))throw Error('SID initialization failed at stage '+(e.sid_init_stage?.()??'unknown')+' (sample rate '+sampleRate+' Hz)');
      this.exports=e;
      this.port.postMessage({type:'ready',renderer:true});
    }catch(err){this.port.postMessage({type:'error',message:String(err)})}
  }
  // Transfer buffers every ~85 ms at 48 kHz, never posting one message per audio quantum.
  flushRecording(){
    if(this.recordLength===0)return;
    const samples=this.recordSamples.subarray(0,this.recordLength).slice();
    this.recordLength=0;
    this.port.postMessage({type:'record-chunk',samples},[samples.buffer]);
  }
  process(_inputs,outputs){
    const channels=outputs[0];
    for(const channel of channels)channel.fill(0);
    const e=this.exports;if(!e)return true;
    for(const [reg,value] of this.queue)e.sid_write(reg,value);
    this.writes+=this.queue.length;
    this.queue.length=0;
    const frames=channels[0].length;
    if(e.sid_render(frames)!==frames)return true;
    const ptr=e.sid_pcm_ptr();
    if(ptr<0 || ptr+frames*2>e.memory.buffer.byteLength){this.port.postMessage({type:'error',message:'Invalid PCM buffer'});this.exports=null;return true}
    const pcm=new Int16Array(e.memory.buffer,ptr,frames);
    if(this.recording){
      let consumed=0;
      while(consumed<frames){
        const copy=Math.min(frames-consumed,this.recordSamples.length-this.recordLength);
        this.recordSamples.set(pcm.subarray(consumed,consumed+copy),this.recordLength);
        this.recordLength+=copy;consumed+=copy;
        if(this.recordLength===this.recordSamples.length)this.flushRecording();
      }
    }
    let peak=0;
    for(let i=0;i<frames;i++){
      const value=pcm[i]/32768;
      peak=Math.max(peak,Math.abs(value));
      for(const channel of channels)channel[i]=value;
    }
    this.lastPeak=Math.max(this.lastPeak,peak);
    if(++this.blocks%128===0){
      this.port.postMessage({type:'audio-stats',peak:this.lastPeak,writes:this.writes,frames:frames*128});
      this.lastPeak=0;this.writes=0;
    }
    return true;
  }
}
registerProcessor('residfp-processor',ReSidFpProcessor);
