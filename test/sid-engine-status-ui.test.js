import test from 'node:test';
import assert from 'node:assert/strict';
import {
 formatActiveSidStatus,
 formatBrowserLatencyStatus,
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
});

test('latency formatter reports base and output when available',()=>{
 assert.match(formatBrowserLatencyStatus(.01,.02),/base 10\.0 ms.*output 20\.0 ms/);
 assert.equal(formatBrowserLatencyStatus(null,null),'Browser audio latency: not reported.');
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
