// Pure root and pattern selection. Timekeeping and SID gates stay in the app.
export const GAME_PATTERNS=Object.freeze({
 action:Object.freeze([0,12,7,12,0,7,12,19]),
 adventure:Object.freeze([0,3,7,12,7,3,10,7]),
 arcade:Object.freeze([0,12,0,7,12,7,3,7])
});

export function chooseRoot(notes,pattern,step,random=Math.random()){
 if(!notes.length)return null;
 const sorted=[...notes].sort((a,b)=>a-b);
 const sequence=pattern==='down'?[...sorted].reverse()
  :pattern==='updown'&&sorted.length>1?[...sorted,...sorted.slice(1,-1).reverse()]
  :sorted;
 if(pattern==='random')return sorted[Math.min(sorted.length-1,Math.max(0,Math.floor(random*sorted.length)))];
 return sequence[step%sequence.length];
}

export function patternPitch(root,style,step){
 if(root===null)return null;
 const offsets=GAME_PATTERNS[style]??GAME_PATTERNS.action;
 return Math.max(0,Math.min(127,root+offsets[step%offsets.length]));
}

export function composePitch({notes,root,rootStep=0,gameStep=0,arpOn=false,gameOn=false,arpPattern='up',gameStyle='action',random=0}){
 if(!notes.length)return null;
 const selected=arpOn?chooseRoot(notes,arpPattern,rootStep,random)
  :(root??notes[notes.length-1]);
 return {root:selected,note:gameOn?patternPitch(selected,gameStyle,gameStep):selected};
}

// Values are multiples of a quarter note: 1 = 1/4; 4 = 1/16.
export function stepMilliseconds(bpm,rate){
 const tempo=Number(bpm),division=Number(rate);
 if(!Number.isFinite(tempo)||tempo<=0||!Number.isFinite(division)||division<=0)
  throw new RangeError('Invalid tempo or step rate');
 return 60000/tempo/division;
}
