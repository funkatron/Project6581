import {closeSidContext} from './sid-audio-lifecycle.js?v=__BUILD_ID__';
import {loadSidWasm} from './sid-wasm-cache.js?v=__BUILD_ID__';
import {createSidWriteBatcher} from './sid-write-batcher.js?v=__BUILD_ID__';
// Preload on page load; unlock audio separately during a trusted user gesture.
export async function createReSidFpAudio({model=6581,onStatus=()=>{},onContext=()=>{},onProgress=()=>{},eventLog=null,contextId=null,context=new AudioContext({latencyHint:'interactive'})}={}){
  let node=null,batcher=null,closed=false;
  const dispose=()=>{
    if(closed)return;
    closed=true;
    batcher?.close();
    if(node){node.port.onmessage=null;node.onprocessorerror=null;node.port.close();node.disconnect();eventLog?.add('sid-worklet-disconnected',{contextId,model})}
  };
  try {
    onContext(context);
    // Desktop browsers may permit autoplay. Never await this promise:
    // Safari can leave it pending until a trusted gesture occurs.
    void context.resume().catch(()=>{});
    const version='__BUILD_ID__';
    const deadline=async(promise,label)=>{
      let timer;
      try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+' timed out after 15 seconds')),15000)})])}
      finally{clearTimeout(timer)}
    };
    onProgress('Loading SID audio worklet…');
    await deadline(context.audioWorklet.addModule('./src/residfp-worklet.js?v='+version),'Audio worklet loading');
    onProgress('Preparing SID engine…');
    const bytes=await deadline(loadSidWasm('./dist/residfp.wasm?v='+version),'SID engine preparation');
    onProgress('Initializing SID audio processor…');
    node=new AudioWorkletNode(context,'residfp-processor',{outputChannelCount:[2]});
    node.connect(context.destination);
    eventLog?.add('sid-worklet-connected',{contextId,model});
    let capture=null,stopResolve=null,stopReject=null;
    let probeId=0,lastProbeAt=-Infinity,timingEnabled=false;
    const pendingProbes=new Map(),pendingEvents=new Map();
    let eventLogEnabled=false;
    node.onprocessorerror=()=>{if(!closed)onStatus({type:'error',message:'SID audio processor stopped unexpectedly'})};
    node.port.onmessage=({data})=>{
      if(closed)return;
      if(data?.type==='note-rendered'){
        if(!eventLogEnabled)return;
        const receivedAt=performance.now();
        for(const eventId of data.eventIds??[]){
          const dispatchedAt=pendingEvents.get(eventId);
          if(dispatchedAt===undefined)continue;
          pendingEvents.delete(eventId);
          eventLog?.add('render-acknowledged',{eventId,contextId,dispatchToAckMs:receivedAt-dispatchedAt,
            audioFrame:data.audioFrame,frames:data.frames,sampleRate:data.sampleRate,contextState:context.state});
        }
        return;
      }
      if(data?.type==='init-progress'){onProgress(data.message);return;}
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
      if(data?.type==='sid-first-render'){
        eventLog?.add('sid-first-render',{contextId,model,audioFrame:data.audioFrame,frames:data.frames,sampleRate:data.sampleRate});
        return;
      }
      if(data?.type==='wav-first-frame'){
        eventLog?.add('wav-first-frame',{contextId,audioFrame:data.audioFrame,sampleRate:data.sampleRate});
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
    const transferable=bytes.slice(0);
    node.port.postMessage({type:'load',bytes:transferable,model,traceFirstRender:eventLog?.enabled===true},[transferable]);
    batcher=createSidWriteBatcher(message=>{
      if(eventLogEnabled&&message.diagnostics){
        const now=performance.now();
        for(const [id,at] of pendingEvents){
          if(now-at>3000){pendingEvents.delete(id);eventLog?.add('ack-expired',{eventId:id})}
        }
        for(const tag of message.diagnostics){
          if(pendingEvents.size>=128){
            const oldest=pendingEvents.keys().next().value;pendingEvents.delete(oldest);
            eventLog?.add('ack-evicted',{eventId:oldest});
          }
          pendingEvents.set(tag.eventId,now);
          eventLog?.add('sid-dispatch',{eventId:tag.eventId,contextId,contextState:context.state,
            writes:message.writes.slice(tag.start,tag.end)});
        }
      }
      node.port.postMessage(message);
    });
    return {context,node,
      beginNoteTrace(){return eventLogEnabled?batcher.pendingCount:null},
      endNoteTrace(eventId,start){
        if(!eventLogEnabled||eventId===null||start===null)return;
        if(!batcher.tag(eventId,start))eventLog?.add('no-tagged-writes',{eventId});
      },
      setEventLogging(enabled){
        eventLogEnabled=Boolean(enabled);pendingEvents.clear();batcher.clearDiagnostics();
        node.port.postMessage({type:'event-log-enable',enabled:eventLogEnabled});
      },
      write:(register,value)=>batcher.write(register,value),
      startPitchEnvelope(slot,note,envelope){
        if(!Number.isInteger(slot)||slot<0||slot>=8||!Number.isFinite(note))return;
        const register=Math.floor(slot/3)*0x20+(slot%3)*7;
        // Flush the note-on frequency and gate before starting modulation.
        batcher.flush();
        const baseFrequency=Math.max(0,Math.min(65535,Math.round(440*2**((note-69)/12)*16777216/985248)));
        node.port.postMessage({type:'pitch-envelope-start',register,baseFrequency,
          points:envelope.points,interpolation:envelope.interpolation,end:envelope.end});
      },
      retunePitchEnvelope(slot,note){
        if(!Number.isInteger(slot)||slot<0||slot>=8||!Number.isFinite(note))return;
        const register=Math.floor(slot/3)*0x20+(slot%3)*7;
        const baseFrequency=Math.max(0,Math.min(65535,Math.round(440*2**((note-69)/12)*16777216/985248)));
        batcher.flush();
        node.port.postMessage({type:'pitch-envelope-retune',register,baseFrequency});
      },
      stopPitchEnvelope(slot){
        if(!Number.isInteger(slot)||slot<0||slot>=8)return;
        const register=Math.floor(slot/3)*0x20+(slot%3)*7;
        node.port.postMessage({type:'pitch-envelope-stop',register});
      },
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
        pendingProbes.clear();
        for(const eventId of pendingEvents.keys())eventLog?.add('engine-closed-before-ack',{eventId});
        pendingEvents.clear();dispose();await closeSidContext(context);
        eventLog?.add('sid-context-closed',{contextId,model})
      }};
  } catch(err){
    dispose();
    try{await closeSidContext(context)}catch(cleanup){throw new Error(err.message+'; '+cleanup.message,{cause:err})}
    throw err;
  }
}    onProgress('Loading cached SID engine…');
    const bytes=await deadline(loadSidWasm('./dist/residfp.wasm?v='+version),'SID engine download/compilation');
    if(closed)throw Error('SID engine closed before initialization');
    onProgress('Initializing SID audio processor…');
    node=new AudioWorkletNode(context,'residfp-processor',{outputChannelCount:[2]});
    node.connect(context.destination);
    eventLog?.add('sid-worklet-connected',{contextId,model});
    let capture=null,stopResolve=null,stopReject=null;
    let probeId=0,lastProbeAt=-Infinity,timingEnabled=false;
    const pendingProbes=new Map(),pendingEvents=new Map();
    let eventLogEnabled=false;
    node.onprocessorerror=()=>{if(!closed)onStatus({type:'error',message:'SID audio processor stopped unexpectedly'})};
    node.port.onmessage=({data})=>{
      if(closed)return;
      if(data?.type==='note-rendered'){
        if(!eventLogEnabled)return;
        const receivedAt=performance.now();
        for(const eventId of data.eventIds??[]){
          const dispatchedAt=pendingEvents.get(eventId);
          if(dispatchedAt===undefined)continue;
          pendingEvents.delete(eventId);
          eventLog?.add('render-acknowledged',{eventId,contextId,dispatchToAckMs:receivedAt-dispatchedAt,
            audioFrame:data.audioFrame,frames:data.frames,sampleRate:data.sampleRate,contextState:context.state});
        }
        return;
      }
      if(data?.type==='init-progress'){onProgress(data.message);return;}
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
      if(data?.type==='sid-first-render'){
        eventLog?.add('sid-first-render',{contextId,model,audioFrame:data.audioFrame,frames:data.frames,sampleRate:data.sampleRate});
        return;
      }
      if(data?.type==='wav-first-frame'){
        eventLog?.add('wav-first-frame',{contextId,audioFrame:data.audioFrame,sampleRate:data.sampleRate});
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
    node.port.postMessage({type:'load',bytes,model,traceFirstRender:eventLog?.enabled===true},[bytes]);
    batcher=createSidWriteBatcher(message=>{
      if(eventLogEnabled&&message.diagnostics){
        const now=performance.now();
        for(const [id,at] of pendingEvents){
          if(now-at>3000){pendingEvents.delete(id);eventLog?.add('ack-expired',{eventId:id})}
        }
        for(const tag of message.diagnostics){
          if(pendingEvents.size>=128){
            const oldest=pendingEvents.keys().next().value;pendingEvents.delete(oldest);
            eventLog?.add('ack-evicted',{eventId:oldest});
          }
          pendingEvents.set(tag.eventId,now);
          eventLog?.add('sid-dispatch',{eventId:tag.eventId,contextId,contextState:context.state,
            writes:message.writes.slice(tag.start,tag.end)});
        }
      }
      node.port.postMessage(message);
    });
    return {context,node,
      beginNoteTrace(){return eventLogEnabled?batcher.pendingCount:null},
      endNoteTrace(eventId,start){
        if(!eventLogEnabled||eventId===null||start===null)return;
        if(!batcher.tag(eventId,start))eventLog?.add('no-tagged-writes',{eventId});
      },
      setEventLogging(enabled){
        eventLogEnabled=Boolean(enabled);pendingEvents.clear();batcher.clearDiagnostics();
        node.port.postMessage({type:'event-log-enable',enabled:eventLogEnabled});
      },
      write:(register,value)=>batcher.write(register,value),
      startPitchEnvelope(slot,note,envelope){
        if(!Number.isInteger(slot)||slot<0||slot>=8||!Number.isFinite(note))return;
        const register=Math.floor(slot/3)*0x20+(slot%3)*7;
        // Flush the note-on frequency and gate before starting modulation.
        batcher.flush();
        const baseFrequency=Math.max(0,Math.min(65535,Math.round(440*2**((note-69)/12)*16777216/985248)));
        node.port.postMessage({type:'pitch-envelope-start',register,baseFrequency,
          points:envelope.points,interpolation:envelope.interpolation,end:envelope.end});
      },
      retunePitchEnvelope(slot,note){
        if(!Number.isInteger(slot)||slot<0||slot>=8||!Number.isFinite(note))return;
        const register=Math.floor(slot/3)*0x20+(slot%3)*7;
        const baseFrequency=Math.max(0,Math.min(65535,Math.round(440*2**((note-69)/12)*16777216/985248)));
        batcher.flush();
        node.port.postMessage({type:'pitch-envelope-retune',register,baseFrequency});
      },
      stopPitchEnvelope(slot){
        if(!Number.isInteger(slot)||slot<0||slot>=8)return;
        const register=Math.floor(slot/3)*0x20+(slot%3)*7;
        node.port.postMessage({type:'pitch-envelope-stop',register});
      },
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
        pendingProbes.clear();
        for(const eventId of pendingEvents.keys())eventLog?.add('engine-closed-before-ack',{eventId});
        pendingEvents.clear();dispose();await closeSidContext(context);
        eventLog?.add('sid-context-closed',{contextId,model})
      }};
  } catch(err){
    dispose();
    try{await closeSidContext(context)}catch(cleanup){throw new Error(err.message+'; '+cleanup.message,{cause:err})}
    throw err;
  }
}
