#!/usr/bin/env node
/** Load factory showcases in headless Chrome; confirm Game Arp off and report arp rate. */
import {createServer} from 'node:http';
import {existsSync,createReadStream,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';
import {SHOWCASE_FACTORY_IDS,SFX_FACTORY_IDS} from '../src/preset-library.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const delay=ms=>new Promise(r=>setTimeout(r,ms));

function startStaticServer(port){
 const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm'};
 return new Promise(resolve=>{
  const server=createServer((req,res)=>{
   const url=req.url?.split('?')[0]||'/';
   const rel=url==='/'?'/index.html':url;
   const file=path.join(root,decodeURIComponent(rel));
   if(!file.startsWith(root)||!existsSync(file)){res.writeHead(404);res.end();return}
   res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'});
   createReadStream(file).pipe(res);
  });
  server.listen(port,()=>resolve(server));
 });
}

async function waitSidReady(page){
 await page.waitForFunction(()=>document.querySelectorAll('#keyboard .key').length>=12,{timeout:90000});
 await page.evaluate(()=>{document.getElementById('sidUnlock')?.click();document.getElementById('sidStart')?.click()});
 await page.click('#keyboard .key');
 await page.waitForFunction(()=>{
  const led=document.querySelector('#sidLed')?.dataset.state;
  return led==='on'||led==='ready';
 },{timeout:120000});
}

async function loadPreset(page,id){
 await page.click('#presetOpen');
 await page.waitForSelector('#presetDialog[open]');
 await page.click(`#factoryPresetList button.preset-item[data-id="${id}"]`);
 await page.waitForFunction(()=>!document.querySelector('#presetDialog')?.open);
 await delay(300);
}

async function main(){
 const port=8780;
 const outDir='/opt/cursor/artifacts/showcase-arp-audit';
 mkdirSync(outDir,{recursive:true});
 const server=await startStaticServer(port);
 const browser=await puppeteer.launch({
  executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',
  headless:'new',
  protocolTimeout:180000,
  args:['--autoplay-policy=no-user-gesture-required']
 });
 const report=[];
 try{
  const page=await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/`,{waitUntil:'domcontentloaded',timeout:120000});
  await waitSidReady(page);
  for(const id of [...SHOWCASE_FACTORY_IDS,...SFX_FACTORY_IDS]){
   await loadPreset(page,id);
   const flags=await page.evaluate(()=>({
    arpOn:Boolean(document.getElementById('arpOn')?.checked),
    gameOn:Boolean(document.getElementById('gameArpOn')?.checked),
    arpRate:document.getElementById('arpRate')?.value,
    gameRate:document.getElementById('gameRate')?.value,
    gameStyle:document.getElementById('gameArpStyle')?.value
   }));
   report.push({id,...flags});
  }
  writeFileSync(path.join(outDir,'audit.json'),JSON.stringify(report,null,2));
  const galwayGameOk=new Set(['showcase-galway-epic']);
  const bad=report.filter(r=>
   (r.gameOn&&!galwayGameOk.has(r.id))||
   (!r.id.startsWith('sfx-')&&Number(r.arpRate)>4));
  console.log('Audited',report.length,'presets;',bad.length,'flags outside policy');
  for(const row of bad)console.log(JSON.stringify(row));
 }finally{
  await browser.close();
  server.close();
 }
}

main().catch(e=>{console.error(e);process.exit(1)});