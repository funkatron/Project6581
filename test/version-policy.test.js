import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateVersion} from '../scripts/version-policy.mjs';

test('patch for fixes and documentation',()=>{
  assert.equal(calculateVersion('0.1.0',['fix: resolve audio startup']),'0.1.1');
  assert.equal(calculateVersion('0.1.0',['docs: beginner guide']),'0.1.1');
});
test('minor for features and reset patch',()=>{
  assert.equal(calculateVersion('0.1.0',['fix: a','feat: b']),'0.2.0');
});
test('major for breaking changes',()=>{
  assert.equal(calculateVersion('0.1.0',['feat!: change SID interface']),'1.0.0');
  assert.equal(calculateVersion('0.1.0',['refactor: interface\nBREAKING CHANGE: changed API']),'1.0.0');
});
test('merge commit uses PR title',()=>{
  assert.equal(calculateVersion('0.1.0',['Merge pull request #20 from org/branch\n\nfeat: new oscillator']),'0.2.0');
});
