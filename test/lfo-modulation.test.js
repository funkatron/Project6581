import test from 'node:test';
import assert from 'node:assert/strict';
import {lfoValue,modulate,LFO_WAVES,LFO_TARGETS,syncedLfoHz,SYNCED_LFO_DIVISIONS,pulseWithPwm} from '../src/lfo-modulation.js';

test('all modulation waveforms produce bounded values',()=>{
 for(const wave of LFO_WAVES)for(const phase of [0,.1,.25,.5,.75,1,3.3]){
  const value=lfoValue(wave,phase,7);
  assert.ok(value>=-1&&value<=1,wave+' '+phase);
 }
});
test('sample-and-hold remains stable throughout a cycle',()=>{
 assert.equal(lfoValue('sample-hold',2.1,5),lfoValue('sample-hold',2.9,5));
});
test('three LFOs sum without changing base sliders',()=>{
 const base={cutoff:5000,volume:50};
 const lfo={enabled:true,wave:'square',phase:0,rate:1,depth:.2,target:'cutoff'};
 const result=modulate(base,[lfo,lfo,lfo],0);
 assert.ok(result.cutoff>base.cutoff);
 assert.equal(base.cutoff,5000);
 assert.equal(result.volume,50);
});
test('modulation clamps to target range',()=>{
 const base={volume:100};
 const lfo={enabled:true,wave:'square',phase:0,rate:1,depth:1,target:'volume'};
 assert.equal(modulate(base,[lfo,lfo,lfo],0).volume,100);
});
test('pulse modulation is inactive for non-pulse waveforms',()=>{
 const base={pulse:50};
 const lfo={enabled:true,wave:'square',phase:0,rate:1,depth:1,target:'pulse'};
 assert.equal(modulate(base,[lfo],0,{pulseActive:false}).pulse,50);
 assert.ok(modulate(base,[lfo],0,{pulseActive:true}).pulse>50);
});
test('all intended continuous slider targets are routable',()=>{
 for(const target of ['volume','cutoff','resonance','detune','attack','decay','sustain','release','pulse','pwmDepth','pwmRate'])assert.ok(LFO_TARGETS[target]);
});

test('disabling or retargeting an LFO restores every former target to its base value',()=>{
 const base={cutoff:5000,resonance:40,volume:50,pulse:45};
 const lfo={enabled:true,wave:'square',phase:0,rate:1,depth:.5,target:'pulse'};
 assert.notEqual(modulate(base,[lfo],0).pulse,base.pulse);
 lfo.enabled=false;
 assert.deepEqual(modulate(base,[lfo],0),base);
 lfo.enabled=true;
 lfo.target='cutoff';
 const changed=modulate(base,[lfo],0);
 assert.equal(changed.pulse,base.pulse);
 assert.notEqual(changed.cutoff,base.cutoff);
 lfo.target='resonance';
 assert.equal(modulate(base,[lfo],0).cutoff,base.cutoff);
 lfo.target='volume';
 assert.equal(modulate(base,[lfo],0).resonance,base.resonance);
 lfo.enabled=false;
 assert.deepEqual(modulate(base,[lfo],0),base);
});


test('synchronized LFO rates correspond to musical note lengths',()=>{
 assert.deepEqual(SYNCED_LFO_DIVISIONS,[0.25,0.5,1,2,4,8,16,32]);
 // 120 BPM = two beats per second; a whole note spans four beats.
 assert.equal(syncedLfoHz(120,0.25),0.125); // 4/1
 assert.equal(syncedLfoHz(120,0.5),0.25);    // 2/1
 assert.equal(syncedLfoHz(120,1),0.5);      // 1/1
 assert.equal(syncedLfoHz(120,4),2);      // 1/4
 assert.equal(syncedLfoHz(120,32),16);    // 1/32
});

test('synchronized rates track master tempo with safe invalid-tempo handling',()=>{
 assert.equal(syncedLfoHz(60,0.25),0.0625);
 assert.equal(syncedLfoHz(240,0.5),0.5);
 assert.equal(syncedLfoHz(NaN,0.5),0.25);
 assert.equal(syncedLfoHz(999,0.25),0.125);
 assert.throws(()=>syncedLfoHz(120,0),RangeError);
 assert.throws(()=>syncedLfoHz(120,0.123),RangeError);
});

test('detune modulation is disabled outside Unison without changing other targets',()=>{
 const base={detune:25,cutoff:5000};
 const lfos=[
  {enabled:true,depth:1,wave:'square',rate:1,target:'detune'},
  {enabled:true,depth:.5,wave:'square',rate:1,target:'cutoff'}
 ];
 const result=modulate(base,lfos,0,{unisonActive:false});
 assert.equal(result.detune,25);
 assert.notEqual(result.cutoff,5000);
 assert.notEqual(modulate(base,lfos,0,{unisonActive:true}).detune,25);
});

test('audible PWM sweeps around the pulse center and clips safely',()=>{
 assert.equal(pulseWithPwm(50,20,1,0),50);
 assert.equal(pulseWithPwm(50,20,1,0.25),70);
 assert.equal(pulseWithPwm(50,20,1,0.75),30);
 assert.equal(pulseWithPwm(94,45,1,0.25),95);
 assert.equal(pulseWithPwm(6,45,1,0.75),5);
 assert.equal(pulseWithPwm(42,0,2,0.25),42);
 assert.equal(pulseWithPwm(50,20,1,0),50);
});
