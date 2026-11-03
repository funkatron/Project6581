// AudioWorklet using native libresidfp compiled to standalone WebAssembly.
// Receives the WASM bytes from the main thread; never fetches from the audio thread.
class ReSidFpProcessor extends AudioWorkletProcessor {
  constructor(){
    super();
    this.exports=null;
    this.queue=[];
    this.port.onmessage=({data})=>{
      if(data?.type==='load')this.load(data.bytes,data.model??6581);
      else if(data?.type==='write')this.queue.push([data.register,data.value]);
      else if(data?.type==='reset')this.exports?.sid_reset();
    };
  }
  async load(bytes,model){
    try{
      const wasi={fd_write:()=>0,fd_close:()=>0,fd_seek:()=>0,proc_exit:()=>0,environ_sizes_get:()=>0,environ_get:()=>0,args_sizes_get:()=>0,args_get:()=>0};
      const {instance}=await WebAssembly.instantiate(bytes,{wasi_snapshot_preview1:wasi,env:{}});
      const e=instance.exports;
      if(!e.memory || !e.sid_init || !e.sid_write || !e.sid_render || !e.sid_pcm_ptr)throw Error('Missing required WASM exports');
      e._initialize?.();
      if(!e.sid_init(model,sampleRate))throw Error('SID initialization failed');
      this.exports=e;
      this.port.postMessage({type:'ready',renderer:true});
    }catch(err){this.port.postMessage({type:'error',message:String(err)})}
  }
  process(_inputs,outputs){
    const channels=outputs[0];
    for(const channel of channels)channel.fill(0);
    const e=this.exports;if(!e)return true;
    for(const [reg,value] of this.queue)e.sid_write(reg,value);
    this.queue.length=0;
    const frames=channels[0].length;
    if(e.sid_render(frames)!==frames)return true;
    const ptr=e.sid_pcm_ptr();
    if(ptr<0 || ptr+frames*2>e.memory.buffer.byteLength){this.port.postMessage({type:'error',message:'Invalid PCM buffer'});this.exports=null;return true}
    const pcm=new Int16Array(e.memory.buffer,ptr,frames);
    for(let i=0;i<frames;i++)for(const channel of channels)channel[i]=pcm[i]/32768;
    return true;
  }
}
registerProcessor('residfp-processor',ReSidFpProcessor);
