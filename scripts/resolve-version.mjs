#!/usr/bin/env node
import {resolveVersion,versionBaseline} from './version-policy.mjs';

const version=resolveVersion();
process.stdout.write(version+'\n');
if(process.argv.includes('--verbose')){
  process.stderr.write('baseline='+versionBaseline()+' resolved='+version+'\n');
}