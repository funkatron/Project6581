#!/usr/bin/env node
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolveVersion,packageBaseVersion,BASELINE} from './version-policy.mjs';

const packagePath='package.json';
const policyPath='scripts/version-policy.mjs';
const current=packageBaseVersion();
const resolved=resolveVersion();

if(current===resolved){
  console.log('package.json already',resolved,'(baseline',BASELINE.slice(0,7)+'…)');
  process.exit(0);
}

const pkg=JSON.parse(readFileSync(packagePath,'utf8'));
pkg.version=resolved;
writeFileSync(packagePath,JSON.stringify(pkg,null,2)+'\n');

const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
let policy=readFileSync(policyPath,'utf8');
policy=policy.replace(/export const BASELINE='[^']+'/,`export const BASELINE='${head}'`);
writeFileSync(policyPath,policy);

console.log('Updated package.json',current,'→',resolved);
console.log('Reset BASELINE to',head);
console.log('Commit package.json and scripts/version-policy.mjs with your change.');