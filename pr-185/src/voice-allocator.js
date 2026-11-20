// The SID has exactly three oscillator voices. Allocate one slot per active note.
export class VoiceAllocator {
  constructor(count=3){this.count=count;this.slots=Array(count).fill(null);this.age=0}
  on(note){
    const existing=this.slots.findIndex(s=>s?.note===note);
    if(existing>=0)return {voice:existing,retrigger:false,stolen:null};
    let voice=this.slots.findIndex(s=>s===null);
    if(voice<0)voice=this.slots.reduce((oldest,s,i,a)=>s.age<a[oldest].age?i:oldest,0);
    const stolen=this.slots[voice]?.note??null;
    this.slots[voice]={note,age:++this.age};
    return {voice,retrigger:true,stolen};
  }
  off(note){
    const voice=this.slots.findIndex(s=>s?.note===note);
    if(voice<0)return null;
    this.slots[voice]=null;return voice;
  }
  clear(){const voices=this.slots.map((s,i)=>s?i:null).filter(v=>v!==null);this.slots.fill(null);return voices}
}
