import {SidRegisters} from './sid-registers.js?v=__BUILD_ID__';
import {VoiceAllocator} from './voice-allocator.js?v=__BUILD_ID__';

// Event-driven front end. The sink may be a worklet port or a test recorder.
// No audio approximation is silently substituted for a missing SID engine.
export class LiveSidController {
  constructor(sink,{clock,voiceCount=3}={}){
    this.sink=sink;this.allocator=new VoiceAllocator(voiceCount);
    this.registers=new SidRegisters((register,value)=>sink({type:'write',register,value}),clock);
  }
  noteOn(note,settings){
    const {voice,retrigger,stolen}=this.allocator.on(note);
    if(retrigger){if(stolen!==null)this.registers.noteOff(voice);this.registers.noteOn(voice,note,typeof settings==='function'?settings(voice):settings)}
    return {voice,stolen};
  }
  noteOff(note){const voice=this.allocator.off(note);if(voice!==null)this.registers.noteOff(voice);return voice}
  panic(){for(const voice of this.allocator.clear())this.registers.noteOff(voice)}
  setFilter(settings){this.registers.setFilter(settings)}
  setPulse(voice,percent){this.registers.setPulse(voice,percent)}
}
