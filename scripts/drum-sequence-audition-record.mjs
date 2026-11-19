#!/usr/bin/env node
/**
 * Record drum fixture grooves via reSIDfp + header WAV recorder (?testHooks=1).
 *
 *   node scripts/drum-sequence-audition-record.mjs --out artifacts/drum-audio
 */
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readdir} from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import {stepMilliseconds} from '../src/arp-composition.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fixtureDir=path.join(root,'test/fixtures/drum-audio');
const delay=ms=>new Promise(r=>setTimeout(r,ms));

function parseArgs(argv){
 const opts={out:path.join(root,'artifacts/drum-audio'),port:8765,bars:2,bpm:120,ids:null};
 for(let i=2;i<argv.length;i++){
  const a=argv[i];
  if(a==='--out'&&argv[i+1])opts.out=path.resolve(argv[++i]);
  else if(a==='--port'&&argv[i+1])opts.port=Number(argv[++i]);
  else if(a==='--bars'&&argv[i+1])opts.bars=Number(argv[++i]);
  else if(a==='--bpm'&&argv[i+1])opts.bpm=Number(argv[++i]);
  else if(a==='--ids'&&argv[i+1])opts.ids=new Set(argv[++i].split(','));
  else if(a==='--help'){
   console.log('Usage: node scripts/drum-sequence-audition-record.mjs [--out DIR] [--bars N] [--ids id,id]');
   process.exit(0);
  }
 }
 return opts;
}

function startStaticServer(port){
 const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.mjs':'text/javascript','.wasm':'application/wasm'};
 return new Promise(resolve=>{
  const server=createServer((req,res)=>{
   const url=req.url?.split('?')[0]||'/';
   const rel=url==='/'?'/index.html':url;
   const file=path.join(root,decodeURIComponent(rel));
   if(!file.startsWith(root)){res.writeHead(403);res.end();return}
   if(!existsSync(file)){res.writeHead(404);res.end();return}
   res.writeHead(200,{
    'Content-Type':types[path.extname(file)]??'application/octet-stream',
    'Cross-Origin-Opener-Policy':'same-origin',
    'Cross-Origin-Embedder-Policy':'require-corp',
   });
   createReadStream(file).pipe(res);
  });
  server.listen(port,()=>resolve(server));
 });
}

async function waitSidReady(page){
 await page.waitForFunction(()=>document.querySelectorAll('#keyboard .key').length>=12,{timeout:60000});
 const unlocked=await page.evaluate(()=>{
  const unlock=document.getElementById('sidUnlock');
  if(unlock&&!unlock.hidden){unlock.click();return true}
  const start=document.getElementById('sidStart');
  if(start&&!start.hidden){start.click();return true}
  return false;
 });
 if(!unlocked)await page.click('#keyboard .key');
 else await page.click('#keyboard .key');
 await page.waitForFunction(()=>globalThis.__project6581Test?.ready?.(),{timeout:120000});
}

async function recordDrumFixture(page,{fixture,bars,bpm}){
 const rate=fixture.sequence?.rate??4;
 const recordMs=stepMilliseconds(bpm,rate)*16*bars+500;
 await page.evaluate(()=>globalThis.__project6581Test.panic());
 await delay(200);
 await page.select('#recordFormat','wav');
 await page.evaluate(({data,bpm})=>{
  const hooks=globalThis.__project6581Test;
  hooks.setMasterBpm(bpm);
  hooks.loadDrumSequence({
   enabled:true,steps:16,sync:true,localBpm:bpm,rate:data.sequence.rate??4,...data.sequence,
  });
 },{data:fixture,bpm});
 await page.click('#recordToggle');
 await page.waitForFunction(()=>document.querySelector('#recordToggle')?.dataset.recording==='true');
 await page.evaluate(()=>globalThis.__project6581Test.drumPreview(true));
 await delay(recordMs);
 await page.evaluate(()=>globalThis.__project6581Test.drumPreview(false));
 await page.click('#recordToggle');
 await page.waitForFunction(()=>{
  const link=document.querySelector('#recordDownload');
  return link&&!link.hidden&&link.href?.startsWith('blob:');
 },{timeout:60000});
 const bytes=await page.evaluate(async ()=>{
  const href=document.querySelector('#recordDownload').href;
  const res=await fetch(href);
  const buf=await res.arrayBuffer();
  URL.revokeObjectURL(href);
  return [...new Uint8Array(buf)];
 });
 return Buffer.from(bytes);
}

async function listFixtures(ids){
 const names=await readdir(fixtureDir);
 return names
  .filter(n=>n.endsWith('.json')&&!n.includes('profiles'))
  .map(n=>n.replace(/\.json$/,''))
  .filter(id=>!ids||ids.has(id))
  .sort()
  .map(id=>({id,data:JSON.parse(readFileSync(path.join(fixtureDir,id+'.json'),'utf8'))}));
}

async function main(){
 const opts=parseArgs(process.argv);
 const wasm=path.join(root,'dist/residfp.wasm');
 if(!existsSync(wasm))throw new Error('Missing '+wasm+' — npm run build:wasm');
 await mkdir(opts.out,{recursive:true});
 const fixtures=await listFixtures(opts.ids);
 if(!fixtures.length)throw new Error('No fixtures in '+fixtureDir);

 const chrome=process.env.CHROME_PATH??'/usr/bin/google-chrome';
 const server=await startStaticServer(opts.port);
 const browser=await puppeteer.launch({
  executablePath:chrome,
  headless:'new',
  protocolTimeout:180000,
  args:['--no-sandbox','--disable-setuid-sandbox','--autoplay-policy=no-user-gesture-required'],
 });
 const manifest={generatedAt:new Date().toISOString(),format:'wav',bpm:opts.bpm,bars:opts.bars,fixtures:[]};
 try{
  const page=await browser.newPage();
  await page.goto(`http://127.0.0.1:${opts.port}/index.html?testHooks=1`,{waitUntil:'domcontentloaded'});
  await waitSidReady(page);
  for(const {id,data} of fixtures){
   console.log('Recording',id,'…');
   const blob=await recordDrumFixture(page,{fixture:data,bars:opts.bars,bpm:opts.bpm});
   const filename=id+'.wav';
   await writeFile(path.join(opts.out,filename),blob);
   manifest.fixtures.push({
    fixtureId:id,
    filename,
    bytes:blob.length,
    bpm:opts.bpm,
    rate:data.sequence?.rate??4,
    bars:opts.bars,
   });
  }
  await writeFile(path.join(opts.out,'manifest.json'),JSON.stringify(manifest,null,2));
  console.log('Wrote',manifest.fixtures.length,'WAV(s) to',opts.out);
 }finally{
  await browser.close();
  server.close();
 }
}

main().catch(err=>{console.error(err);process.exit(1);});