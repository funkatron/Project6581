import test from 'node:test';
import assert from 'node:assert/strict';
import {setControlChecked, setControlValue} from '../src/ui-control.js';

test('setControlChecked dispatches change when value changes',()=>{
  let changes=0;
  const input={checked:false,dispatchEvent(){changes++}};
  assert.equal(setControlChecked(input,true),true);
  assert.equal(input.checked,true);
  assert.equal(changes,1);
  assert.equal(setControlChecked(input,true),false);
  assert.equal(changes,1);
});

test('setControlChecked can update silently',()=>{
  let changes=0;
  const input={checked:false,dispatchEvent(){changes++}};
  assert.equal(setControlChecked(input,true,{emitChange:false}),true);
  assert.equal(changes,0);
});

test('setControlValue dispatches change for selects',()=>{
  let changes=0;
  const input={value:'sid1',dispatchEvent(){changes++}};
  assert.equal(setControlValue(input,'layer'),true);
  assert.equal(input.value,'layer');
  assert.equal(changes,1);
});