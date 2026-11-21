#!/usr/bin/env bash
# Build the native libsidplayfp register-capture backend (optional CI / dev tool).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENDOR="$ROOT/vendor/libsidplayfp"
OVERLAY="$ROOT/native/sid-lab-capture/overlay"
OUT="$ROOT/dist/sid-lab-capture"
PATCH="$OVERLAY/libsidplayfp-register-trace.patch"

mkdir -p "$ROOT/vendor" "$ROOT/dist"

if [[ ! -d "$VENDOR/.git" ]]; then
  git clone --branch v2.14.0 https://github.com/libsidplayfp/libsidplayfp.git "$VENDOR"
fi

if [[ ! -d "$VENDOR/src/builders/exsid-builder/driver/m4" ]]; then
  git -C "$VENDOR" submodule update --init --depth 1
fi

# Copy trace hook sources and bank headers (GPL-2.0-or-later; see agents/sid-lab-upstream.md).
cp "$OVERLAY/src/SidRegisterTrace.h" "$OVERLAY/src/SidRegisterTrace.cpp" "$VENDOR/src/"
cp "$OVERLAY/src/c64/Banks/SidBank.h" "$OVERLAY/src/c64/Banks/ExtraSidBank.h" "$VENDOR/src/c64/Banks/"

if ! grep -q SidRegisterTrace "$VENDOR/Makefile.am"; then
  patch -d "$VENDOR" -p1 < "$PATCH"
fi

cd "$VENDOR"
if [[ ! -f configure ]]; then
  autoreconf -fi
fi

if [[ ! -f Makefile ]] || ! grep -q '^XA = xa' Makefile 2>/dev/null; then
  ./configure --disable-shared --enable-static --disable-dependency-tracking
fi

make -j"$(nproc)"

g++ -std=c++20 -O2 -DHAVE_CONFIG_H -I"$VENDOR/src" -I"$VENDOR/src/builders/residfp-builder" \
  "$ROOT/native/sid-lab-capture/sid-lab-capture.cpp" \
  -Wl,--start-group \
  "$VENDOR/src/.libs/libsidplayfp.a" \
  "$VENDOR/src/builders/residfp-builder/.libs/libsidplayfp-residfp.a" \
  "$VENDOR/src/builders/residfp-builder/residfp/.libs/libresidfp.a" \
  -Wl,--end-group \
  -lgcrypt -lpthread -o "$OUT"

echo "Built $OUT"