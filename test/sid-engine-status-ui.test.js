import test from 'node:test';
import assert from 'node:assert/strict';
import {
 formatActiveSidStatus,
 formatBrowserLatencyStatus,
 formatPlaybackLatencyStatus,
 formatSidProgressMessage,
 shouldShowSidUnlock,
 sidLedAriaLabel,
 sidLedState
} from '../src/sid-engine-status-ui.js';

test('sid LED state tracks audio lifecycle',()=>{
 assert.equal(sidLedState({hasAudio:true,contextState:'running',starting:false}),'on');
 assert.equal(sidLedState({hasAudio:true,contextState:'suspended',starting:false}),'ready');
 assert.equal(sidLedState({hasAudio:false,contextState:'suspended',starting:true}),'loading');
 assert.equal(sidLedState({hasAudio:false,contextState:'closed',starting:false}),'off');
});

test('progress and active messages include Safari unlock guidance',()=>{
 assert.match(formatSidProgressMessage('Loading…','suspended'),/Enable audio/);
 assert.equal(formatSidProgressMessage('Ready','running'),'Ready');
 assert.match(formatActiveSidStatus('suspended',6581),/Enable audio/);
 assert.match(formatActiveSidStatus('suspended',6581,{afterInit:true}),/touch a key/);
 assert.match(formatActiveSidStatus('running',8580),/SID 8580 active\./);
});

test('footer playback latency prefers measured touch to output',()=>{
 assert.match(
  formatPlaybackLatencyStatus({keyToOutputEstimateMs:41.2,outputMs:18}),
  /Touch → output: 41\.2 ms/
 );
 assert.match(
  formatPlaybackLatencyStatus({baseMs:3,outputMs:18}),
  /tap a key to measure/
 );
 assert.match(formatPlaybackLatencyStatus({keyEnergyMissed:true}),/no loud PCM/);
});

test('browser latency helper delegates to playback formatter',()=>{
 assert.match(formatBrowserLatencyStatus(.01,.02),/browser output path: 10\.0 ms base \+ 20\.0 ms output/);
 assert.match(formatBrowserLatencyStatus(null,null),/tap a key to measure/);
});

test('unlock button hides when running, closed, or retired',()=>{
 const ctx={state:'suspended'};
 assert.equal(shouldShowSidUnlock({contextRetired:false,context:ctx}),true);
 assert.equal(shouldShowSidUnlock({contextRetired:true,context:ctx}),false);
 assert.equal(shouldShowSidUnlock({contextRetired:false,context:{state:'running'}}),false);
});

test('aria labels cover every LED state',()=>{
 for(const state of ['on','ready','loading','off'])
  assert.ok(sidLedAriaLabel(state).includes('SID'));
});
