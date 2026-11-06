// Preserve SID register order while reducing AudioWorklet port messages.
export function createSidWriteBatcher(post,enqueue=queueMicrotask){
  let pending=[],scheduled=false,closed=false,diagnostics=null;
  const flush=()=>{
    scheduled=false;
    if(closed||!pending.length)return;
    const writes=pending;pending=[];
    const tags=diagnostics;diagnostics=null;
    post(tags?.length?{type:'writes',writes,diagnostics:tags}:{type:'writes',writes});
  };
  return {
    write(register,value){
      if(closed)return;
      pending.push([register,value]);
      if(!scheduled){scheduled=true;enqueue(flush)}
    },
    get pendingCount(){return pending.length},
    tag(eventId,start){
      if(closed||!Number.isInteger(eventId)||!Number.isInteger(start)||start<0||start>=pending.length)return false;
      diagnostics??=[];
      if(diagnostics.length>=128)return false;
      diagnostics.push({eventId,start,end:pending.length});return true;
    },
    clearDiagnostics(){diagnostics=null},
    flush,
    close(){closed=true;pending=[];diagnostics=null}
  };
}
