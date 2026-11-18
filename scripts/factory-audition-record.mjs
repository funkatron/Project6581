#!/usr/bin/env node
/**
 * Batch-record factory presets using the in-app WAV/M4A path (reSIDfp → AudioWorklet).
 * Requires dist/residfp.wasm and Chrome/Chromium.
 *
 *   node scripts/factory-audition-record.mjs --format m4a --out /opt/cursor/artifacts/factory-audition
 */
import {createServer} from 'node:http';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createReadStream,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';
import {FACTORY_PRESETS,factoryGroup} from '../src/preset-library.js';
import {FACTORY_AUDITION_PHRASES} from '../src/factory-audition-matrix.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const NOTE=/^([A-G])(?:#|♯)?(\d)$/i;

function parseArgs(argv){
 const opts={format:'wav',out:path.join(root,'artifacts/factory-audition'),port:8765,limit:0,ids:null};
 for(let i=2;i<argv.length;i++){
  const a=argv[i];
  if(a==='--format'&&argv[i+1])opts.format=argv[++i].toLowerCase();
  else if(a==='--out'&&argv[i+1])opts.out=argv[++i];
  else if(a==='--port'&&argv[i+1])opts.port=Number(argv[++i]);
  else if(a==='--limit'&&argv[i+1])opts.limit=Number(argv[++i]);
  else if(a==='--ids'&&argv[i+1])opts.ids=new Set(argv[++i].split(','));
  else if(a==='--help'){console.log(`Usage: node scripts/factory-audition-record.mjs [--format wav|m4a] [--out DIR] [--ids id,id] [--limit N]`);process.exit(0)}
 }
 if(!['wav','m4a'].includes(opts.format))throw new Error('--format must be wav or m4a');
 return opts;
}

function noteNameToMidi(text){
 const m=text.trim().match(NOTE);
 if(!m)throw new Error('Bad note: '+text);
 const semis={'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11};
 const letter=m[1].toUpperCase();
 const sharp=text.includes('#')||text.includes('♯');
 const octave=Number(m[2]);
 const semi=(semis[letter]??0)+(sharp?1:0);
 return (octave+1)*12+semi;
}

function phraseToActions(phrase){
 if(!phrase||phrase==='—'||phrase==='-')return [];
 const s=phrase.trim().replace(/\//g,' ');
 const chordParts=s.split(/[–-]/).map(p=>p.trim()).filter(p=>NOTE.test(p));
 if(chordParts.length>1)return chordParts.map(noteNameToMidi);
 const low=s.toLowerCase();
 if(low.includes('rapid')||low.includes('repeats')||low.includes('repeat')){
  const stripped=s.replace(/\s*(rapid|repeats|repeat).*/i,'').trim();
  const parts=stripped.split(/\s+/).filter(t=>NOTE.test(t));
  const midi=noteNameToMidi(parts[0]??stripped);
  const count=parts.length>1?parts.length:4;
  return parts.length>1?parts.map(noteNameToMidi):Array.from({length:count},()=>midi);
 }
 if(s.includes('→')){
  const stem=s.replace(/\s*(hold|overlap).*|\s*\(game arp\).*/gi,'').trim();
  return stem.split('→').map(t=>noteNameToMidi(t.trim()));
 }
 if(low.includes('hold')||low.includes('overlap')||low.includes('game arp')){
  const stem=s.replace(/\s*(hold|overlap).*|\s*\(game arp\).*/gi,'').trim();
  const held=stem.split(/[–-]/).map(p=>p.trim()).filter(p=>NOTE.test(p));
  if(held.length>1)return held.map(noteNameToMidi);
  return [noteNameToMidi(stem)];
 }
 if(low.includes('staccato'))return [noteNameToMidi(s.replace(/\s*staccato/i,''))];
 const tokens=s.split(/\s+/).map(t=>t.replace(/[,.].*$/,'')).filter(t=>NOTE.test(t));
 if(tokens.length>1)return tokens.map(noteNameToMidi);
 return [noteNameToMidi(tokens[0]??s.split(/\s/)[0])];
}

function midiForPreset(preset){
 const row=FACTORY_AUDITION_PHRASES[preset.id];
 const notes=[];
 if(row){
  for(const field of ['low','mid','high'])notes.push(...phraseToActions(row[field]));
 }
 if(!notes.length){
  const g=factoryGroup(preset.category);
  const defaults={Bass:[36,43],Keys:[60,64],Leads:[60,67],Drums:[48,52],FX:[60],Pad:[55,60]};
  notes.push(...(defaults[g]??defaults[preset.category]??[60]));
 }
 return [...new Set(notes)];
}

function mimeForFormat(format){
 return format==='m4a'?['audio/mp4;codecs=mp4a.40.2','audio/mp4']:['audio/wav'];
}

function startStaticServer(port){
 const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.mjs':'text/javascript','.wasm':'application/wasm','.svg':'image/svg+xml'};
 return new Promise(resolve=>{
  const server=createServer((req,res)=>{
   const url=req.url?.split('?')[0]||'/';
   const rel=url==='/'?'/index.html':url;
   const file=path.join(root,decodeURIComponent(rel));
   if(!file.startsWith(root)){res.writeHead(403);res.end();return}
   if(!existsSync(file)){res.writeHead(404);res.end();return}
   res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'});
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
 await page.waitForFunction(expected=>{
  const led=document.querySelector('#sidLed')?.dataset.state;
  const status=document.querySelector('#sidEngineStatus')?.textContent||'';
  return (led==='on'||led==='ready')&&(status.includes('ready')||status.includes('running')||status.includes('6581'));
 },{timeout:120000});
}

async function loadFactoryPreset(page,id){
 await page.click('#presetOpen');
 await page.waitForSelector('#presetDialog[open]');
 await page.click(`#factoryPresetList button.preset-item[data-id="${id}"]`);
 await page.waitForFunction(()=>!document.querySelector('#presetDialog')?.open,{timeout:30000});
 await delay(400);
}

async function ensureNotesVisible(page,notes){
 for(let attempt=0;attempt<14;attempt++){
  const range=await page.evaluate(()=>{
   const keys=[...document.querySelectorAll('#keyboard .key[data-note]')];
   if(!keys.length)return null;
   const nums=keys.map(k=>Number(k.dataset.note));
   return {min:Math.min(...nums),max:Math.max(...nums)};
  });
  if(!range)return;
  const needMin=Math.min(...notes),needMax=Math.max(...notes);
  if(needMin>=range.min&&needMax<=range.max)return;
  const down=await page.$('#octaveDown'),up=await page.$('#octaveUp');
  if(needMin<range.min&&down&&!(await page.evaluate(e=>e.disabled,down))){await down.click();await delay(150);continue}
  if(needMax>range.max&&up&&!(await page.evaluate(e=>e.disabled,up))){await up.click();await delay(150);continue}
  return;
 }
}

async function playNotes(page,notes,{holdMs=900,repeatGapMs=120}={}){
 await ensureNotesVisible(page,notes);
 for(const note of notes){
  const key=`#keyboard .key[data-note="${note}"]`;
  const handles=await page.$$(key);
  if(!handles.length){
   console.warn('Note',note,'not on keyboard; skipping');
   continue;
  }
  const el=handles[0];
  await el.evaluate((node,event)=>node.dispatchEvent(new PointerEvent(event,{bubbles:true,pointerId:1,cancelable:true,buttons:event==='pointerdown'?1:0})),'pointerdown');
  await delay(holdMs);
  await el.evaluate((node,event)=>node.dispatchEvent(new PointerEvent(event,{bubbles:true,pointerId:1,cancelable:true})),'pointerup');
  await delay(repeatGapMs);
 }
}

async function recordClip(page,format,notes,category){
 await page.click('#panic');
 await delay(200);
 if(format==='m4a'){
  const ok=await page.evaluate(mimes=>{
   return mimes.some(m=>globalThis.MediaRecorder?.isTypeSupported?.(m));
  },mimeForFormat('m4a'));
  if(!ok)throw new Error('M4A not supported in this browser — use --format wav');
 }
 await page.select('#recordFormat',format);
 await page.click('#recordToggle');
 await page.waitForFunction(()=>document.querySelector('#recordToggle')?.dataset.recording==='true');
 const hold=category==='Drums'?650:category==='Bass'||category==='Leads'?1100:1400;
 await playNotes(page,notes,{holdMs:hold});
 await delay(category==='Drums'?400:800);
 await page.click('#recordToggle');
 await page.waitForFunction(()=>{
  const link=document.querySelector('#recordDownload');
  return link&&!link.hidden&&link.href?.startsWith('blob:');
 },{timeout:60000});
 const data=await page.evaluate(async ()=>{
  const href=document.querySelector('#recordDownload').href;
  const res=await fetch(href);
  const buf=await res.arrayBuffer();
  return {bytes:[...new Uint8Array(buf)],href};
 });
 await page.evaluate(href=>URL.revokeObjectURL(href),data.href);
 return Buffer.from(data.bytes);
}

async function main(){
 const opts=parseArgs(process.argv);
 const wasm=path.join(root,'dist/residfp.wasm');
 if(!existsSync(wasm))throw new Error('Missing dist/residfp.wasm — build or download from GitHub Pages');
 await mkdir(opts.out,{recursive:true});

 const executablePath=process.env.CHROME_PATH||'/usr/bin/google-chrome';
 const server=await startStaticServer(opts.port);
 const url=`http://127.0.0.1:${opts.port}/`;

 let presets=FACTORY_PRESETS;
 if(opts.ids)presets=presets.filter(p=>opts.ids.has(p.id));
 if(opts.limit)presets=presets.slice(0,opts.limit);

 const browser=await puppeteer.launch({
  executablePath,
  headless:'new',
  protocolTimeout:180000,
  args:['--autoplay-policy=no-user-gesture-required','--use-fake-device-for-media-stream','--allow-file-access-from-files']
 });
 const page=await browser.newPage();
 const manifest={generatedAt:new Date().toISOString(),format:opts.format,presets:[]};
 try{
  page.on('console',msg=>{if(msg.type()==='error')console.error('page:',msg.text())});
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
  await waitSidReady(page);
  const supportsM4a=await page.evaluate(mimes=>mimes.some(m=>MediaRecorder?.isTypeSupported?.(m)),mimeForFormat('m4a'));
  manifest.m4aSupported=supportsM4a;
  if(opts.format==='m4a'&&!supportsM4a)
   throw new Error('This Chrome build does not support M4A recording. Use --format wav or record on Safari/iPad for native M4A.');

  for(const preset of presets){
   console.log('Recording',preset.id,'…');
   const notes=midiForPreset(preset);
   await loadFactoryPreset(page,preset.id);
   const blob=await recordClip(page,opts.format,notes,preset.category);
   const ext=opts.format==='m4a'?'m4a':'wav';
   const filename=`${preset.id}.${ext}`;
   await writeFile(path.join(opts.out,filename),blob);
   manifest.presets.push({id:preset.id,name:preset.name,category:preset.category,notes,filename,bytes:blob.length});
  }
  await writeFile(path.join(opts.out,'manifest.json'),JSON.stringify(manifest,null,2));
  console.log('Wrote',manifest.presets.length,'files to',opts.out);
 }finally{
  await browser.close();
  server.close();
 }
}

main().catch(err=>{console.error(err);process.exit(1)});