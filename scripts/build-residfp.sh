#!/usr/bin/env bash
set -euo pipefail
: "${EMSDK:?Activate Emscripten first}"
mkdir -p vendor dist
if [[ ! -d vendor/libresidfp/.git ]]; then
  git clone --depth 1 --branch v1.1.2 https://github.com/libsidplayfp/libresidfp.git vendor/libresidfp
fi
# libresidfp launches six threads during 6581 filter table construction.
# Standalone AudioWorklet WASM cannot create those threads.
python3 - <<'PY'
from pathlib import Path
p = Path('vendor/libresidfp/src/FilterModelConfig6581.cpp')
s = p.read_text()
start = s.index('#ifdef HAVE_JTHREADS\n    using sidThread = std::jthread;')
end = s.index('\n}', start)
replacement = '''    filterSummer();
    filterMixer();
    filterGain();
    filterResonance();
    filterVcrVg();
    filterVcrIds();'''
s = s[:start] + replacement + s[end:]
p.write_text(s)

p = Path('vendor/libresidfp/src/FilterModelConfig8580.cpp')
s = p.read_text()
start = s.index('#ifdef HAVE_JTHREADS\\n    using sidThread = std::jthread;')
end = s.index('\\n}', start)
replacement = '''    filterSummer();
    filterMixer();
    filterGain();
    filterResonance();'''
s = s[:start] + replacement + s[end:]
p.write_text(s)
PY
cd vendor/libresidfp
autoreconf -fi
CXXFLAGS='-O2 -fwasm-exceptions' emconfigure ./configure --host=wasm32-unknown-emscripten --build=x86_64-pc-linux-gnu --disable-shared --enable-static --disable-dependency-tracking
emmake make -j2
cd ../..
em++ -O2 -std=c++17 -fwasm-exceptions -Ivendor/libresidfp/src \
  native/sid_bridge.cpp vendor/libresidfp/src/.libs/libresidfp.a \
  -s STANDALONE_WASM=1 -s WASM_BIGINT=1 -s ALLOW_MEMORY_GROWTH=0 \
  -s INITIAL_MEMORY=33554432 -Wl,--no-entry \
  -Wl,--export=sid_init -Wl,--export=sid_write \
  -Wl,--export=sid_render -Wl,--export=sid_pcm_ptr \
  -Wl,--export=sid_reset -Wl,--export=sid_init_stage -Wl,--export=sid_init_error -o dist/residfp.wasm
echo 'Built dist/residfp.wasm'
