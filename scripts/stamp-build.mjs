import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {calculateVersion,BASELINE} from './version-policy.mjs';
const {version:baseVersion}=JSON.parse(readFileSync('package.json','utf8'));
let version=baseVersion;
try {
  const commits=execFileSync('git',['log','--first-parent','--format=%s%n%b%x00',BASELINE+'..HEAD'],{encoding:'utf8'}).split('\0').filter(Boolean);
  version=calculateVersion(baseVersion,commits);
} catch(err) { console.warn('Version history unavailable; using package.json version:',err.message); }
if(!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version))throw Error('Invalid semantic version');
const builtAt=new Date().toISOString();
const buildId=version+'+'+builtAt.replace(/[-:.]/g,'');
let html=readFileSync('index.html','utf8');
if(!html.includes('__BUILD_VERSION__')||!html.includes('__BUILD_TIMESTAMP__'))throw Error('Missing build placeholders');
html=html.replaceAll('__BUILD_VERSION__',version).replaceAll('__BUILD_TIMESTAMP__',builtAt).replaceAll('__BUILD_ID__',buildId);
writeFileSync('index.html',html);
// Stamp transitive module imports too, so the bridge and UI share the same
// lifecycle module instance and never mix a new bridge with a cached batcher.
for(const path of readdirSync('src',{recursive:true})){
 if(!path.endsWith('.js'))continue;
 const file='src/'+path,source=readFileSync(file,'utf8');
 if(source.includes('__BUILD_ID__'))writeFileSync(file,source.replaceAll('__BUILD_ID__',buildId));
}
console.log('Project6581',version,'built',builtAt);
