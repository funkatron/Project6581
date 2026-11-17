import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateVersion,countsTowardVersion,resolveVersion} from '../scripts/version-policy.mjs';

test('patch for fixes and documentation',()=>{
  assert.equal(calculateVersion('0.1.0',['fix: resolve audio startup']),'0.1.1');
  assert.equal(calculateVersion('0.1.0',['docs: beginner guide']),'0.1.1');
});
test('minor for features and reset patch',()=>{
  // git log returns newest first; the feature occurred after the fix.
  assert.equal(calculateVersion('0.1.0',['feat: b','fix: a']),'0.2.0');
  // A later fix should increment the patch after a feature.
  assert.equal(calculateVersion('0.1.0',['fix: a','feat: b']),'0.2.1');
});
test('breaking changes stay pre-1.0 until explicitly promoted',()=>{
  assert.equal(calculateVersion('0.1.0',['feat!: change SID interface']),'0.2.0');
  assert.equal(calculateVersion('0.1.0',['refactor: interface\nBREAKING CHANGE: changed API']),'0.2.0');
  assert.equal(calculateVersion('0.9.3',['feat!: change interface']),'0.10.0');
  assert.equal(calculateVersion('1.2.3',['feat!: change interface']),'2.0.0');
});
test('merge commit uses PR title',()=>{
  assert.equal(calculateVersion('0.1.0',['Merge pull request #20 from org/branch\n\nfeat: new oscillator']),'0.2.0');
});
test('empty git log fragments are ignored',()=>{
  assert.equal(calculateVersion('0.3.0',["Merge branch 'release/v0.3.0'\n",'\n']),'0.3.0');
});
test('release floor commits do not auto-increment',()=>{
  assert.equal(countsTowardVersion('chore: release v0.4.0\n'),false);
  assert.equal(calculateVersion('0.3.0',['chore: release v0.4.0','feat: new panel']),'0.4.0');
});
test('resolveVersion matches stamped build on this checkout',()=>{
  assert.match(resolveVersion(),/^\d+\.\d+\.\d+$/);
});
test('untyped PR title increments patch',()=>{
  assert.equal(calculateVersion('0.3.0',['Merge pull request #132 from org/branch\n\nKeyboard LED toggles']),'0.3.1');
});
test('mechanical package sync commits do not increment',()=>{
  assert.equal(countsTowardVersion('chore: sync package.json to 0.3.2\n'),false);
  assert.equal(calculateVersion('0.3.1',['chore: sync package.json to 0.3.2','feat: panel']),'0.4.0');
});
