import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolveVersion} from './version-policy.mjs';
let version;
try {
  version=resolveVersion();
} catch(err) { console.warn('Version history unavailable; using package.json version:',err.message); version=JSON.parse(readFileSync('package.json','utf8')).version; }
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
