export function mountLfoPanel({$,lfoState,lfoTargets,lfoTargetNames,syncedRates,onChange}={}){
 if(!$||!lfoState)throw new TypeError('mountLfoPanel requires $ and lfoState');
 function renderLfos(){
  const root=$('lfoControls');root.replaceChildren();
  lfoState.forEach((lfo,index)=>{
   const group=document.createElement('fieldset');group.className='lfo-controls';
   const legend=document.createElement('legend');legend.textContent='LFO '+(index+1);group.append(legend);
   const fields=[['enabled','On'],['sync','Sync'],['wave','Wave'],['target','Target'],['engines','Engines'],['rate','Rate'],['depth','Depth']];
   for(const [prop,label] of fields){
    const row=document.createElement('label');row.textContent=label+' ';
    const isSwitch=prop==='enabled'||prop==='sync';
    const isSelect=prop==='wave'||prop==='target'||prop==='engines'||(prop==='rate'&&lfo.sync);
    const input=document.createElement(isSelect?'select':'input');
    if(isSwitch){input.type='checkbox';input.checked=Boolean(lfo[prop]);}
    else if(isSelect){
     const engineChoices=['all','1','2','3'];
     const choices=prop==='wave'?['sine','triangle','sawtooth','square','sample-hold']:
      prop==='target'?lfoTargets:prop==='engines'?engineChoices:syncedRates;
     choices.forEach(value=>{const option=document.createElement('option');option.value=String(prop==='rate'?value.value:value);option.textContent=prop==='rate'?value.label:prop==='engines'?(value==='all'?'All':('SID '+value)):prop==='target'?lfoTargetNames[value]||value:value;input.append(option)});
     const engineValue=lfo.engines??'all';
     input.value=String(prop==='rate'?lfo.syncDivision:prop==='engines'?engineValue:lfo[prop]);
    }else{
     input.type='range';input.min=prop==='rate'?'0.05':'0';input.max=prop==='rate'?'20':'100';input.step=prop==='rate'?'0.05':'1';input.value=prop==='rate'?lfo.rate:lfo.depth*100;
    }
    input.setAttribute('aria-label','LFO '+(index+1)+' '+label+(prop==='rate'?(lfo.sync?' division':' Hz'):''));
    const output=isSwitch||isSelect?null:document.createElement('output');
    if(output)output.textContent=prop==='rate'?Number(input.value).toFixed(2)+' Hz':input.value+'%';
    input.addEventListener(isSwitch||isSelect?'change':'input',()=>{
     if(isSwitch)lfo[prop]=input.checked;
     else if(prop==='rate'&&lfo.sync)lfo.syncDivision=Number(input.value);
     else if(prop==='depth')lfo.depth=Number(input.value)/100;
     else lfo[prop]=isSelect?input.value:Number(input.value);
     if(output)output.textContent=prop==='rate'?Number(input.value).toFixed(2)+' Hz':input.value+'%';
     if(prop==='sync')renderLfos();
     onChange?.();
    });
    row.append(input);if(output)row.append(output);group.append(row);
   }
   root.append(group);
  });
 }
 renderLfos();
 return {renderLfos};
}