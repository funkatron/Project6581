#!/usr/bin/env bash
set -euo pipefail
: "${EMSDK:?Activate Emscripten first}"
mkdir -p vendor dist
if [[ ! -d vendor/libresidfp/.git ]]; then
  git clone --depth 1 --branch v1.1.2 https://github.com/libsidplayfp/libresidfp.git vendor/libresidfp
fi
cd vendor/libresidfp
autoreconf -fi
emconfigure ./configure --host=wasm32-unknown-emscripten --build=x86_64-pc-linux-gnu --disable-shared --enable-static --disable-dependency-tracking
emmake make -j2
cd ../..
em++ -O2 -std=c++17 -fexceptions -Ivendor/libresidfp/src \
  native/sid_bridge.cpp vendor/libresidfp/src/.libs/libresidfp.a \
  -s STANDALONE_WASM=1 -s WASM_BIGINT=1 -s ALLOW_MEMORY_GROWTH=0 \
  -s INITIAL_MEMORY=33554432 -Wl,--no-entry \
  -Wl,--export=sid_init -Wl,--export=sid_write \
  -Wl,--export=sid_render -Wl,--export=sid_pcm_ptr \
  -Wl,--export=sid_reset -o dist/residfp.wasm
echo 'Built dist/residfp.wasm'
