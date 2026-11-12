// Share a single validated WASM download across SID engine instances.
// Each AudioWorklet receives a copy because transferring an ArrayBuffer detaches it.
const cache = new Map();
export function loadSidWasm(url, {fetchImpl=fetch, compile=WebAssembly.compile, imports=WebAssembly.Module.imports} = {}) {
  if (cache.has(url)) return cache.get(url);
  const pending = (async () => {
    const response = await fetchImpl(url, {cache:'no-store'});
    if (!response.ok) throw Error('reSIDfp WASM unavailable (build artifact not deployed)');
    const bytes = await response.arrayBuffer();
    const module = await compile(bytes);
    const unsupported = imports(module).filter(({module,name}) =>
      module === 'env' && (/^invoke_/.test(name) || /^dynCall_/.test(name)));
    if (unsupported.length) throw Error('Downloaded WASM has unsupported imports: ' +
      unsupported.map(x => x.module + '.' + x.name).join(', ') + '. The deployed binary is incompatible.');
    return bytes;
  })();
  cache.set(url, pending);
  pending.catch(() => { if (cache.get(url) === pending) cache.delete(url); });
  return pending;
}
