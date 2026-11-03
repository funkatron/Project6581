import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {calculateVersion} from './version-policy.mjs';
const {version:baseVersion}=JSON.parse(readFileSync('package.json','utf8'));
let version=baseVersion;
try {
  const commits=execFileSync('git',['log','--format=%s%n%b%x00','--no-merges','HEAD'],{encoding:'utf8'}).split('\0').filter(Boolean);
  version=calculateVersion(baseVersion,commits);
} catch(err) { console.warn('Version history unavailable; using package.json version:',err.message); }
if(!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version))throw Error('Invalid semantic version');
const builtAt=new Date().toISOString();
const buildId=version+'+'+builtAt.replace(/[-:.]/g,'');
let html=readFileSync('index.html','utf8');
if(!html.includes('__BUILD_VERSION__')||!html.includes('__BUILD_TIMESTAMP__'))throw Error('Missing build placeholders');
html=html.replaceAll('__BUILD_VERSION__',version).replaceAll('__BUILD_TIMESTAMP__',builtAt).replaceAll('__BUILD_ID__',buildId);
writeFileSync('index.html',html);
console.log('Project6581',version,'built',builtAt);
