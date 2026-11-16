import test from 'node:test';
import assert from 'node:assert/strict';
import {createSidEventLog} from '../src/sid-event-log.js';
import {createStudioTraceLog} from '../src/studio-trace-log.js';
import {formatDiagnosticActivityText} from '../src/diagnostics-format.js';

test('activity log includes studio note lines and detailed note events',()=>{
 const studio=createStudioTraceLog({now:()=>1000});
 studio.add('note-on',{note:60,source:'key:60'});
 const events=createSidEventLog({now:()=>1001});
 events.setEnabled(true);
 events.begin('input',{note:60,source:'pointer',action:'down'});
 const text=formatDiagnosticActivityText(studio.snapshot(),events.snapshot());
 assert.match(text,/note-on/);
 assert.match(text,/input/);
 assert.match(text,/Note events/);
});