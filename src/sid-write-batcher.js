// Preserve SID register order while reducing AudioWorklet port messages.
export function createSidWriteBatcher(post,enqueue=queueMicrotask){
  let pending=[],scheduled=false,closed=false;
  const flush=()=>{
    scheduled=false;
    if(closed||!pending.length)return;
    const writes=pending;pending=[];
    post({type:'writes',writes});
  };
  return {
    write(register,value){
      if(closed)return;
      pending.push([register,value]);
      if(!scheduled){scheduled=true;enqueue(flush)}
    },
    flush,
    close(){closed=true;pending=[]}
  };
}
