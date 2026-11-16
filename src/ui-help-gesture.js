import {openHelp} from './ui-help-dialog.js?v=__BUILD_ID__';

export function bindHelpGesture(element,{helpId,onTap=null,longMs=550,moveTolerance=10,$=id=>document.getElementById(id)}={}){
 if(!element||!helpId)return;
 let timer=null;
 let startX=0;
 let startY=0;
 let longFired=false;
 const clear=()=>{if(timer){clearTimeout(timer);timer=null}};
 element.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;
  longFired=false;
  startX=event.clientX;
  startY=event.clientY;
  clear();
  timer=setTimeout(()=>{
   longFired=true;
   const label=element.getAttribute('aria-label')||element.textContent?.trim()||'control';
   openHelp(helpId,{leadIn:'You long-pressed '+label+'.',$});
  },longMs);
 });
 element.addEventListener('pointermove',event=>{
  if(!timer)return;
  if(Math.hypot(event.clientX-startX,event.clientY-startY)>moveTolerance)clear();
 });
 element.addEventListener('pointerup',event=>{
  clear();
  if(longFired){event.preventDefault();return}
  if(onTap)onTap(event);
 });
 element.addEventListener('pointercancel',clear);
 element.addEventListener('contextmenu',event=>{
  event.preventDefault();
  openHelp(helpId,{leadIn:'Help',$});
 });
}
