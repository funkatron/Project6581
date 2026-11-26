import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGridTimer} from '../src/grid-timer.js';
import {fakeClock} from './fixtures/fake-dom.mjs';

function stepper(clock,{ms=100,immediate=true}={}){
 const steps=[];
 const timer=createGridTimer(clock);
 timer.start({ms,immediate,onStep:step=>steps.push({...step,at:clock.now()})});
 return {timer,steps};
}

test('steps land on start + n × interval, with or without an immediate first step',()=>{
 const clock=fakeClock();
 const {steps}=stepper(clock);
 clock.advance(350);
 assert.deepEqual(steps,[{n:0,skipped:0,at:0,nextAt:100},{n:1,skipped:0,at:100,nextAt:200},{n:2,skipped:0,at:200,nextAt:300},{n:3,skipped:0,at:300,nextAt:400}]);
 const later=fakeClock(1000);
 const {steps:delayed}=stepper(later,{immediate:false});
 later.advance(250);
 assert.deepEqual(delayed.map(s=>[s.n,s.at,s.nextAt]),[[0,1100,1200],[1,1200,1300]]);
});

test('constant timer slack does not accumulate',()=>{
 const clock=fakeClock();
 clock.lateBy=7;
 const {steps}=stepper(clock);
 clock.advance(1000);
 assert.deepEqual(steps.map(s=>s.at),[0,107,207,307,407,507,607,707,807,907]);
});

test('a short stall delays one step only; a long stall skips the passed steps, no burst',()=>{
 const clock=fakeClock();
 const {steps}=stepper(clock);
 clock.advance(150);clock.stall(40);clock.advance(0); // step 2 (200) on time: stall ended at 190
 clock.advance(60);clock.stall(70);clock.advance(0);  // step 3 (300) runs at 320
 clock.advance(100);                                    // step 4 back on the grid at 400
 clock.stall(260);clock.advance(0);                     // busy 420 → 680: step 5 (500) passed; 6 (600) is due
 clock.advance(150);
 // The newest due step plays at once; older passed steps are skipped; then the grid.
 assert.deepEqual(steps.map(s=>[s.n,s.skipped,s.at]),
  [[0,0,0],[1,0,100],[2,0,200],[3,0,320],[4,0,400],[6,1,680],[7,0,700],[8,0,800]]);
});

test('stopping inside a step, restarting inside a step, and stop() all hold',()=>{
 const clock=fakeClock();
 const timer=createGridTimer(clock);
 let count=0;
 timer.start({ms:50,onStep:()=>{if(++count===3)timer.stop()}});
 clock.advance(500);
 assert.equal(count,3);
 assert.equal(clock.pending,0);
 assert.equal(timer.running,false);
 const steps=[];
 timer.start({ms:50,onStep:({n})=>{steps.push(['a',n]);if(n===1)timer.start({ms:30,immediate:false,onStep:s=>steps.push(['b',s.n])})}});
 clock.advance(130);
 assert.deepEqual(steps,[['a',0],['a',1],['b',0],['b',1]]);
 assert.equal(clock.pending,1,'only the restarted timer remains');
 timer.stop();
 assert.equal(clock.pending,0);
 assert.throws(()=>timer.start({ms:0,onStep:()=>{}}),/positive/);
});

test('no page sequencer uses setInterval any more',()=>{
 for(const file of ['drum-performance.js','performance-play.js','sid-studio.js']){
  const src=readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
  assert.doesNotMatch(src,/setInterval\(|clearInterval\(/,file);
 }
});

test('delayMs puts the first step (n = 0) that far ahead, then steps on the grid',()=>{
 const clock=fakeClock();
 const timer=createGridTimer(clock);
 const ticks=[];
 timer.start({ms:125,delayMs:50,onStep:({n,skipped})=>ticks.push([clock.now(),n,skipped])});
 assert.deepEqual(ticks,[]);
 clock.advance(50+2*125);
 assert.deepEqual(ticks,[[50,0,0],[175,1,0],[300,2,0]]);
 timer.stop();
 assert.throws(()=>timer.start({ms:125,delayMs:-1,onStep:()=>{}}),RangeError);
});
