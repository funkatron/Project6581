// GPL-2.0-or-later, matching libresidfp. Native wrapper for standalone WASM.
#include "SID.h"
#include <cstdint>
#include <memory>
#include <array>
#include <algorithm>
#include <exception>
#include <cstring>
namespace {
std::array<std::unique_ptr<reSIDfp::SID>, 3> chips;
int16_t scratch[4096];
int16_t buffer[4096];
int init_stage = 0;
char init_error[256] = "";
void record_error(const char* message) {
  std::strncpy(init_error, message, sizeof(init_error)-1);
  init_error[sizeof(init_error)-1] = '\0';
}
}
extern "C" {
int sid_init(int model, int sample_rate) {
  init_stage = 1;
  init_error[0] = '\0';
  try {
    for (auto& chip : chips) {
      chip = std::make_unique<reSIDfp::SID>();
      init_stage = 2;
      chip->setChipModel(model == 8580 ? reSIDfp::CSG8580 : reSIDfp::MOS6581);
      init_stage = 3;
      chip->setSamplingParameters(985248.0, reSIDfp::DECIMATE, sample_rate);
      init_stage = 4;
      chip->reset();
      init_stage = 5;
      chip->write(0x18,0x0f);
    }
    init_stage = 6;
    return 1;
  } catch (const std::exception& err) { record_error(err.what()); for(auto& chip : chips)chip.reset(); return 0; }
    catch (...) { record_error("Unknown native exception"); for(auto& chip : chips)chip.reset(); return 0; }
}
int sid_init_stage() { return init_stage; }
const char* sid_init_error() { return init_error; }
void sid_write(int reg, int value) {
  // Chip-local registers are addressed in 0x20-byte banks.
  const int index=reg/0x20, local=reg%0x20;
  if (index>=0 && index<3 && local<=0x18 && chips[index]) chips[index]->write(local,static_cast<uint8_t>(value));
}
int sid_render(int frames) {
  if (!chips[0] || frames < 1 || frames > 4096) return 0;
  std::fill(buffer,buffer+frames,0);
  // Each emulated SID is rendered independently, then mixed with headroom.
  int32_t mixed[4096] = {};
  for (auto& chip : chips) {
    if (!chip) continue;
    chip->clock(scratch, frames);
    for(int i=0;i<frames;i++) mixed[i]+=scratch[i];
  }
  for(int i=0;i<frames;i++) buffer[i]=static_cast<int16_t>(std::clamp(mixed[i]/3,-32768,32767));
  return frames;
}
uintptr_t sid_pcm_ptr() { return reinterpret_cast<uintptr_t>(buffer); }
void sid_reset() { for(auto& chip:chips)if(chip)chip->reset(); }
}
