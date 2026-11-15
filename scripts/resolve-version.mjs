#!/usr/bin/env node
import {resolveVersion,BASELINE} from './version-policy.mjs';

const version=resolveVersion();
process.stdout.write(version+'\n');
if(process.argv.includes('--verbose')){
  process.stderr.write('baseline='+BASELINE+' resolved='+version+'\n');
}