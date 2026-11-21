import {meterDisplayMasterWidth} from './sid-meter-display.js?v=0.21.5+20261121T182557147Z';

/** Combined output level from worklet mixed PCM (0–1). */
export function normalizeMasterPeak(level){
 const value=Number(level);
 if(!Number.isFinite(value)||value<=0)return 0;
 return Math.min(1,value);
}

export function mountMasterLoudnessMeter($){
 const root=$('masterLoudnessMeter');
 if(!root)return {update:()=>{}};
 const fill=root.querySelector('.master-rainbow-meter-fill');
 function update(level){
  const width=meterDisplayMasterWidth(normalizeMasterPeak(level));
  if(fill)fill.style.width=width;
  root.setAttribute('aria-label','Overall output level '+width);
 }
 update(0);
 return {update};
}