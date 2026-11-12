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
  await page.goto('http://127.0.0.1:8765/');
  await page.evaluate(async()=>{
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
   localStorage.setItem('project6581.user-presets.v4',JSON.stringify({version:4,presets:[{id:'fnk-latency',name:'FNK Deep Bass diagnostic',settings}]}));
  });
  await page.reload();
  await page.waitForFunction(()=>['ready','on'].includes(document.querySelector('#sidLed')?.dataset.state),null,{timeout:30000});
  await page.locator('#presetOpen').click();
  await page.locator('#userPresetList button[data-id="fnk-latency"]').click();
  await page.waitForFunction(()=>document.querySelector('#chip')?.value==='8580'&&['ready','on'].includes(document.querySelector('#sidLed')?.dataset.state),null,{timeout:30000});
  const initial=await page.evaluate(()=>({led:document.querySelector('#sidLed')?.dataset.state,status:document.querySelector('#sidEngineStatus')?.textContent}));
  console.log(path,'initial',JSON.stringify(initial));
  if(path==='enable-audio-first'){
   const unlock=page.locator('#sidUnlock');
   if(await unlock.isVisible())await unlock.click();
   await page.waitForFunction(()=>document.querySelector('#sidLed')?.dataset.state==='on',null,{timeout:10000});
  }
  const key=page.locator('#keyboard .key').first();
  await key.dispatchEvent('pointerdown',{pointerId:1,bubbles:true});
  await page.waitForTimeout(900);
  const snapshot=await page.evaluate(()=>({led:document.querySelector('#sidLed')?.dataset.state,status:document.querySelector('#sidEngineStatus')?.textContent,playback:document.querySelector('#sidPlaybackStatus')?.textContent,timing:document.querySelector('#audioTimingDetails')?.textContent?.slice(0,2000)}));
  console.log('STARTUP_PATH_DIAGNOSTIC',JSON.stringify({path,initial,snapshot}));
  await context.close();
 }
}finally{await browser.close()}
