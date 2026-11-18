import assert from 'node:assert/strict';
import {test} from 'node:test';
import {countHeldResolvingTo,resolvePerformanceNote} from '../src/western-scales.js';

const majorLocked={tonic:0,id:'major',lock:true};
const resolve=midi=>resolvePerformanceNote(midi,majorLocked);

test('scale lock counts colliding held keys by resolved pitch',()=>{
 const held=new Set([60,61,62]);
 assert.equal(countHeldResolvingTo(held,resolve,60),2);
 assert.equal(countHeldResolvingTo(held,resolve,62),1);
 assert.equal(countHeldResolvingTo(held,resolve,64),0);
});

test('scale lock direct hold: second colliding key does not stack-off first',()=>{
 const held=new Set();
 function maybePlay(physical){
  const resolved=resolve(physical);
  held.add(physical);
  const sounding=countHeldResolvingTo(held,resolve,resolved)>1;
  return !sounding;
 }
 function maybeStop(physical){
  held.delete(physical);
  const resolved=resolve(physical);
  return countHeldResolvingTo(held,resolve,resolved)===0;
 }
 assert.equal(maybePlay(61),true);
 assert.equal(maybePlay(60),false);
 assert.equal(maybeStop(61),false);
 assert.equal(maybeStop(60),true);
});