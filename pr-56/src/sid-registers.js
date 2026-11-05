// SID register mapping, independent of the eventual WebAssembly renderer.
// PAL C64 clock. All register writes are 8-bit.
export const PAL_CLOCK = 985248;
export const ADSR_MS = [2,8,16,24,38,56,68,80,100,250,500,800,1000,3000,5000,8000];
export const WAVE = {triangle:0x10,sawtooth:0x20,pulse:0x40,square:0x40,noise:0x80};
export const freqRegister = (hz,clock=PAL_CLOCK) => Math.max(0,Math.min(65535,Math.round(hz*16777216/clock)));
export const midiHz = note => 440*Math.pow(2,(note-69)/12);
export const closestRate = seconds => ADSR_MS.reduce((best,ms,i)=>Math.abs(ms-seconds*1000)<Math.abs(ADSR_MS[best]-seconds*1000)?i:best,0);
export const sustainNibble = value => Math.max(0,Math.min(15,Math.round(value*15)));
export const pulseRegister = percent => Math.max(1,Math.min(4094,Math.round(percent/100*4095)));
export class SidRegisters {
  constructor(write,clock=PAL_CLOCK){this.write=write;this.clock=clock;this.controls=[0,0,0];this.frequencies=[null,null,null];this.envelopes=[null,null,null];this.pulses=[null,null,null];this.filterRegisters=new Map();}
  reg(voice,offset,value){if(!Number.isInteger(voice)||voice<0||voice>2)throw new RangeError('voice');this.write(voice*7+offset,value&255)}
  noteOn(voice,note,settings){
    const freq=freqRegister(midiHz(note),this.clock),pw=pulseRegister(settings.pulse??50);
    this.reg(voice,0,freq);this.reg(voice,1,freq>>8);this.frequencies[voice]=freq;
    this.reg(voice,2,pw);this.reg(voice,3,pw>>8);this.pulses[voice]=pw;
    const attack=closestRate(settings.attack??0.01),decay=closestRate(settings.decay??0.18);
    const sustain=sustainNibble(settings.sustain??.65),release=closestRate(settings.release??.22);
    const ad=attack<<4|decay,sr=sustain<<4|release;
    this.reg(voice,5,ad);this.reg(voice,6,sr);this.envelopes[voice]=[ad,sr];
    const wave=WAVE[settings.wave]??WAVE.triangle;
    this.controls[voice]=wave|1;this.reg(voice,4,wave);this.reg(voice,4,wave|1);
  }
  noteOff(voice){this.controls[voice]&=~1;this.reg(voice,4,this.controls[voice]);}
  setFrequency(voice,note){
    if(!Number.isInteger(voice)||voice<0||voice>2)throw new RangeError('voice');
    const freq=freqRegister(midiHz(note),this.clock);
    if(this.frequencies[voice]===freq)return;
    this.reg(voice,0,freq);this.reg(voice,1,freq>>8);this.frequencies[voice]=freq;
  }
  setEnvelope(voice,{attack=0.01,decay=0.18,sustain=0.65,release=0.22}={}){
    if(!Number.isInteger(voice)||voice<0||voice>2)throw new RangeError('voice');
    const ad=(closestRate(attack)<<4)|closestRate(decay);
    const sr=(sustainNibble(sustain)<<4)|closestRate(release);
    const previous=this.envelopes[voice];
    if(!previous||previous[0]!==ad)this.reg(voice,5,ad);
    if(!previous||previous[1]!==sr)this.reg(voice,6,sr);
    this.envelopes[voice]=[ad,sr];
  }
  setPulse(voice,percent){
    if(!Number.isInteger(voice)||voice<0||voice>2)throw new RangeError('voice');
    const pw=pulseRegister(percent);
    if(this.pulses[voice]===pw)return;
    this.reg(voice,2,pw);this.reg(voice,3,pw>>8);this.pulses[voice]=pw;
  }
  setFilter({cutoff=1024,resonance=0,routing=7,mode='lowpass',volume=15}={}){
    const fc=Math.max(0,Math.min(2047,Math.round(cutoff)));
    const modes={lowpass:0x10,bandpass:0x20,highpass:0x40};
    const values=[[0x15,fc&7],[0x16,fc>>3],
      [0x17,(Math.max(0,Math.min(15,resonance))<<4)|(routing&15)],
      [0x18,(modes[mode]??0x10)|(volume&15)]];
    for(const [register,value] of values){
      if(this.filterRegisters.get(register)===value)continue;
      this.write(register,value);this.filterRegisters.set(register,value);
    }
  }
}
