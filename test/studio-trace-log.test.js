import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudioTraceLog,formatStudioTraceText} from '../src/studio-trace-log.js';

test('studio trace keeps newest lines and formats readable text',()=>{
 const log=createStudioTraceLog({capacity:3,now:()=>1000});
 log.add('boot');
 log.add('unison-update',{voices:9,unison:9,mode:'poly'});
 log.add('panic',{reason:'unison-config'});
 const text=formatStudioTraceText(log.snapshot(),{newestFirst:true});
 assert.match(text,/unison-update/);
 assert.match(text,/panic.*unison-config/);
 assert.match(text,/1000\.0 ms/);
});