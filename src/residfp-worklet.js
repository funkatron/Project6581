// AudioWorklet using native libresidfp compiled to standalone WebAssembly.
// Receives the WASM bytes from the main thread; never fetches from the audio thread.
class ReSidFpProcessor extends AudioWorkletProcessor {
  constructor(){
    super();
    this.exports=null;
    this.traceFirstRender=false;
    this.queue=[];
    this.pitchEnvelopes=new Map();
    this.blocks=0;this.lastPeak=0;this.writes=0;
    this.chipPeakHold=[0,0,0];this.chipPeakInterval=[0,0,0];
    this.meterBlocks=0;
    this.mixedMeterGain=3;
    this.pendingNoteEvents=[];this.eventLogEnabled=false;
    this.pendingLatencyProbes=[];this.timingEnabled=false;
    this.energyArmed=false;this.energyBlocks=0;
    this.renderMsTotal=0;this.renderMsMax=0;this.timedRenderBlocks=0;
    this.recording=false;this.recordSamples=new Int16Array(4096);this.recordLength=0;
    // Audio-rendered frames, rather than throttled page timers, cap capture.
    this.monitorRecording=false;this.recordFrames=0;this.recordMaxFrames=0;
    this.modulationConfig=null;
    this.lfoPhase=[];
    this.port.onmessage=({data})=>{
      if(data?.type==='load'){
        this.traceFirstRender=data.traceFirstRender===true;
        this.load(data.bytes,data.model??6581);
      }
      else if(data?.type==='set-model'){
        this.switchModel(data.model);
      }
      else if(data?.type==='set-chip-model'){
        this.setChipModel(data.chip,data.model);
      }
      else if(data?.type==='set-pan'){
        if(Number.isInteger(data.chip)&&data.chip>=0&&data.chip<=2&&Number.isFinite(data.pan))
          this.exports?.sid_set_pan?.(data.chip,Math.round(data.pan));
      }
      else if(data?.type==='modulation-config'){
        this.modulationConfig=data;
        this.lfoPhase=Array.isArray(data.lfos)?data.lfos.map(()=>data.phaseOffset??0):[];
      }
      else if(data?.type==='event-log-enable'){
        this.eventLogEnabled=data.enabled===true;this.pendingNoteEvents.length=0;
      }
      else if(data?.type==='timing-enable'){
        this.timingEnabled=data.enabled===true;
        if(!this.timingEnabled){
          this.pendingLatencyProbes.length=0;
          this.energyArmed=false;
        }
      }
      else if(data?.type==='latency-probe'){
        if(this.timingEnabled&&Number.isInteger(data.id)&&this.pendingLatencyProbes.length<8)
          this.pendingLatencyProbes.push(data.id);
      }
      else if(data?.type==='write')this.queue.push([data.register,data.value]);
      else if(data?.type==='writes'&&Array.isArray(data.writes)){
        this.queue.push(...data.writes);
        if(this.eventLogEnabled&&Array.isArray(data.diagnostics)){
          for(const tag of data.diagnostics){
            if(this.pendingNoteEvents.length>=128)break;
            if(Number.isInteger(tag.eventId))this.pendingNoteEvents.push(tag.eventId);
          }
        }
      }
      else if(data?.type==='pitch-envelope-start'){
        // Explicit opt-in protocol. Existing note messages are unchanged.
        const {register,baseFrequency,points,interpolation='linear',end='hold'}=data;
        if(!Number.isInteger(register)||register<0||register>=0x60||register%0x20>0x14||register%0x20%7!==0||
          !Number.isInteger(baseFrequency)||baseFrequency<0||baseFrequency>65535||
          !Array.isArray(points)||points.length<1||points.length>16||
          !['linear','curve'].includes(interpolation)||!['hold','zero'].includes(end))return;
        let previous=-1;
        if(!points.every(p=>p&&typeof p==='object'&&!Array.isArray(p)&&Number.isFinite(p.ms)&&p.ms>=0&&p.ms<=10000&&p.ms>previous&&
          (previous=p.ms)>=0&&Number.isFinite(p.semitones)&&Math.abs(p.semitones)<=48)||points[0].ms!==0)return;
        this.pitchEnvelopes.set(register,{baseFrequency,points:points.map(p=>({ms:p.ms,semitones:p.semitones})),
          interpolation,end,startFrame:null,lastFrequency:null});
      }
      else if(data?.type==='pitch-envelope-retune'){
        const state=this.pitchEnvelopes.get(data.register);
        if(state&&Number.isInteger(data.baseFrequency)&&data.baseFrequency>=0&&data.baseFrequency<=65535){
          state.baseFrequency=data.baseFrequency;
          state.lastFrequency=null;
        }
      }
      else if(data?.type==='pitch-envelope-stop'){
        if(Number.isInteger(data.register))this.pitchEnvelopes.delete(data.register);
      }
      else if(data?.type==='reset'){
        this.pitchEnvelopes.clear();this.exports?.sid_reset();
      }
      else if(data?.type==='record-start'||data?.type==='record-monitor-start'){
        this.recordLength=0;
        this.recording=data.type==='record-start';
        this.monitorRecording=true;this.recordFrames=0;
        this.recordMaxFrames=Math.floor(sampleRate*180);
        this.port.postMessage({type:'record-started'});
      }else if(data?.type==='record-stop'||data?.type==='record-monitor-stop'){
        this.recording=false;this.monitorRecording=false;this.flushRecording();
        this.port.postMessage({type:'record-stopped'});
      }
    };
  }
  async load(bytes,model){
    const progress=message=>this.port.postMessage({type:'init-progress',message});
    try{
      progress('SID worklet received initialization.');
      const wasi={fd_write:()=>0,fd_close:()=>0,fd_seek:()=>0,proc_exit:()=>0,environ_sizes_get:()=>0,environ_get:()=>0,args_sizes_get:()=>0,args_get:()=>0};
      progress('Instantiating SID WebAssembly…');
      const {instance}=await WebAssembly.instantiate(bytes,{wasi_snapshot_preview1:wasi,env:{}});
      progress('SID WebAssembly instantiated.');
      const e=instance.exports;
      if(!e.memory || !e.sid_init || !e.sid_write || !e.sid_render || !e.sid_pcm_ptr)throw Error('Missing required WASM exports');
      progress('Initializing SID runtime…');
      e._initialize?.();
      progress('Initializing SID chip…');
      if(!e.sid_init(model,sampleRate)){
        let detail='';
        const ptr=e.sid_init_error?.();
        if(Number.isInteger(ptr)&&ptr>=0&&ptr<e.memory.buffer.byteLength){
          const bytes=new Uint8Array(e.memory.buffer,ptr,Math.min(255,e.memory.buffer.byteLength-ptr));
          for(const byte of bytes){if(byte===0)break;detail+=String.fromCharCode(byte)}
        }
        throw Error('SID initialization failed at stage '+(e.sid_init_stage?.()??'unknown')+' (sample rate '+sampleRate+' Hz)'+(detail?': '+detail:''));
      }
      this.exports=e;
      progress('SID chip initialized.');
      this.port.postMessage({type:'ready',renderer:true});
    }catch(err){this.port.postMessage({type:'error',message:String(err)})}
  }
  switchModel(model){
    const e=this.exports;
    try{
      if(!e?.sid_init)throw Error('SID engine is not ready');
      this.queue.length=0;
      this.pitchEnvelopes.clear();
      e.sid_reset?.();
      if(!e.sid_init(model,sampleRate)){
        throw Error('SID model switch failed at stage '+(e.sid_init_stage?.()??'unknown'));
      }
      this.port.postMessage({type:'model-ready',model});
    }catch(err){this.port.postMessage({type:'error',message:String(err)})}
  }
  setChipModel(chip,model){
    const e=this.exports;
    try{
      if(!e?.sid_set_chip_model)throw Error('Per-chip model switch is unavailable');
      if(!Number.isInteger(chip)||chip<0||chip>2)throw Error('Invalid chip index');
      if(!e.sid_set_chip_model(chip,model))throw Error('SID chip model switch failed');
      this.port.postMessage({type:'chip-model-ready',chip,model});
    }catch(err){this.port.postMessage({type:'error',message:String(err)})}
  }
  lfoWaveValue(wave,phase,seed=0){
    const p=phase-Math.floor(phase);
    if(wave==='sine')return Math.sin(2*Math.PI*p);
    if(wave==='triangle')return 1-4*Math.abs(p-0.5);
    if(wave==='sawtooth')return 2*p-1;
    if(wave==='square')return p<0.5?1:-1;
    if(wave==='sample-hold'){
      const n=Math.sin((Math.floor(phase)+seed+1)*127.1)*43758.5453;
      return 2*(n-Math.floor(n))-1;
    }
    return 0;
  }
  syncedLfoHz(bpm,division){
    const safe=Number.isFinite(bpm)&&bpm>=40&&bpm<=240?bpm:120;
    return safe/240*Number(division);
  }
  applyAudioClockModulation(){
    const config=this.modulationConfig;
    const e=this.exports;
    if(!config||!e?.sid_write||!Array.isArray(config.engines))return;
    const blockSec=(128/sampleRate);
    const targets={volume:[0,100],cutoff:[50,10000],resonance:[0,100]};
    config.lfos.forEach((lfo,index)=>{
      const rate=lfo.sync?this.syncedLfoHz(config.bpm,lfo.syncDivision):(Number(lfo.rate)||0);
      const phase=this.lfoPhase[index]??0;
      this.lfoPhase[index]=phase+rate*blockSec;
    });
    for(let chip=0;chip<3;chip++){
      const engine=config.engines[chip];
      if(!engine?.enabled)continue;
      const base={
        volume:Number(engine.filter.volume),
        cutoff:Number(engine.filter.cutoff),
        resonance:Number(engine.filter.resonance)
      };
      const offsets={};
      for(const [lfoIndex,lfo] of config.lfos.entries()){
        if(!lfo.enabled||!lfo.depth||!targets[lfo.target])continue;
        const engineTarget=lfo.engines??'all';
        if(engineTarget!=='all'&&Number(engineTarget)!==chip+1)continue;
        const [min,max]=targets[lfo.target];
        const depth=Math.max(0,Math.min(1,Number(lfo.depth)||0));
        const rate=lfo.sync?this.syncedLfoHz(config.bpm,lfo.syncDivision):(Number(lfo.rate)||0);
        const offset=this.lfoWaveValue(lfo.wave,(this.lfoPhase[lfoIndex]??0)+(lfo.phase??0),lfo.seed??0)*depth*(max-min)/2;
        offsets[lfo.target]=(offsets[lfo.target]??0)+offset;
      }
      const values={...base};
      for(const [target,offset] of Object.entries(offsets)){
        const [min,max]=targets[target];
        values[target]=Math.max(min,Math.min(max,values[target]+offset));
      }
      const fc=Math.round(Math.max(0,Math.min(1,(values.cutoff-50)/9950))*2047);
      const resonance=Math.round(values.resonance*15/100);
      const volume=Math.round(values.volume*15/100);
      const modes={lowpass:0x10,bandpass:0x20,highpass:0x40};
      const modeBits=modes[engine.filter.mode]??0x10;
      const baseReg=chip*0x20;
      e.sid_write(baseReg+0x15,fc&7);
      e.sid_write(baseReg+0x16,fc>>3);
      e.sid_write(baseReg+0x17,(resonance<<4)|7);
      e.sid_write(baseReg+0x18,modeBits|(volume&15));
    }
    if(this.blocks%16===0){
      this.port.postMessage({type:'modulation-display',engines:config.engines.map((engine,chip)=>({
        chip,filter:{...engine.filter}
      })),lfoPhase:[...this.lfoPhase]});
    }
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
    this.applyAudioClockModulation();
    const queuedWrites=this.queue.length;
    for(const [reg,value] of this.queue)e.sid_write(reg,value);
    this.writes+=this.queue.length;
    this.queue.length=0;
    if(this.timingEnabled&&queuedWrites>0){
      this.energyArmed=true;this.energyBlocks=0;
    }
    // Frequency updates occur at render-block boundaries, using the audio frame
    // clock. Max scheduling granularity is one render quantum (128 frames).
    for(const [register,state] of this.pitchEnvelopes){
      if(state.startFrame===null)state.startFrame=currentFrame;
      const ms=(currentFrame-state.startFrame)*1000/sampleRate;
      const points=state.points;
      let semitones=points[0].semitones;
      if(ms>=points[points.length-1].ms){
        semitones=state.end==='zero'?0:points[points.length-1].semitones;
      }else{
        for(let i=1;i<points.length;i++){
          if(ms<=points[i].ms){
            const a=points[i-1],b=points[i];let t=(ms-a.ms)/(b.ms-a.ms);
            if(state.interpolation==='curve')t=t*t*(3-2*t);
            semitones=a.semitones+(b.semitones-a.semitones)*t;
            break;
          }
        }
      }
      const frequency=Math.max(0,Math.min(65535,Math.round(state.baseFrequency*2**(semitones/12))));
      if(frequency!==state.lastFrequency){
        e.sid_write(register,frequency&255);e.sid_write(register+1,frequency>>8);
        state.lastFrequency=frequency;this.writes+=2;
      }
    }
    const frames=channels[0].length;
    // Optional worklet performance timing: browsers may not expose
    // performance.now() in AudioWorkletGlobalScope. Never depend on it for audio.
    const clock=this.timingEnabled&&typeof performance!=='undefined'&&typeof performance.now==='function';
    const started=clock?performance.now():null;
    if(e.sid_render(frames)!==frames)return true;
    if(started!==null){
      const elapsed=performance.now()-started;
      this.renderMsTotal+=elapsed;
      this.renderMsMax=Math.max(this.renderMsMax,elapsed);
      this.timedRenderBlocks++;
    }
    if(this.pendingLatencyProbes.length){
      for(const id of this.pendingLatencyProbes)this.port.postMessage({type:'latency-probe-result',id});
      this.pendingLatencyProbes.length=0;
    }
    const ptr=e.sid_pcm_ptr();
    if(ptr<0 || ptr+frames*2>e.memory.buffer.byteLength){this.port.postMessage({type:'error',message:'Invalid PCM buffer'});this.exports=null;return true}
    const stereo=e.memory.buffer.byteLength>=ptr+frames*4;
    const pcm=stereo?new Int16Array(e.memory.buffer,ptr,frames*2):new Int16Array(e.memory.buffer,ptr,frames);
    if(this.monitorRecording){
      const allowed=Math.min(frames,Math.max(0,this.recordMaxFrames-this.recordFrames));
      if(this.recording){
        if(this.eventLogEnabled&&allowed>0&&this.recordFrames===0){
          this.port.postMessage({type:'wav-first-frame',audioFrame:currentFrame,sampleRate});
        }
        let consumed=0;
        while(consumed<allowed){
          const copy=Math.min(allowed-consumed,this.recordSamples.length-this.recordLength);
          for(let i=0;i<copy;i++){
            const mono=stereo?(pcm[i*2]+pcm[i*2+1])/2:pcm[i];
            this.recordSamples[this.recordLength+i]=mono;
          }
          this.recordLength+=copy;consumed+=copy;
          if(this.recordLength===this.recordSamples.length)this.flushRecording();
        }
      }
      this.recordFrames+=allowed;
      if(this.recordFrames>=this.recordMaxFrames){
        this.recording=false;this.monitorRecording=false;this.flushRecording();
        this.port.postMessage({type:'record-limit'});
      }
    }
    let peak=0;
    let chipPeaks=null;
    const peaksPtr=e.sid_chip_peaks_ptr?.();
    if(Number.isInteger(peaksPtr)&&peaksPtr>=0&&peaksPtr+12<=e.memory.buffer.byteLength)
      chipPeaks=Array.from(new Float32Array(e.memory.buffer,peaksPtr,3));
    for(let i=0;i<frames;i++){
      const left=stereo?pcm[i*2]/32768:pcm[i]/32768;
      const right=stereo?pcm[i*2+1]/32768:left;
      const value=Math.max(Math.abs(left),Math.abs(right));
      peak=Math.max(peak,value);
      if(channels[0])channels[0][i]=left;
      if(channels[1])channels[1][i]=right;
    }
    if(this.traceFirstRender){
      this.traceFirstRender=false;
      this.port.postMessage({type:'sid-first-render',audioFrame:currentFrame,frames,sampleRate});
    }
    if(this.eventLogEnabled&&this.pendingNoteEvents.length){
      // One bounded acknowledgment per block with tagged events, never console logging.
      this.port.postMessage({type:'note-rendered',eventIds:this.pendingNoteEvents,
        audioFrame:typeof currentFrame==='number'?currentFrame:null,frames,sampleRate});
      this.pendingNoteEvents=[];
    }
    if(this.energyArmed){
      this.energyBlocks++;
      let sampleOffset=-1;
      for(let i=0;i<frames;i++){
        const sample=stereo?Math.max(Math.abs(pcm[i*2]),Math.abs(pcm[i*2+1])):Math.abs(pcm[i]);
        if(sample>655){sampleOffset=i;break}
      }
      if(sampleOffset>=0||this.energyBlocks>=16){
        this.port.postMessage({type:'first-energy',hit:sampleOffset>=0,sampleOffset,blocks:this.energyBlocks,sampleRate,frames});
        this.energyArmed=false;
      }
    }
    this.lastPeak=Math.max(this.lastPeak,peak);
    let blockPeaks=null;
    if(Array.isArray(chipPeaks))blockPeaks=chipPeaks;
    else{
      const estimate=Math.min(1,peak*this.mixedMeterGain);
      blockPeaks=[estimate,estimate,estimate];
    }
    for(let i=0;i<3;i++){
      const sample=blockPeaks[i]||0;
      this.chipPeakHold[i]=Math.max(this.chipPeakHold[i],sample);
      this.chipPeakInterval[i]=Math.max(this.chipPeakInterval[i],sample);
    }
    if(++this.meterBlocks%16===0){
      this.port.postMessage({type:'meter-levels',chipPeaks:[...this.chipPeakHold]});
      this.chipPeakHold=[0,0,0];
    }
    if(++this.blocks%128===0){
      this.port.postMessage({
        type:'audio-stats',peak:this.lastPeak,chipPeaks:[...this.chipPeakInterval],writes:this.writes,frames:frames*128,
        renderAvgMs:this.timedRenderBlocks?this.renderMsTotal/this.timedRenderBlocks:null,
        renderMaxMs:this.timedRenderBlocks?this.renderMsMax:null,
        renderBudgetMs:frames*1000/sampleRate
      });
      this.lastPeak=0;this.writes=0;
      this.chipPeakInterval=[0,0,0];
      this.renderMsTotal=0;this.renderMsMax=0;this.timedRenderBlocks=0;
    }
    return true;
  }
}
registerProcessor('residfp-processor',ReSidFpProcessor);
