// Shared filter Hz → SID register conversion for main thread and worklet modulation.
export function filterRegisters({cutoffHz,resonancePct,volumePct,mode}){
 const hz=Number(cutoffHz);
 const cutoff=Math.round(Math.max(0,Math.min(1,(hz-50)/9950))*2047);
 const resonance=Math.round(Math.max(0,Math.min(100,Number(resonancePct)||0))*15/100);
 const volume=Math.round(Math.max(0,Math.min(100,Number(volumePct)||0))*15/100);
 const modes={lowpass:0x10,bandpass:0x20,highpass:0x40};
 const modeBits=modes[mode]??0x10;
 const fc=cutoff;
 return [
  [0x15,fc&7],[0x16,fc>>3],
  [0x17,(resonance<<4)|(7&15)],
  [0x18,modeBits|(volume&15)]
 ];
}