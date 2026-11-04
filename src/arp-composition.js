// Stateless helpers: regular Arp selects a root, Game Arp voices a pattern.
export const GAME_PATTERNS=Object.freeze({
 action:Object.freeze([0,12,7,12,0,7,12,19]),
 adventure:Object.freeze([0,3,7,12,7,3,10,7]),
 arcade:Object.freeze([0,12,0,7,12,7,3,7])
});
export function selectRoot(notes,pattern,step=0,randomValue=Math.random()){
 if(!Array.isArray(notes)||!notes.length)return null;
 const sorted=[...notes].sort((a,b)=>a-b);
 if(pattern==='random'){
  const index=Math.max(0,Math.min(sorted.length-1,Math.floor(randomValue*sorted.length)));
  return sorted[index];
 }
 const ordered=pattern==='down'?[...sorted].reverse()
  :pattern==='updown'&&sorted.length>1?[...sorted,...sorted.slice(1,-1).reverse()]
  :sorted;
 return ordered[step%ordered.length];
}
export function patternPitch(root,style,step){
 if(root===null)return null;
 const offsets=GAME_PATTERNS[style]??GAME_PATTERNS.action;
 return Math.max(0,Math.min(127,root+offsets[step%offsets.length]));
}
export function stepMilliseconds(bpm,rate){
 const tempo=Number(bpm),division=Number(rate);
 if(!Number.isFinite(tempo)||tempo<=0||!Number.isFinite(division)||division<=0)
  throw new RangeError('Invalid arpeggiator tempo or rate');
 return 60000/tempo/division;
}
