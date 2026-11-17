// Programmatic checkbox/toggle writes should go through here so every view and
// listener sees the same change. Used by performance-arp-state and future UI slices.

export function setControlChecked(input, checked, {emitChange=true}={}){
  if(!input)return false;
  const next=Boolean(checked);
  if(input.checked===next)return false;
  input.checked=next;
  if(emitChange)input.dispatchEvent(new Event('change',{bubbles:true}));
  return true;
}