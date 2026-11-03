import test from 'node:test';
import assert from 'node:assert/strict';
import {lfoValue,modulate,LFO_WAVES,LFO_TARGETS} from '../src/lfo-modulation.js';

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
