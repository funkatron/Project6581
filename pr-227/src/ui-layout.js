/** Keep panel geometry fixed when a control is inactive (tool UX, not document flow). */
export function setLayoutInert(element,inert){
 if(!element)return;
 element.classList.toggle('layout-inert',inert);
 if(inert){
  element.setAttribute('inert','');
  element.setAttribute('aria-hidden','true');
 }else{
  element.removeAttribute('inert');
  element.removeAttribute('aria-hidden');
 }
}