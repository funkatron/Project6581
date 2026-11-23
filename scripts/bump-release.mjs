#!/usr/bin/env node
import {readFileSync,writeFileSync} from 'node:fs';

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
console.log('Set package.json to',next);
console.log('Commit package.json (that commit becomes the version baseline), then run stamp-build; further conventional commits auto-increment from',next);