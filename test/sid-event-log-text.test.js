import test from 'node:test';
import assert from 'node:assert/strict';
import {createSidEventLog,formatSidEventLogText} from '../src/sid-event-log.js';

test('note event log formats readable lines newest-first',()=>{
 const log=createSidEventLog({capacity:8,now:()=>1000});
 log.setEnabled(true);
 log.begin('input',{note:60,source:'pointer',action:'down'});
 log.begin('note-command',{note:60,source:'key:60',action:'on',chipMask:[0]});
 const text=formatSidEventLogText(log.snapshot(),{newestFirst:true});
 assert.match(text,/note-command/);
 assert.match(text,/note=60/);
 assert.match(text,/input/);
});