import {createSidWriteBatcher} from './sid-write-batcher.js';
// Preload on page load; unlock audio separately during a trusted user gesture.
export async function createReSidFpAudio({model=6581,onStatus=()=>{},onContext=()=>{},onProgress=()=>{}}={}){
  const context=new AudioContext({latencyHint:'interactive'});
  try {
    onContext(context);
    // Desktop browsers may permit autoplay. Never await this promise:
    // Safari can leave it pending until a trusted gesture occurs.
    void context.resume().catch(()=>{});
    const version=Date.now().toString(36);
    const deadline=async(promise,label)=>{
      let timer;
      try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+' timed out after 15 seconds')),15000)})])}
      finally{clearTimeout(timer)}
    };
    onProgress('Loading SID audio worklet…');
    await deadline(context.audioWorklet.addModule('./src/residfp-worklet.js?v='+version),'Audio worklet loading');
    onProgress('Downloading SID engine…');
    const response=await deadline(fetch('./dist/residfp.wasm?v='+version,{cache:'no-store'}),'SID engine download');
    if(!response.ok)throw Error('reSIDfp WASM unavailable (build artifact not deployed)');
    const bytes=await deadline(response.arrayBuffer(),'SID engine download');
    onProgress('Compiling SID engine…');
    const imports=WebAssembly.Module.imports(await deadline(WebAssembly.compile(bytes),'SID engine compilation'));
    const unsupported=imports.filter(({module,name})=>module==='env'&&/^invoke_|^dynCall_/.test(name));
    if(unsupported.length)throw Error('Downloaded WASM has unsupported imports: '+unsupported.map(x=>x.module+'.'+x.name).join(', ')+'. The deployed binary is incompatible.');
    onProgress('Initializing SID audio processor…');
    const node=new AudioWorkletNode(context,'residfp-processor',{outputChannelCount:[2]});
    node.connect(context.destination);
    let capture=null,stopResolve=null,stopReject=null;
    let probeId=0,lastProbeAt=-Infinity,timingEnabled=false;
    const pendingProbes=new Map();
    node.port.onmessage=({data})=>{
      if(data?.type==='latency-probe-result'){
        const pending=pendingProbes.get(data.id);
        pendingProbes.delete(data.id);
        if(pending)onStatus({
          type:'latency-probe',
          source:pending.source,
          dispatchToWorkletRoundTripMs:performance.now()-pending.at
        });
        return;
      }
      if(data?.type==='record-chunk'){
        capture?.(data.samples);return;
      }
      if(data?.type==='record-stopped'){
        capture=null;const done=stopResolve;stopResolve=null;stopReject=null;
        done?.();return;
      }
      if(data?.type==='record-started')return;
      onStatus(data);
    };
    node.port.postMessage({type:'load',bytes,model},[bytes]);
    const batcher=createSidWriteBatcher(message=>node.port.postMessage(message));
    return {context,node,
      write:(register,value)=>batcher.write(register,value),
      // Deliver each complete note-on register batch immediately, rather than
      // waiting for the next microtask. Probe at most twice per second.
      noteDispatched(source='keyboard'){
        batcher.flush();
        if(!timingEnabled)return;
        if(context.state!=='running')return;
        const now=performance.now();
        // Worklet stalls must not grow this map indefinitely. Expire old
        // requests and cap outstanding probes independently of acknowledgments.
        for(const [id,probe] of pendingProbes){
          if(now-probe.at>3000)pendingProbes.delete(id);
        }
        if(now-lastProbeAt<500||pendingProbes.size>=4)return;
        lastProbeAt=now;
        const id=++probeId;
        pendingProbes.set(id,{at:now,source});
        node.port.postMessage({type:'latency-probe',id});
      },
      setTimingEnabled(enabled){
        timingEnabled=Boolean(enabled);
        if(!timingEnabled)pendingProbes.clear();
        node.port.postMessage({type:'timing-enable',enabled:timingEnabled});
      },
      startWavCapture(onChunk){
        if(capture||stopResolve)throw new Error('A WAV capture is already active');
        if(typeof onChunk!=='function')throw new TypeError('Expected PCM callback');
        capture=onChunk;node.port.postMessage({type:'record-start'});
      },
      startM4aMonitor(){node.port.postMessage({type:'record-monitor-start'})},
      stopM4aMonitor(){node.port.postMessage({type:'record-monitor-stop'})},
      stopWavCapture(){
        if(!capture)return Promise.reject(new Error('WAV capture was not started'));
        if(stopResolve)return Promise.reject(new Error('WAV capture is already stopping'));
        return new Promise((resolve,reject)=>{
          stopResolve=resolve;stopReject=reject;
          node.port.postMessage({type:'record-stop'});
        });
      },
      close:async()=>{
        const reject=stopReject;capture=null;stopResolve=null;stopReject=null;
        reject?.(new Error('SID audio closed during WAV capture'));
        pendingProbes.clear();batcher.close();node.disconnect();await context.close()
      }};
  } catch(err){await context.close();throw err}
}
