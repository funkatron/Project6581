import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

// package.json must match resolveVersion() — run scripts/sync-package-version.mjs after
// shipping code on main. BASELINE is the commit where package.json last synced.
// Rules: feat/behavior → minor (reset patch); any other counted change → patch.
export const BASELINE='1837b67f922773236572b6e2d2b9b48e991f8fbc';

const RELEASE_FLOOR=/^chore(?:\([^)]+\))?:\s*release\b/i;
const RELEASE_TAG=/^release v\d+\.\d+\.\d+/i;

export function commitTitle(message){
  const subject=message.split('\n')[0].trim();
  if(!subject)return '';
  if(subject.startsWith('Merge pull request')){
    return message.split('\n').map(line=>line.trim()).filter(Boolean).at(-1)??subject;
  }
  return subject;
}

export function countsTowardVersion(message){
  const subject=message.split('\n')[0].trim();
  if(!subject)return false;
  if(/^Merge branch/i.test(subject))return false;
  const title=commitTitle(message);
  if(RELEASE_FLOOR.test(title))return false;
  if(RELEASE_TAG.test(title))return false;
  return true;
}

export function calculateVersion(base,commits){
  let [major,minor,patch]=base.split('.').map(Number);
  for(const message of commits.slice().reverse()){
    if(!countsTowardVersion(message))continue;
    const subject=message.split('\n')[0].trim();
    const title=commitTitle(message);
    const breaking=/^[a-z]+(?:\([^)]+\))?!:/i.test(title)||/BREAKING CHANGE:/i.test(message);
    if(breaking){
      // Pre-1.0 development: even breaking changes advance minor only.
      // A 1.0 release requires an explicit, separate decision.
      if(major===0){minor++;patch=0}
      else {major++;minor=0;patch=0}
    }
    else if(/^feat(?:\([^)]+\))?:/i.test(title)){minor++;patch=0}
    else if(countsTowardVersion(message)){patch++}
  }
  return [major,minor,patch].join('.');
}

export function gitCommitsSinceBaseline(baseline=BASELINE){
  const raw=execFileSync('git',['log','--first-parent','--format=%s%n%b%x00',baseline+'..HEAD'],{encoding:'utf8'});
  return raw.split('\0').filter(Boolean);
}

export function packageBaseVersion(){
  return JSON.parse(readFileSync('package.json','utf8')).version;
}

export function resolveVersion({baseVersion=packageBaseVersion(),commits,baseline=BASELINE}={}){
  const list=commits??gitCommitsSinceBaseline(baseline);
  return calculateVersion(baseVersion,list);
}