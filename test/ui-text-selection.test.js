import test from 'node:test';
import assert from 'node:assert/strict';
import {readStudioCoreCss} from './studio-css.mjs';

function declarationBlock(css,selector){
 const start=css.indexOf(selector);
 if(start<0)return '';
 const brace=css.indexOf('{',start);
 if(brace<0)return '';
 let depth=0;
 for(let index=brace;index<css.length;index++){
  if(css[index]==='{')depth++;
  else if(css[index]==='}'){
   depth--;
   if(depth===0)return css.slice(brace+1,index);
  }
 }
 return '';
}

test('main shell disables accidental text selection on controls and keys',()=>{
 const css=readStudioCoreCss();
 const mainBlock=declarationBlock(css,'main{');
 const keyBlock=declarationBlock(css,'.key{');
 const exceptionBlock=declarationBlock(
  css,
  'textarea,input[type=text],input[type=search],input[type=number],#sidReportFallback{'
 );
 assert.match(mainBlock,/(?:^|;)\s*-webkit-user-select:\s*none/);
 assert.match(mainBlock,/(?:^|;)\s*user-select:\s*none/);
 assert.match(mainBlock,/(?:^|;)\s*touch-action:\s*manipulation/);
 assert.match(keyBlock,/(?:^|;)\s*user-select:\s*none/);
 assert.match(exceptionBlock,/(?:^|;)\s*user-select:\s*text/);
 assert.match(exceptionBlock,/(?:^|;)\s*-webkit-touch-callout:\s*default/);
 const presetBlock=declarationBlock(css,'#presetDialog .preset-item,#presetDialog input[type=search],#presetDialog input[type=text]{');
 assert.match(presetBlock,/(?:^|;)\s*user-select:\s*text/);
});