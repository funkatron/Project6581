#!/usr/bin/env node
/**
 * Drive drum preview via __project6581Test and assert studioTrace drum:* onsets.
 * Requires dist/residfp.wasm, Chrome, and a static server on PORT (default 8765).
 *
 *   node scripts/drum-sequence-trace-smoke.mjs --fixture ch-only-16
 */
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const wasmPath=path.join(root,'dist/residfp.wasm');

function parseArgs(argv){
 let fixture='ch-only-16',port=8765,steps=8;
 for(let i=2;i<argv.length;i++){
  const a=argv[i];
  if(a==='--fixture'&&argv[i+1])fixture=argv[++i];
  else if(a==='--port'&&argv[i+1])port=Number(argv[++i]);
  else if(a==='--steps'&&argv[i+1])steps=Number(argv[++i]);
 }
 return {fixture,port,steps};
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

async function main(){
 if(!existsSync(wasmPath)){
  console.error('Missing '+wasmPath+' — run npm run build:wasm');
  process.exit(2);
 }
 const {fixture,port,steps}=parseArgs(process.argv);
 const fixtureJson=JSON.parse(
  readFileSync(path.join(root,'test/fixtures/drum-audio',fixture+'.json'),'utf8'),
 );
 const server=await startStaticServer(port);
 const chrome=process.env.CHROME_PATH??'/usr/bin/google-chrome';
 const browser=await puppeteer.launch({
  executablePath:chrome,
  headless:'new',
  args:['--no-sandbox','--autoplay-policy=no-user-gesture-required'],
 });
 try{
  const page=await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/index.html?testHooks=1`,{waitUntil:'domcontentloaded'});
  await waitSidReady(page);
  await page.evaluate(data=>{
   const hooks=globalThis.__project6581Test;
   hooks.setMasterBpm(120);
   hooks.loadDrumSequence({enabled:true,steps:16,rate:4,sync:true,localBpm:120,...data.sequence});
   hooks.drumPreview(true);
  },fixtureJson);
  await delay(steps*125+200);
  const result=await page.evaluate(expected=>{
   const hooks=globalThis.__project6581Test;
   hooks.drumPreview(false);
   const ons=hooks.listDrumNoteOns();
   return {count:ons.length,expected,lanes:[...new Set(ons.map(e=>e.source))]};
  },fixture==='ch-only-16'?steps:4);
  if(fixture==='ch-only-16'&&result.count<steps)
   throw new Error('Expected >='+steps+' drum note-ons, got '+result.count);
  if(fixture==='kick-four-on-floor'&&result.count<2)
   throw new Error('Expected kick onsets, got '+result.count);
  console.log('OK',fixture,result);
 }finally{
  await browser.close();
  server.close();
 }
}

main().catch(err=>{console.error(err);process.exit(1);});