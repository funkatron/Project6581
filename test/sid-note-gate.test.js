import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canDispatchNote,
  needsAudioResume,
  shouldBlockMusicalInput
} from '../src/sid-note-gate.js';

test('blocks musical input while startup, close, preset load, or cleanup is busy',()=>{
  assert.equal(shouldBlockMusicalInput({pendingStartup:true}),true);
  assert.equal(shouldBlockMusicalInput({pendingClose:true}),true);
  assert.equal(shouldBlockMusicalInput({presetLoading:true}),true);
  assert.equal(shouldBlockMusicalInput({starting:true}),true);
  assert.equal(shouldBlockMusicalInput({cleanupBlocked:true}),true);
  assert.equal(shouldBlockMusicalInput({}),false);
});

test('needs resume only for suspended or interrupted contexts',()=>{
  assert.equal(needsAudioResume('suspended'),true);
  assert.equal(needsAudioResume('interrupted'),true);
  assert.equal(needsAudioResume('running'),false);
  assert.equal(needsAudioResume('closed'),false);
  assert.equal(needsAudioResume(null),false);
});

test('canDispatchNote requires a live running engine unless suspended is explicitly allowed',()=>{
  assert.deepEqual(
    canDispatchNote({hasController:true,voiceEnabled:true,contextState:'running'}),
    {ok:true,reason:null}
  );
  assert.equal(
    canDispatchNote({blocked:true,hasController:true,contextState:'running'}).reason,
    'engine busy'
  );
  assert.equal(
    canDispatchNote({hasController:false,contextState:'running'}).reason,
    'engine unavailable'
  );
  assert.equal(
    canDispatchNote({hasController:true,voiceEnabled:false,contextState:'running'}).reason,
    'voice disabled'
  );
  assert.equal(
    canDispatchNote({hasController:true,contextState:'suspended'}).reason,
    'audio not running'
  );
  assert.deepEqual(
    canDispatchNote({
      hasController:true,
      contextState:'suspended',
      allowWhileSuspended:true
    }),
    {ok:true,reason:null}
  );
});
