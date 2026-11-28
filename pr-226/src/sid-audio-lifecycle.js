// A stalled browser close must not keep the loading UI pending forever.
// Callers must retain an unclosed context and refuse to create another one.
const closing=new WeakMap();
export function closeSidContext(context,timeoutMs=2000){
  if(closing.has(context))return closing.get(context);
  if(context.state==='closed')return Promise.resolve();
  const result=(async()=>{
    let timer;
    try{
      await Promise.race([
        context.close(),
        new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Audio context cleanup timed out; reload before retrying')),timeoutMs)})
      ]);
      if(context.state!=='closed')throw new Error('Audio context did not close; reload before retrying');
    }finally{clearTimeout(timer)}
  })();
  closing.set(context,result);
  return result;
}
