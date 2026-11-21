// GPL-2.0-or-later, matching libresidfp. Native wrapper for standalone WASM.
#include "SID.h"
#include <cstdint>
#include <memory>
#include <array>
#include <algorithm>
#include <exception>
#include <cstring>
#include <cmath>
namespace {
constexpr int kChipCount = 4;
std::array<std::unique_ptr<reSIDfp::SID>, kChipCount> chips;
int16_t scratch[4096];
int16_t buffer[8192];
std::array<float, kChipCount> chip_pan{};
std::array<float, kChipCount> chip_gain{};
std::array<float, kChipCount> chip_peak{};
int init_stage = 0;
char init_error[256] = "";
constexpr double kPi = 3.14159265358979323846;
void record_error(const char* message) {
  std::strncpy(init_error, message, sizeof(init_error)-1);
  init_error[sizeof(init_error)-1] = '\0';
}
std::pair<float, float> pan_gains(float pan) {
  const float clamped = std::max(-1.f, std::min(1.f, pan));
  const float angle = static_cast<float>((clamped + 1.0) * 0.25 * kPi);
  return {std::cos(angle), std::sin(angle)};
}
float gain_from_db(int db) {
  if (db <= 0) return 1.f;
  return std::pow(10.f, static_cast<float>(db) / 20.f);
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
    chip_gain.fill(1.f);
    chip_gain[3] = gain_from_db(6);
    init_stage = 6;
    return 1;
  } catch (const std::exception& err) { record_error(err.what()); for(auto& chip : chips)chip.reset(); return 0; }
    catch (...) { record_error("Unknown native exception"); for(auto& chip : chips)chip.reset(); return 0; }
}
int sid_init_stage() { return init_stage; }
const char* sid_init_error() { return init_error; }
int sid_set_chip_model(int chip, int model) {
  if (chip < 0 || chip >= kChipCount || !chips[chip]) return 0;
  try {
    chips[chip]->setChipModel(model == 8580 ? reSIDfp::CSG8580 : reSIDfp::MOS6581);
    chips[chip]->reset();
    chips[chip]->write(0x18,0x0f);
    return 1;
  } catch (const std::exception& err) {
    record_error(err.what());
    return 0;
  } catch (...) {
    record_error("Unknown native exception");
    return 0;
  }
}
void sid_set_pan(int chip, int panPercent) {
  if (chip < 0 || chip >= kChipCount) return;
  const float pan = static_cast<float>(std::max(-100, std::min(100, panPercent))) / 100.f;
  chip_pan[chip] = pan;
}
void sid_set_chip_gain(int chip, int gainDb) {
  if (chip < 0 || chip >= kChipCount) return;
  chip_gain[chip] = gain_from_db(gainDb);
}
void sid_write(int reg, int value) {
  if(reg<0)return;
  const int index=reg/0x20, local=reg%0x20;
  if(index<kChipCount && local<=0x18 && chips[index]) chips[index]->write(local,static_cast<uint8_t>(value));
}
int sid_render(int frames) {
  if (!chips[0] || frames < 1 || frames > 4096) return 0;
  std::fill(buffer,buffer+frames*2,0);
  int32_t mixedL[4096] = {};
  int32_t mixedR[4096] = {};
  for (int index = 0; index < kChipCount; ++index) {
    auto& chip = chips[index];
    if (!chip) continue;
    chip->clock(scratch, frames);
    float blockPeak = 0.f;
    const auto [leftGain, rightGain] = pan_gains(chip_pan[index]);
    const float busGain = chip_gain[index];
    constexpr float kBusDivisor = static_cast<float>(kChipCount);
    for (int i = 0; i < frames; ++i) {
      const int32_t sample = static_cast<int32_t>(static_cast<float>(scratch[i]) * busGain);
      const float normalized = static_cast<float>(std::abs(sample)) / 32768.f;
      const float busL = normalized * leftGain / kBusDivisor;
      const float busR = normalized * rightGain / kBusDivisor;
      const float busPeak = std::max(busL, busR);
      if (busPeak > blockPeak) blockPeak = busPeak;
      mixedL[i] += static_cast<int32_t>(sample * leftGain);
      mixedR[i] += static_cast<int32_t>(sample * rightGain);
    }
    // Per-chip meters track post-pan bus contribution (matches mixed PCM master meter).
    chip_peak[index] = std::max(chip_peak[index] * 0.85f, blockPeak);
  }
  for (int i = 0; i < frames; ++i) {
    const int32_t left = std::clamp(mixedL[i] / kChipCount, -32768, 32767);
    const int32_t right = std::clamp(mixedR[i] / kChipCount, -32768, 32767);
    buffer[i * 2] = static_cast<int16_t>(left);
    buffer[i * 2 + 1] = static_cast<int16_t>(right);
  }
  return frames;
}
uintptr_t sid_pcm_ptr() { return reinterpret_cast<uintptr_t>(buffer); }
uintptr_t sid_chip_peaks_ptr() { return reinterpret_cast<uintptr_t>(chip_peak.data()); }
void sid_reset() { for(auto& chip : chips)if(chip)chip->reset(); }
}