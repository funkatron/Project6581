// Reproduce the reported iPad startup-path latency with the FNK Deep Bass settings.
// This is a timing diagnostic, not a measurement of physical speaker latency.
import {webkit,chromium} from 'playwright';
const engine=process.env.BROWSER==='chromium'?chromium:webkit;
const browser=await engine.launch({headless:true});
try{
 for(const path of ['keyboard-first','enable-audio-first']){
  const context=await browser.newContext({viewport:{width:820,height:1180},hasTouch:true,isMobile:engine===webkit});
  const page=await context.newPage();
  page.on('pageerror',e=>console.error(path,'pageerror',e.message));
  await page.addInitScript(() => {
   const NativeAudioContext=window.AudioContext;
   window.AudioContext=class extends NativeAudioContext {
    constructor(...args){super(...args);window.__sidDiagnosticContext=this}
   };
  });
  await page.goto('http://127.0.0.1:8765/');
  const presetSettings=await page.evaluate(async()=>{
   const {defaultPresetSettings}=await import('./src/preset-library.js');
   const settings=defaultPresetSettings();
   settings.sound.model=8580;
   Object.assign(settings.sound.voice,{wave:'square',attack:0,decay:1.36,sustain:0,release:0.01,pulse:76,pwmDepth:7,pwmRate:2.7});
   Object.assign(settings.sound.instrument,{voiceCount:8,unisonCount:8,mode:'legato',detune:7});
   Object.assign(settings.sound.filter,{cutoff:1230,resonance:100,volume:80,mode:'lowpass'});
   settings.sound.lfos=[
    {enabled:true,sync:true,wave:'sine',rate:1,syncDivision:0.5,depth:0.14,target:'cutoff',phase:0,seed:0},
    {enabled:true,sync:true,wave:'sine',rate:1,syncDivision:4,depth:0.38,target:'pulse',phase:0,seed:1},
    {enabled:true,sync:true,wave:'sine',rate:1,syncDivision:0.25,depth:0.6,target:'decay',phase:0,seed:2}
   ];
   settings.performance.masterBpm=86;
   Object.assign(settings.performance.game,{enabled:true,style:'custom',rate:4,sequence:{length:16,steps:[0,-7,-6,0,0,4,0,-5,0,3,7,12,1,3,-12,-2].map(offset=>({offset,gate:true,duration:75}))}});
   return settings;
  });
  await page.locator('#presetOpen').click();
  await page.locator('#presetFile').setInputFiles({name:'fnk-deep-bass.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({type:'project6581-preset',version:4,preset:{name:'FNK Deep Bass',settings:presetSettings}}))});
  await page.locator('#userPresetList button').filter({hasText:'FNK Deep Bass'}).click();
  try { await page.waitForFunction(()=>document.querySelector('#chip')?.value==='8580'&&['ready','on'].includes(document.querySelector('#sidLed')?.dataset.state),null,{timeout:30000}); }
  catch(error){console.error('PRESET_LOAD_DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>({chip:document.querySelector('#chip')?.value,led:document.querySelector('#sidLed')?.dataset.state,status:document.querySelector('#sidEngineStatus')?.textContent,preset:document.querySelector('#presetStatus')?.textContent,startup:document.querySelector('#audioTimingSummary')?.textContent}))));throw error;}
  console.log('PRESET_LOADED',path,JSON.stringify(await page.evaluate(()=>({chip:document.querySelector('#chip')?.value,led:document.querySelector('#sidLed')?.dataset.state,status:document.querySelector('#sidEngineStatus')?.textContent}))));
  // Both paths MUST begin with a genuinely suspended AudioContext.
  await page.evaluate(async()=>{await window.__sidDiagnosticContext.suspend()});
  const initial=await page.evaluate(()=>({
   state:window.__sidDiagnosticContext.state,
   currentTime:window.__sidDiagnosticContext.currentTime,
   led:document.querySelector('#sidLed')?.dataset.state,
   status:document.querySelector('#sidEngineStatus')?.textContent
  }));
  if(initial.state!=='suspended')throw new Error('Invalid diagnostic: context not suspended');
  console.log('SUSPENDED_CONTEXT',path,JSON.stringify(initial));
  // Enable the application's existing diagnostics before sending the first note.
  await page.locator('#sidEventLogging').check();
  await page.locator('#audioTimingDetails').evaluate(el=>{el.open=true;el.dispatchEvent(new Event('toggle'))});
  if(path==='enable-audio-first'){
   await page.locator('#sidUnlock').click();
   await page.waitForFunction(()=>window.__sidDiagnosticContext.state==='running',null,{timeout:10000});
  }
  const before=await page.evaluate(()=>({state:window.__sidDiagnosticContext.state,audioTime:window.__sidDiagnosticContext.currentTime,wallTime:performance.now()}));
  const key=page.locator('#keyboard .key').first();
  await key.scrollIntoViewIfNeeded();
  const rect=await key.boundingBox();
  if(!rect)throw new Error('Keyboard key not visible');
  await page.touchscreen.tap(rect.x+rect.width/2,rect.y+rect.height/2);
  await page.waitForTimeout(900);
  const snapshot=await page.evaluate(()=>({
   state:window.__sidDiagnosticContext.state,
   audioTime:window.__sidDiagnosticContext.currentTime,
   wallTime:performance.now(),
   led:document.querySelector('#sidLed')?.dataset.state,
   status:document.querySelector('#sidEngineStatus')?.textContent,
   playback:document.querySelector('#sidPlaybackStatus')?.textContent,
   timing:document.querySelector('#audioTimingSummary')?.textContent?.slice(0,3000),
   eventLog:document.querySelector('#sidEventLogging')?.checked
  }));
  if(snapshot.state!=='running')throw new Error('Audio context did not resume: '+JSON.stringify(snapshot));
  console.log('STARTUP_PATH_DIAGNOSTIC',JSON.stringify({path,initial,before,snapshot}));
  await context.close();
 }
}finally{await browser.close()}
