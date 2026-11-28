import {parseMidiMessage} from './midi-message.js?v=0.30.0+20261128T010628315Z';

function listInputs(access){
 const out=[];
 for(const input of access.inputs.values())out.push(input);
 out.sort((a,b)=>String(a.name||a.id).localeCompare(String(b.name||b.id)));
 return out;
}

export function midiOwnerKey(channel,note){
 return channel+':'+note;
}

/** MIDI note routing isolated for unit tests and mountMidiInput. */
export function createMidiInputController({
 traceInput,keyDown,keyUp,isBlocked=()=>false,pitchPhysicallyHeld=()=>false,sourceTag='midi'
}={}){
 const midiKeys=new Set();
 const midiDroveDown=new Set();
 const sustainByChannel=new Map();
 function sustainFor(channel){
 let state=sustainByChannel.get(channel);
 if(!state){state={down:false,pending:new Set()};sustainByChannel.set(channel,state)}
 return state;
}
 function noteOn(channel,note){
  const key=midiOwnerKey(channel,note);
  if(midiKeys.has(key))return;
  midiKeys.add(key);
  traceInput(note,sourceTag,'down',()=>{
   if(!pitchPhysicallyHeld(note)){
    keyDown(note);
    midiDroveDown.add(key);
   }
  });
 }
 function releaseMidiKey(key,note){
  const drove=midiDroveDown.delete(key);
  midiKeys.delete(key);
  if(drove)traceInput(note,sourceTag,'up',()=>keyUp(note));
 }
 function noteOff(channel,note){
  const key=midiOwnerKey(channel,note);
  const sustain=sustainFor(channel);
  if(sustain.down){
   if(midiKeys.has(key))sustain.pending.add(key);
   return;
  }
  if(!midiKeys.has(key))return;
  releaseMidiKey(key,note);
 }
 function flushSustainReleases(channel){
  const sustain=sustainFor(channel);
  for(const key of sustain.pending)releaseMidiKey(key,Number(key.split(':')[1]));
  sustain.pending.clear();
 }
 function onMidiMessage(event){
  const msg=parseMidiMessage(event.data);
  if(!msg)return;
  if(msg.kind==='note-on'){
   if(isBlocked())return;
   noteOn(msg.channel,msg.note);
  }else if(msg.kind==='note-off')noteOff(msg.channel,msg.note);
  else if(msg.kind==='cc'&&msg.controller===64){
   const sustain=sustainFor(msg.channel);
   const down=msg.value>=64;
   if(sustain.down&&!down)flushSustainReleases(msg.channel);
   sustain.down=down;
  }
 }
 function releaseAll(){
  for(const key of [...midiKeys]){
   const note=Number(key.split(':')[1]);
   releaseMidiKey(key,note);
  }
  sustainByChannel.clear();
 }
 function setSourceTag(tag){sourceTag=tag||'midi'}
 return {onMidiMessage,releaseAll,setSourceTag};
}

export function mountMidiInput({
 $,traceInput,keyDown,keyUp,isBlocked=()=>false,pitchPhysicallyHeld=()=>false
}={}){
 const enable=$('midiEnable');
 const portSelect=$('midiPort');
 const channelSelect=$('midiChannel');
 const status=$('midiStatus');
 if(!enable||!portSelect||!channelSelect||!status)return {releaseAll:()=>{}};
 let access=null,activeInput=null;
 const controller=createMidiInputController({traceInput,keyDown,keyUp,isBlocked,pitchPhysicallyHeld});
 function setStatus(text){status.textContent=text}
 function channelMatches(channel){
  const filter=Number(channelSelect.value);
  return !filter||filter===channel;
 }
 function onMidiMessage(event){
  if(!enable?.checked)return;
  const msg=parseMidiMessage(event.data);
  if(!msg||!channelMatches(msg.channel))return;
  controller.onMidiMessage(event);
 }
 function bindInput(input){
  if(activeInput)activeInput.onmidimessage=null;
  activeInput=input;
  controller.setSourceTag('midi:'+(input?.name||input?.id||'in'));
  if(activeInput)activeInput.onmidimessage=onMidiMessage;
 }
 function fillPorts(selectedId){
  portSelect.replaceChildren();
  const blank=document.createElement('option');
  blank.value='';
  blank.textContent='— Select input —';
  portSelect.append(blank);
  if(access){
   for(const input of listInputs(access)){
    const option=document.createElement('option');
    option.value=input.id;
    option.textContent=input.name||input.id;
    portSelect.append(option);
   }
  }
  if(selectedId&&[...portSelect.options].some(o=>o.value===selectedId))portSelect.value=selectedId;
  else if(portSelect.options.length>1)portSelect.value=portSelect.options[1].value;
 }
 async function connectPort(id){
  if(!access){bindInput(null);return}
  const input=id?access.inputs.get(id):null;
  if(!input||(activeInput&&activeInput!==input))controller.releaseAll();
  bindInput(input||null);
  setStatus(input?'Listening on '+(input.name||input.id):'Choose a MIDI input port.');
 }
 async function requestAccess(){
  if(!navigator.requestMIDIAccess){
   setStatus('Web MIDI is not available in this browser (try desktop Chrome or Edge).');
   enable.checked=false;
   return;
  }
  try{
   access=await navigator.requestMIDIAccess({sysex:false});
   access.onstatechange=()=>{
    const prev=portSelect.value;
    if(activeInput&&!access.inputs.has(activeInput.id))controller.releaseAll();
    fillPorts(prev);
    void connectPort(portSelect.value);
   };
   fillPorts(portSelect.value);
   await connectPort(portSelect.value);
  }catch{
   enable.checked=false;
   setStatus('MIDI access denied.');
  }
 }
 enable.addEventListener('change',()=>{
  if(enable.checked)void requestAccess();
  else{
   controller.releaseAll();
   bindInput(null);
   setStatus('MIDI input off.');
  }
 });
 portSelect.addEventListener('change',()=>{
  controller.releaseAll();
  void connectPort(portSelect.value);
 });
 channelSelect.addEventListener('change',()=>controller.releaseAll());
 if(!navigator.requestMIDIAccess)setStatus('Web MIDI is not available in this browser (try desktop Chrome or Edge).');
 else setStatus('Enable MIDI and allow access when prompted.');
 return {releaseAll:()=>controller.releaseAll()};
}