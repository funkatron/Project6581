import {readFileSync} from 'node:fs';
const bytes=readFileSync('dist/residfp.wasm');
const mod=await WebAssembly.compile(bytes);
const imports={};
for(const item of WebAssembly.Module.imports(mod)){
  if(item.kind==='function'){
    (imports[item.module]??={})[item.name]=()=>0;
  }else throw Error('Unsupported import: '+JSON.stringify(item));
}
const instance=await WebAssembly.instantiate(mod,imports);
const e=instance.exports;
e._initialize?.();
for(const rate of [44100,48000]){
  const ok=e.sid_init(6581,rate);
  console.log('SID initialization:',{rate,ok,stage:e.sid_init_stage?.()});
  if(ok!==1)throw Error('SID initialization failed at '+rate+' Hz, stage '+e.sid_init_stage?.());
  e.sid_write(0,0x30);e.sid_write(1,0x20);
  e.sid_write(5,0x00);e.sid_write(6,0xf0);e.sid_write(4,0x21);
  if(e.sid_render(128)!==128)throw Error('SID rendering failed');
  const ptr=e.sid_pcm_ptr();
  if(ptr<0||ptr+256>e.memory.buffer.byteLength)throw Error('Invalid PCM pointer');
}
