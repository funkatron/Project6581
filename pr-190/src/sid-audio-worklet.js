// AudioWorklet transport for the upcoming native reSIDfp WASM backend.
// Deliberately outputs silence until a real renderer is installed.
// A worklet must not masquerade as a cycle-accurate SID emulator.
class SidAudioProcessor extends AudioWorkletProcessor {
  constructor(){
    super();this.engine=null;this.pending=[];
    this.port.onmessage=({data})=>{
      if(data?.type==='install-engine'){
        // The engine adapter must implement write(register,value) and render(left,right,frames).
        // Structured clone cannot transfer functions; WASM initialization belongs in this worklet.
        this.port.postMessage({type:'error',message:'WASM renderer not bundled yet'});
      }else if(data?.type==='write'){
        if(Number.isInteger(data.register)&&data.register>=0&&data.register<=0x18&&Number.isInteger(data.value))
          this.pending.push([data.register,data.value&255]);
      }
    };
    this.port.postMessage({type:'ready',renderer:false});
  }
  process(_inputs,outputs){
    const output=outputs[0];
    for(const channel of output)channel.fill(0);
    if(!this.engine)return true;
    for(const [register,value] of this.pending)this.engine.write(register,value);
    this.pending.length=0;
    this.engine.render(output[0],output[1]??output[0],output[0].length);
    return true;
  }
}
registerProcessor('sid-audio-processor',SidAudioProcessor);
