// Programmatic control writes should go through here so every view and
// listener sees the same change. Used by performance slices and future UI.

export function setControlChecked(input, checked, {emitChange=true}={}){
  if(!input)return false;
  const next=Boolean(checked);
  if(input.checked===next)return false;
  input.checked=next;
  if(emitChange)input.dispatchEvent(new Event('change',{bubbles:true}));
  return true;
}

export function setControlValue(input, value, {emitChange=true}={}){
  if(!input)return false;
  const next=String(value);
  if(input.value===next)return false;
  input.value=next;
  if(emitChange)input.dispatchEvent(new Event('change',{bubbles:true}));
  return true;
}