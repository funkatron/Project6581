#!/usr/bin/env node
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolveVersion,packageBaseVersion,versionBaseline} from './version-policy.mjs';

const packagePath='package.json';

// The baseline is the last commit that changed the version line, so an uncommitted
// sync would be counted again on a second run. Commit before re-running.
const dirty=execFileSync('git',['status','--porcelain','--',packagePath],{encoding:'utf8'}).trim();
if(dirty){
  console.error('package.json has uncommitted changes. Commit them, then re-run this script.');
  process.exit(1);
}

const current=packageBaseVersion();
const resolved=resolveVersion();

if(current===resolved){
  console.log('package.json already',resolved,'(baseline',versionBaseline().slice(0,7)+'…)');
  process.exit(0);
}

const pkg=JSON.parse(readFileSync(packagePath,'utf8'));
pkg.version=resolved;
writeFileSync(packagePath,JSON.stringify(pkg,null,2)+'\n');

console.log('Updated package.json',current,'→',resolved);
console.log('Commit package.json with your change (amend it into your last commit, or commit it separately).');
