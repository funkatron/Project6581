/*
 * Project6581 SID Instrument Lab: libsidplayfp register-write capture backend.
 *
 * Reads a JSON capture request on stdin (see agents/sid-lab-6510-capture-design.md),
 * executes the tune, and writes {"events":[...]} to stdout.
 *
 * GPL-2.0-or-later — links against libsidplayfp (GPL).
 */
#include "config.h"
#include "sidplayfp/sidplayfp.h"
#include "sidplayfp/SidTune.h"
#include "sidplayfp/SidConfig.h"
#include "sidplayfp/SidTuneInfo.h"
#include "builders/residfp-builder/residfp.h"
#include "SidRegisterTrace.h"

#include <algorithm>
#include <chrono>
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <iostream>
#include <string>
#include <vector>

namespace
{

struct CaptureLimits
{
    unsigned subtune = 1;
    uint64_t maxCycles = 9'852'480;
    uint64_t maxEvents = 1'000'000;
    unsigned timeoutMs = 60'000;
};

struct SidEvent
{
    int64_t cycle;
    unsigned chip;
    unsigned registerIndex;
    unsigned value;
};

struct TraceCollectorState
{
    CaptureLimits limits;
    std::vector<SidEvent> events;
    bool limitHit = false;
    int64_t highestCycle = 0;
};

void onTraceWrite(void *user, libsidplayfp::event_clock_t cycle, unsigned chip, unsigned reg, uint8_t value)
{
    auto *state = static_cast<TraceCollectorState *>(user);
    if (state->limitHit)
        return;
    if (static_cast<uint64_t>(cycle) > state->limits.maxCycles)
    {
        state->limitHit = true;
        return;
    }
    if (state->events.size() >= state->limits.maxEvents)
    {
        state->limitHit = true;
        return;
    }
    state->highestCycle = std::max(state->highestCycle, static_cast<int64_t>(cycle));
    state->events.push_back({cycle, chip, reg, value});
}

bool onTraceShouldStop(void *user)
{
    auto *state = static_cast<TraceCollectorState *>(user);
    return state->limitHit;
}

std::string readStdin()
{
    std::string data;
    data.reserve(4096);
    char buffer[8192];
    while (std::cin.read(buffer, sizeof(buffer)) || std::cin.gcount() > 0)
        data.append(buffer, static_cast<size_t>(std::cin.gcount()));
    return data;
}

bool parseUnsigned(const std::string &json, const char *key, unsigned &out)
{
    const std::string needle = std::string("\"") + key + "\":";
    const size_t pos = json.find(needle);
    if (pos == std::string::npos)
        return false;
    size_t i = pos + needle.size();
    while (i < json.size() && (json[i] == ' ' || json[i] == '\t'))
        i++;
    if (i >= json.size())
        return false;
    char *end = nullptr;
    const unsigned long value = std::strtoul(json.c_str() + i, &end, 10);
    if (end == json.c_str() + i)
        return false;
    out = static_cast<unsigned>(value);
    return true;
}

bool parseU64(const std::string &json, const char *key, uint64_t &out, bool required)
{
    const std::string needle = std::string("\"") + key + "\":";
    const size_t pos = json.find(needle);
    if (pos == std::string::npos)
        return !required;
    size_t i = pos + needle.size();
    while (i < json.size() && (json[i] == ' ' || json[i] == '\t'))
        i++;
    if (i >= json.size())
        return false;
    char *end = nullptr;
    const unsigned long long value = std::strtoull(json.c_str() + i, &end, 10);
    if (end == json.c_str() + i)
        return false;
    out = value;
    return true;
}

std::vector<uint8_t> decodeBase64(const std::string &input)
{
    static const int8_t table[256] = {
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,62,-1,-1,-1,63,52,53,54,55,56,57,58,59,60,61,-1,-1,-1,-1,-1,-1,
        -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,-1,-1,-1,-1,-1,
        -1,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,-1,-1,-1,-1,-1,
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
        -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
    };
    std::vector<uint8_t> out;
    out.reserve(input.size() * 3 / 4);
    int val = 0;
    int valb = -8;
    for (unsigned char c : input)
    {
        if (c == '=' || c == '"' || c == ' ' || c == '\n' || c == '\r' || c == '\t')
            continue;
        const int8_t dec = table[c];
        if (dec < 0)
            continue;
        val = (val << 6) + dec;
        valb += 6;
        if (valb >= 0)
        {
            out.push_back(static_cast<uint8_t>((val >> valb) & 0xff));
            valb -= 8;
        }
    }
    return out;
}

bool extractSidBase64(const std::string &json, std::string &out)
{
    const char *key = "\"sidBase64\":";
    const size_t pos = json.find(key);
    if (pos == std::string::npos)
        return false;
    size_t i = pos + std::strlen(key);
    while (i < json.size() && (json[i] == ' ' || json[i] == '\t'))
        i++;
    if (i >= json.size() || json[i] != '"')
        return false;
    i++;
    const size_t end = json.find('"', i);
    if (end == std::string::npos)
        return false;
    out = json.substr(i, end - i);
    return true;
}

void writeJsonEvents(const std::vector<SidEvent> &events)
{
    std::cout << "{\"events\":[";
    for (size_t i = 0; i < events.size(); i++)
    {
        const SidEvent &event = events[i];
        if (i)
            std::cout << ',';
        std::cout << "{\"cycle\":" << event.cycle
                  << ",\"chip\":" << event.chip
                  << ",\"register\":" << event.registerIndex
                  << ",\"value\":" << event.value << '}';
    }
    std::cout << "]}\n";
}

} // namespace

int main()
{
    const std::string request = readStdin();
    if (request.empty())
    {
        std::cerr << "Empty capture request\n";
        return 2;
    }

    CaptureLimits limits;
    if (!parseUnsigned(request, "subtune", limits.subtune))
        limits.subtune = 1;
    parseU64(request, "maxCycles", limits.maxCycles, false);
    parseU64(request, "maxEvents", limits.maxEvents, false);
  unsigned timeoutMs = 60'000;
    parseUnsigned(request, "timeoutMs", timeoutMs);
    limits.timeoutMs = timeoutMs;

    std::string b64;
    if (!extractSidBase64(request, b64))
    {
        std::cerr << "Missing sidBase64 field\n";
        return 2;
    }
    const std::vector<uint8_t> sidBytes = decodeBase64(b64);
    if (sidBytes.empty())
    {
        std::cerr << "Invalid sidBase64 payload\n";
        return 2;
    }

    SidTune tune(sidBytes.data(), static_cast<uint_least32_t>(sidBytes.size()));
    if (!tune.getStatus())
    {
        std::cerr << tune.statusString() << '\n';
        return 1;
    }

    const unsigned songs = tune.getInfo()->songs();
    if (limits.subtune < 1 || limits.subtune > songs)
    {
        std::cerr << "Subtune out of range\n";
        return 2;
    }

    tune.selectSong(limits.subtune);

    ReSIDfpBuilder builder("Project6581 sid-lab-capture");
    builder.create(1);
    if (!builder.getStatus())
    {
        std::cerr << builder.error() << '\n';
        return 1;
    }

    sidplayfp engine;
    SidConfig cfg;
    cfg.sidEmulation = &builder;
    cfg.frequency = 44100;
    cfg.samplingMethod = SidConfig::INTERPOLATE;
    cfg.playback = SidConfig::MONO;
    cfg.powerOnDelay = 0;

    if (!engine.config(cfg))
    {
        std::cerr << engine.error() << '\n';
        return 1;
    }

    if (!engine.load(&tune))
    {
        std::cerr << engine.error() << '\n';
        return 1;
    }

    TraceCollectorState collector;
    collector.limits = limits;

    libsidplayfp::SidRegisterTraceSink sink;
    sink.user = &collector;
    sink.onWrite = onTraceWrite;
    sink.shouldStop = onTraceShouldStop;
    libsidplayfp::setSidRegisterTraceSink(&sink);

    const auto started = std::chrono::steady_clock::now();
    std::vector<short> buffer(4096);

    while (engine.isPlaying())
    {
        const auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::steady_clock::now() - started).count();
        if (static_cast<unsigned>(elapsed) > limits.timeoutMs)
            break;
        if (collector.limitHit)
            break;
        if (static_cast<uint64_t>(collector.highestCycle) >= limits.maxCycles)
            break;

        const uint_least32_t samples = engine.play(buffer.data(), buffer.size() / 2);
        if (samples == 0)
            break;
    }

    // Drain a short tail so single-shot init routines still complete after the player stops.
    for (int i = 0; i < 20 && !collector.limitHit; i++)
        engine.play(2000);

    libsidplayfp::setSidRegisterTraceSink(nullptr);
    writeJsonEvents(collector.events);
    return 0;
}