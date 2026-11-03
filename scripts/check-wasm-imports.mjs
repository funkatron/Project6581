import {readFileSync} from 'node:fs';
const file=process.argv[2]??'dist/residfp.wasm';
const module=new WebAssembly.Module(readFileSync(file));
const imports=WebAssembly.Module.imports(module);
console.log('WASM imports:',JSON.stringify(imports));
const unsupported=imports.filter(({module,name,kind})=>
  /^invoke_/.test(name) || /^dynCall_/.test(name) ||
  (module==='env' && kind==='function' && !['emscripten_notify_memory_growth'].includes(name)));
if(unsupported.length) {
  console.error('WASM requires Emscripten JS glue:',JSON.stringify(unsupported));
  process.exitCode=1;
}
