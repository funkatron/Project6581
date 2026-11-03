// GPL-2.0-or-later, matching libresidfp. Native wrapper for standalone WASM.
#include "SID.h"
#include <cstdint>
#include <memory>
#include <exception>
namespace {
std::unique_ptr<reSIDfp::SID> chip;
int16_t buffer[4096];
int init_stage = 0;
}
extern "C" {
int sid_init(int model, int sample_rate) {
  init_stage = 1;
  try {
    chip = std::make_unique<reSIDfp::SID>();
    init_stage = 2;
    chip->setChipModel(model == 8580 ? reSIDfp::CSG8580 : reSIDfp::MOS6581);
    init_stage = 3;
    chip->setSamplingParameters(985248.0, reSIDfp::DECIMATE, sample_rate);
    init_stage = 4;
    chip->reset();
    init_stage = 5;
    chip->write(0x18,0x0f);
    init_stage = 6;
    return 1;
  } catch (...) { chip.reset(); return 0; }
}
int sid_init_stage() { return init_stage; }
void sid_write(int reg, int value) {
  if (chip && reg >= 0 && reg <= 0x18) chip->write(reg,static_cast<uint8_t>(value));
}
int sid_render(int frames) {
  if (!chip || frames < 1 || frames > 4096) return 0;
  // The overloaded clock(buffer, bufferSize) produces exactly bufferSize samples.
  chip->clock(buffer, frames);
  return frames;
}
uintptr_t sid_pcm_ptr() { return reinterpret_cast<uintptr_t>(buffer); }
void sid_reset() { if(chip)chip->reset(); }
}
