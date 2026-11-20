import {startSidStudio} from './sid-studio.js?v=0.18.12+20261120T183917605Z';

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