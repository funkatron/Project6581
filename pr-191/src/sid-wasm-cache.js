// Share one validated WASM download per build across SID engine instances.
// Transfer a copy to each AudioWorklet: transferring the cached buffer detaches it.
const cache = new Map();
export function loadSidWasm(url, {
  fetchImpl=fetch, compile=WebAssembly.compile, imports=WebAssembly.Module.imports,
  timeoutMs=12000, setTimer=setTimeout, clearTimer=clearTimeout,
  createController=()=>new AbortController()
} = {}) {
  if (cache.has(url)) return cache.get(url);
  const controller=createController();
  let timer;
  const work=(async()=>{
    const response=await fetchImpl(url,{cache:'no-store',signal:controller.signal});
    if(!response.ok)throw Error('reSIDfp WASM unavailable (build artifact not deployed)');
    const bytes=await response.arrayBuffer();
    const module=await compile(bytes);
    const unsupported=imports(module).filter(({module,name})=>
      module==='env'&&(/^(invoke_|dynCall_)/.test(name)));
    if(unsupported.length)throw Error('Downloaded WASM has unsupported imports: '+
      unsupported.map(x=>x.module+'.'+x.name).join(', ')+'. The deployed binary is incompatible.');
    return bytes;
  })();
  const timeout=new Promise((_,reject)=>{
    timer=setTimer(()=>{
      controller.abort();
      reject(new Error('SID engine preparation timed out; retry to reload'));
    },timeoutMs);
  });
  const pending=Promise.race([work,timeout]).finally(()=>clearTimer(timer));
  cache.set(url,pending);
  pending.catch(()=>{if(cache.get(url)===pending)cache.delete(url)});
  return pending;
}
