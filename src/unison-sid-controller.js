import {SidRegisters} from './sid-registers.js';

// Three authentic SID chips provide nine hardware oscillators; expose up to eight.
// The newest pressed key owns the unison stack.
export class UnisonSidController {
  constructor(write,{voiceCount=1,detune=0}={}){
    this.chips=Array.from({length:3},(_,chip)=>new SidRegisters((reg,value)=>write(chip*0x20+reg,value)));
    this.voiceCount=voiceCount;this.detune=detune;this.held=[];this.current=null;this.settings=null;
  }
  configure({voiceCount=this.voiceCount,detune=this.detune}={}){
    const count=Math.max(1,Math.min(8,Math.round(Number(voiceCount)||1)));
    const cents=Math.max(0,Math.min(100,Number(detune)||0));
    if(count===this.voiceCount&&cents===this.detune)return;
    this.panic();this.voiceCount=count;this.detune=cents;
  }
  noteOn(note,settings){
    this.held=this.held.filter(n=>n!==note);this.held.push(note);
    this.settings=typeof settings==='function'?settings(0):settings;
    this.render(note);
  }
  render(note){
    this.releaseVoices();
    this.current=note;
    for(let i=0;i<this.voiceCount;i++){
      const offset=this.voiceCount===1?0:(i-(this.voiceCount-1)/2)*2*this.detune/(this.voiceCount-1);
      const chip=Math.floor(i/3),voice=i%3;
      this.chips[chip].noteOn(voice,note+offset/100,this.settings);
    }
  }
  releaseVoices(){
    if(this.current===null)return;
    for(let i=0;i<this.voiceCount;i++)this.chips[Math.floor(i/3)].noteOff(i%3);
    this.current=null;
  }
  noteOff(note){
    this.held=this.held.filter(n=>n!==note);
    if(this.current!==note)return;
    if(this.held.length)this.render(this.held[this.held.length-1]);
    else this.releaseVoices();
  }
  panic(){this.releaseVoices();this.held=[]}
  setFilter(settings){for(const chip of this.chips)chip.setFilter(settings)}
  setPulse(_voice,percent){
    for(let i=0;i<this.voiceCount;i++)this.chips[Math.floor(i/3)].setPulse(i%3,percent);
  }
}
