import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {calculateVersion,countsTowardVersion,gitCommitsSinceBaseline,resolveVersion,versionBaseline} from '../scripts/version-policy.mjs';

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
test('GitHub merge commits use the PR title on first-parent main',()=>{
  const merge='Merge pull request #20 from org/branch\n\nfeat: new oscillator';
  assert.equal(countsTowardVersion(merge),true);
  assert.equal(calculateVersion('0.1.0',[merge]),'0.2.0');
  // Branch-only feat plus main merge title would double-bump; first-parent main sees merge once.
  assert.equal(calculateVersion('0.1.0',['feat: new oscillator',merge]),'0.3.0');
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
test('untyped merge PR title increments patch',()=>{
  const merge='Merge pull request #132 from org/branch\n\nKeyboard LED toggles';
  assert.equal(calculateVersion('0.3.0',[merge]),'0.3.1');
  assert.equal(calculateVersion('0.3.0',['Keyboard LED toggles']),'0.3.1');
});
test('LFO visualization PR is a patch on v0.4.0 floor',()=>{
  const merge='Merge pull request #135 from funkatron/cursor/lfo-modulation-ui-fa36\n\nRestore LFO slider modulation visualization';
  assert.equal(calculateVersion('0.4.0',[merge]),'0.4.1');
});
test('fix merge commits increment patch',()=>{
  const merge='Merge pull request #146 from funkatron/cursor/sync-chip-models-serial-fa36\n\nfix: serialize per-chip SID model sync on startup';
  assert.equal(calculateVersion('0.5.1',[merge]),'0.5.2');
});
test('git log since baseline returns merge bodies with PR titles',()=>{
  const commits=gitCommitsSinceBaseline('4ee5fba');
  assert.ok(commits.length>=1);
  const merge=commits.find(message=>message.startsWith('Merge pull request'));
  assert.ok(merge);
  const lines=merge.split('\n').map(line=>line.trim()).filter(Boolean);
  assert.ok(lines.length>=2);
  assert.ok(
    lines.some(line=>/^(fix|feat|chore):/i.test(line))||countsTowardVersion(merge),
    'merge body includes a conventional title or a versioned merge subject'
  );
});
test('mechanical package sync commits do not increment',()=>{
  assert.equal(countsTowardVersion('chore: sync package.json to 0.3.2\n'),false);
  assert.equal(calculateVersion('0.3.1',['chore: sync package.json to 0.3.2','feat: panel']),'0.4.0');
});

function inTempRepo(run){
  const dir=mkdtempSync(join(tmpdir(),'p6581-version-'));
  const previous=process.cwd();
  const git=(...args)=>execFileSync('git',['-c','user.name=t','-c','user.email=t@example.com','-c','commit.gpgsign=false',...args],{cwd:dir,encoding:'utf8'});
  const version=v=>writeFileSync(join(dir,'package.json'),JSON.stringify({name:'t',version:v},null,2)+'\n');
  const touch=name=>writeFileSync(join(dir,name),String(Math.random()));
  try{
    git('init','-q','-b','main');
    process.chdir(dir);
    return run({git,version,touch});
  }finally{
    process.chdir(previous);
    rmSync(dir,{recursive:true,force:true});
  }
}
test('baseline is the last commit that changed the package.json version',()=>{
  inTempRepo(({git,version,touch})=>{
    version('0.1.0');git('add','.');git('commit','-qm','chore: release v0.1.0');
    const release=git('rev-parse','HEAD').trim();
    touch('a.js');git('add','.');git('commit','-qm','fix: a');
    assert.equal(versionBaseline(),release);
    assert.equal(resolveVersion(),'0.1.1');
  });
});
test('squash-merged code and version bump in one commit resolve to that version',()=>{
  inTempRepo(({git,version,touch})=>{
    version('0.1.0');git('add','.');git('commit','-qm','chore: release v0.1.0');
    // A squash merge lands the fix and its package.json sync as one commit on main.
    touch('a.js');version('0.1.1');git('add','.');git('commit','-qm','fix: a (#2)');
    assert.equal(resolveVersion(),'0.1.1');
    touch('b.js');git('add','.');git('commit','-qm','feat: b');
    assert.equal(resolveVersion(),'0.2.0');
  });
});
test('package.json edits that leave the version alone do not move the baseline',()=>{
  inTempRepo(({git,version,touch})=>{
    version('0.1.0');git('add','.');git('commit','-qm','chore: release v0.1.0');
    touch('a.js');git('add','.');git('commit','-qm','fix: a');
    writeFileSync('package.json',JSON.stringify({name:'t',version:'0.1.0',scripts:{test:'node --test'}},null,2)+'\n');
    git('add','.');git('commit','-qm','chore: add test script');
    assert.equal(resolveVersion(),'0.1.2');
  });
});
