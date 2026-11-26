// A step clock for the page sequencers (drums, Root Arp, Game Arp).
//
// Each step aims at start + n × step (anchor + n × ms) instead of "one interval
// after the last tick" (setInterval). setInterval never catches up: a tick delayed
// past the next one makes every later step late by the same amount, so a busy page
// drags the groove (iPad, 2026-11-25: +2.3 s by the end of a drum run while
// playing the keyboard with Game Arp on). Here, a step late by less than one
// interval plays at once and the next aims back at the grid; after a stall of a
// whole step or more, the passed steps are skipped (reported as `skipped`), never
// played in a burst.
//
// now() is in milliseconds. now/setTimer/clearTimer are injectable for tests.

export function createGridTimer({
 now=()=>performance.now(),
 setTimer=(fn,ms)=>setTimeout(fn,ms),
 clearTimer=id=>clearTimeout(id)
}={}){
 let grid=null,pending=null;
 function schedule(){
  const due=grid.anchor+grid.n*grid.ms;
  pending=setTimer(fire,Math.max(0,due-now()));
 }
 function fire(){
  pending=null;
  const current=grid;
  if(!current)return;
  const behind=Math.floor((now()-(current.anchor+current.n*current.ms))/current.ms);
  const skipped=Math.max(0,behind);
  current.n+=skipped;
  const n=current.n-current.first;
  current.n++;
  current.onStep({n,skipped});
  // onStep may stop or restart this timer.
  if(grid===current&&pending===null)schedule();
 }
 const api={
  /**
   * Starts stepping every ms. immediate: the first step runs now (n = 0);
   * otherwise the first step is one interval from now. delayMs, when given,
   * puts the first step (n = 0) that far from now instead. onStep({n, skipped}):
   * n counts grid positions since start, skipped steps included.
   */
  start({ms,onStep,immediate=true,delayMs=null}){
   api.stop();
   if(!(ms>0))throw new RangeError('grid timer interval must be positive');
   if(delayMs!==null){
    if(!(delayMs>=0))throw new RangeError('grid timer delay must be zero or more');
    grid={anchor:now()+delayMs,ms,n:0,first:0,onStep};
    schedule();
    return api;
   }
   const current={anchor:now(),ms,n:immediate?0:1,first:immediate?0:1,onStep};
   grid=current;
   if(immediate){
    current.n=1;
    onStep({n:0,skipped:0});
    if(grid!==current||pending!==null)return api;
   }
   schedule();
   return api;
  },
  stop(){
   if(pending!==null)clearTimer(pending);
   pending=null;grid=null;
  },
  get running(){return grid!==null}
 };
 return api;
}
