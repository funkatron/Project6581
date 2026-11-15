// Maps pitch-envelope breakpoints onto a graph. No DOM.
// Time grows to the right. Positive semitones sit above the played note.

const MIN_TIME_MS=200;
const TIME_HEADROOM=1.25;
const MIN_SEMITONE_SPAN=12;
const SEMITONE_PAD=4;
const MAX_SEMITONES=48;
const MAX_TIME_MS=10000;

export function pitchGraphAxes(points){
 if(!Array.isArray(points)||points.length<1)throw new RangeError('Pitch graph needs at least one point');
 const last=points[points.length-1].ms;
 const timeMax=Math.max(last*TIME_HEADROOM,MIN_TIME_MS);
 let peak=0;
 for(const point of points){
  const abs=Math.abs(point.semitones);
  if(abs>peak)peak=abs;
 }
 let semitoneMax=Math.max(MIN_SEMITONE_SPAN,peak+SEMITONE_PAD);
 if(semitoneMax>MAX_SEMITONES)semitoneMax=MAX_SEMITONES;
 return {timeMax,semitoneMax};
}

export function pointToGraph(point,axes,width,height){
 if(width<=0||height<=0)throw new RangeError('Graph size must be positive');
 const x=(point.ms/axes.timeMax)*width;
 const span=axes.semitoneMax*2;
 const y=((axes.semitoneMax-point.semitones)/span)*height;
 return {x,y};
}

export function graphToPoint(x,y,axes,width,height){
 if(width<=0||height<=0)throw new RangeError('Graph size must be positive');
 const ms=(x/width)*axes.timeMax;
 const span=axes.semitoneMax*2;
 const semitones=axes.semitoneMax-(y/height)*span;
 return {ms,semitones};
}

// The first breakpoint stays at note-on. Any other point stops before it
// crosses the previous or next time, and pitch stays inside ±48 semitones.
export function clampDraggedPoint(index,ms,semitones,points){
 let nextMs=ms;
 if(index===0){
  nextMs=0;
 }else{
  const previous=points[index-1].ms;
  let minMs=previous+1;
  let maxMs=MAX_TIME_MS;
  if(index<points.length-1)maxMs=points[index+1].ms-1;
  if(nextMs<minMs)nextMs=minMs;
  if(nextMs>maxMs)nextMs=maxMs;
 }
 let nextSemitones=semitones;
 if(nextSemitones>MAX_SEMITONES)nextSemitones=MAX_SEMITONES;
 if(nextSemitones<-MAX_SEMITONES)nextSemitones=-MAX_SEMITONES;
 return {ms:nextMs,semitones:nextSemitones};
}

export function hitTestPitchPoint(x,y,points,axes,width,height,radius){
 let best=-1;
 let bestDistance=radius;
 for(let index=0;index<points.length;index++){
  const placed=pointToGraph(points[index],axes,width,height);
  const distance=Math.hypot(placed.x-x,placed.y-y);
  if(distance<=bestDistance){
   best=index;
   bestDistance=distance;
  }
 }
 return best;
}

// A tap in empty space becomes a breakpoint inserted in time order.
// Returns null when the phrase is full or the tap has no free millisecond.
export function proposePitchPoint(x,y,points,axes,width,height,maxPoints){
 if(points.length>=maxPoints)return null;
 if(width<=0||height<=0)return null;
 const raw=graphToPoint(x,y,axes,width,height);
 let semitones=Math.round(raw.semitones);
 if(semitones>MAX_SEMITONES)semitones=MAX_SEMITONES;
 if(semitones<-MAX_SEMITONES)semitones=-MAX_SEMITONES;
 let ms=Math.round(raw.ms);
 if(ms<0)ms=0;
 if(ms>MAX_TIME_MS)ms=MAX_TIME_MS;
 let index=points.length;
 for(let i=0;i<points.length;i++){
  if(points[i].ms>ms){
   index=i;
   break;
  }
 }
 if(index===0)index=1;
 const previous=points[index-1].ms;
 const nextMs=index<points.length?points[index].ms:MAX_TIME_MS+1;
 if(ms<=previous)ms=previous+1;
 if(ms>=nextMs)ms=nextMs-1;
 if(ms<=previous||ms>=nextMs||ms>MAX_TIME_MS)return null;
 return {index,point:{ms,semitones}};
}
