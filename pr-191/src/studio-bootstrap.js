import {startSidStudio} from './sid-studio.js?v=0.20.3+20261123T193945993Z';

export function bootSidStudio(){
 try{startSidStudio();}
 catch(error){
  document.getElementById('sidSpinner').hidden=true;
  let detail='unknown error';
  if(error&&error.message)detail=error.message;
  else if(error)detail=String(error);
  document.getElementById('sidEngineStatus').textContent='SID failed to start: '+detail;
 }
}