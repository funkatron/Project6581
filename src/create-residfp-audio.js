// Invoke only after a user gesture on Safari (AudioContext unlock).
export async function createReSidFpAudio({model=6581,onStatus=()=>{}}={}){
  const context=new AudioContext();
  try {
    await context.audioWorklet.addModule('./src/residfp-worklet.js');
    const response=await fetch('./dist/residfp.wasm');
    if(!response.ok)throw Error('reSIDfp WASM unavailable (build artifact not deployed)');
    const bytes=await response.arrayBuffer();
    const node=new AudioWorkletNode(context,'residfp-processor',{outputChannelCount:[2]});
    node.connect(context.destination);
    node.port.onmessage=({data})=>onStatus(data);
    node.port.postMessage({type:'load',bytes,model},[bytes]);
    await context.resume();
    return {context,node,write:(register,value)=>node.port.postMessage({type:'write',register,value}),
      close:async()=>{node.disconnect();await context.close()}};
  } catch(err){await context.close();throw err}
}
