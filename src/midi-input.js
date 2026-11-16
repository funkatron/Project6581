import {parseMidiMessage} from './midi-message.js?v=__BUILD_ID__';

function listInputs(access){
 const out=[];
 for(const input of access.inputs.values())out.push(input);
 out.sort((a,b)=>String(a.name||a.id).localeCompare(String(b.name||b.id)));
 return out;
}

export function mountMidiInput({
 $,traceInput,keyDown,keyUp,isBlocked=()=>false
}={}){
 const enable=$('midiEnable');
 const portSelect=$('midiPort');
 const channelSelect=$('midiChannel');
 const status=$('midiStatus');
 if(!enable||!portSelect||!channelSelect||!status)return {releaseAll:()=>{}};
 let access=null,activeInput=null,sourceTag='midi';
 const touched=new Set();
 const sustain={down:false,pendingOff:new Set()};
 function setStatus(text){status.textContent=text}
 function channelMatches(channel){
  const filter=Number(channelSelect.value);
  return !filter||filter===channel;
 }
 function noteOn(note){
  if(touched.has(note))return;
  touched.add(note);
  traceInput(note,sourceTag,'down',()=>keyDown(note));
 }
 function noteOff(note){
  if(sustain.down){
   if(touched.has(note))sustain.pendingOff.add(note);
   return;
  }
  if(!touched.delete(note))return;
  traceInput(note,sourceTag,'up',()=>keyUp(note));
 }
 function flushSustainReleases(){
  for(const note of sustain.pendingOff){
   if(!touched.delete(note))continue;
   traceInput(note,sourceTag,'up',()=>keyUp(note));
  }
  sustain.pendingOff.clear();
 }
 function releaseAll(){
  for(const note of [...touched]){
   traceInput(note,sourceTag,'up',()=>keyUp(note));
  }
  touched.clear();
  sustain.pendingOff.clear();
  sustain.down=false;
 }
 function onMidiMessage(event){
  if(!enable?.checked||isBlocked())return;
  const msg=parseMidiMessage(event.data);
  if(!msg||!channelMatches(msg.channel))return;
  if(msg.kind==='note-on')noteOn(msg.note);
  else if(msg.kind==='note-off')noteOff(msg.note);
  else if(msg.kind==='cc'&&msg.controller===64){
   const down=msg.value>=64;
   if(sustain.down&&!down)flushSustainReleases();
   sustain.down=down;
  }
 }
 function bindInput(input){
  if(activeInput)activeInput.onmidimessage=null;
  activeInput=input;
  sourceTag='midi:'+(input?.name||input?.id||'in');
  if(activeInput)activeInput.onmidimessage=onMidiMessage;
 }
 function fillPorts(selectedId){
  const options=['<option value="">— Select input —</option>'];
  if(access){
   for(const input of listInputs(access))
    options.push('<option value="'+input.id+'">'+(input.name||input.id)+'</option>');
  }
  portSelect.innerHTML=options.join('');
  if(selectedId&&[...portSelect.options].some(o=>o.value===selectedId))portSelect.value=selectedId;
  else if(portSelect.options[1])portSelect.value=portSelect.options[1].value;
 }
 async function connectPort(id){
  if(!access){bindInput(null);return}
  const input=id?access.inputs.get(id):null;
  bindInput(input||null);
  setStatus(input?'Listening on '+input.name:'Choose a MIDI input port.');
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
   releaseAll();
   bindInput(null);
   setStatus('MIDI input off.');
  }
 });
 portSelect.addEventListener('change',()=>{
  releaseAll();
  void connectPort(portSelect.value);
 });
 channelSelect.addEventListener('change',()=>releaseAll());
 if(!navigator.requestMIDIAccess)setStatus('Web MIDI is not available in this browser (try desktop Chrome or Edge).');
 else setStatus('Enable MIDI and allow access when prompted.');
 return {releaseAll};
}