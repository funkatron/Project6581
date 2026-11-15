#!/usr/bin/env node
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const next=process.argv[2];
if(!next||!/^\d+\.\d+\.\d+$/.test(next)){
  console.error('Usage: node scripts/bump-release.mjs <semver>');
  console.error('Example: node scripts/bump-release.mjs 0.4.0');
  process.exit(1);
}
const packagePath='package.json';
const pkg=JSON.parse(readFileSync(packagePath,'utf8'));
pkg.version=next;
writeFileSync(packagePath,JSON.stringify(pkg,null,2)+'\n');
const policyPath='scripts/version-policy.mjs';
let policy=readFileSync(policyPath,'utf8');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!policy.includes('export const BASELINE='))throw new Error('Missing BASELINE in version-policy');
policy=policy.replace(/export const BASELINE='[^']+'/,`export const BASELINE='${head}'`);
writeFileSync(policyPath,policy);
console.log('Set package.json to',next);
console.log('Set BASELINE to current HEAD',head);
console.log('Commit these files, then run stamp-build; further conventional commits auto-increment from',next);