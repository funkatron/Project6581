import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const studio=readFileSync(new URL('../src/sid-studio.js',import.meta.url),'utf8');
const prefs=readFileSync(new URL('../src/studio-preferences-ui.js',import.meta.url),'utf8');

test('system preferences dialog mounts from studio',()=>{
 assert.match(studio,/import \{mountPreferencesDialog[,}]/);
 assert.match(studio,/mountPreferencesDialog\(\$\)/);
 assert.match(prefs,/dialog\.showModal\(\)/);
});
test('worklet drum timing: on by default, an explicit choice is saved per browser, active only with v6+ modules that passed self-test',async()=>{
 const {mountWorkletDrumTimingPref,workletDrumsSupported,workletDrumTimingStatus,WORKLET_DRUM_TIMING_KEY}=await import('../src/studio-preferences-ui.js');
 const {fakeDom}=await import('./fixtures/fake-dom.mjs');
 const store=new Map();
 const storage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)};
 const ready={available:true,version:6,selfTest:{ok:true}};
 let support=null;const changes=[];
 const {$}=fakeDom({workletDrumTiming:{checked:false}});
 const pref=mountWorkletDrumTimingPref($,{storage,getSupport:()=>support,onChange:on=>changes.push(on)});
 assert.equal(pref.enabled,true,'nothing saved: on');
 assert.equal($('workletDrumTiming').checked,true);
 assert.equal($('workletDrumTimingStatus').textContent,'On: waiting for the audio engine to start.');
 $('workletDrumTiming').checked=false;$('workletDrumTiming').dispatch('change');
 assert.equal(store.get(WORKLET_DRUM_TIMING_KEY),'off');
 assert.equal($('workletDrumTimingStatus').textContent,'Off: the page timer plays the drums.');
 assert.equal(mountWorkletDrumTimingPref(fakeDom({workletDrumTiming:{}}).$,{storage}).enabled,false,'a saved off stays off');
 $('workletDrumTiming').checked=true;$('workletDrumTiming').dispatch('change');
 assert.deepEqual(changes,[false,true]);
 assert.equal(store.get(WORKLET_DRUM_TIMING_KEY),'on');
 assert.equal(pref.active(),false,'no engine yet');
 support=ready;pref.refresh();
 assert.equal(pref.active(),true);
 assert.match($('workletDrumTimingStatus').textContent,/^On: the audio engine plays the drums/);
 // A new page load reads the saved setting.
 const again=mountWorkletDrumTimingPref(fakeDom({workletDrumTiming:{}}).$,{storage,getSupport:()=>ready});
 assert.equal(again.enabled,true);
 assert.equal(workletDrumsSupported({...ready,version:5}),false);
 assert.equal(workletDrumsSupported({...ready,selfTest:{ok:false}}),false);
 assert.equal(workletDrumTimingStatus(true,{available:false}),'Unavailable (sequencer modules did not load): the page timer plays the drums.');
 assert.equal(workletDrumTimingStatus(true,{...ready,version:5}),'Unavailable (modules too old (v5)): the page timer plays the drums.');
 // Storage that throws (Safari private mode): on by default, and toggling still works.
 const broken={getItem(){throw new Error('denied')},setItem(){throw new Error('denied')}};
 const {$:$3}=fakeDom({workletDrumTiming:{}});
 const third=mountWorkletDrumTimingPref($3,{storage:broken,getSupport:()=>ready});
 assert.equal(third.active(),true);
 $3('workletDrumTiming').checked=false;$3('workletDrumTiming').dispatch('change');
 assert.equal(third.active(),false);
});

test('studio routes drum steps and grid taps to the worklet in worklet drum timing',()=>{
 assert.match(studio,/if\(drum\.worklet\)\{for\(const hit of hits\)bumpDrumBusMeter\(hit\.lane\);return\}/);
 assert.match(studio,/triggerDrumLane:auditionDrumLane,/);
 assert.match(studio,/workletDrums:\(\)=>Boolean\(sidAudio\)&&workletDrumTiming\.active\(\),/);
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/<input id="workletDrumTiming" type="checkbox" checked> Worklet drum timing<\/label>/);
});
