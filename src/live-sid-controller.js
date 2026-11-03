import {SidRegisters} from './sid-registers.js';
import {VoiceAllocator} from './voice-allocator.js';

// Event-driven front end. The sink may be a worklet port or a test recorder.
// No audio approximation is silently substituted for a missing SID engine.
export class LiveSidController {
  constructor(sink,{clock}={}){
    this.sink=sink;this.allocator=new VoiceAllocator(3);
    this.registers=new SidRegisters((register,value)=>sink({type:'write',register,value}),clock);
  }
  noteOn(note,settings){
    const {voice,retrigger,stolen}=this.allocator.on(note);
    if(retrigger){if(stolen!==null)this.registers.noteOff(voice);this.registers.noteOn(voice,note,settings)}
    return {voice,stolen};
  }
  noteOff(note){const voice=this.allocator.off(note);if(voice!==null)this.registers.noteOff(voice);return voice}
  panic(){for(const voice of this.allocator.clear())this.registers.noteOff(voice)}
  setFilter(settings){this.registers.setFilter(settings)}
  setPulse(voice,percent){this.registers.setPulse(voice,percent)}
}
