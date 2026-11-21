/*
 * Optional SID register-write trace hook for Instrument Lab capture.
 * GPL-2.0-or-later (libsidplayfp).
 */
#ifndef SIDREGISTERTRACE_H
#define SIDREGISTERTRACE_H

#include "EventScheduler.h"

#include <cstdint>

namespace libsidplayfp
{

struct SidRegisterTraceSink
{
    void (*onWrite)(void *user, event_clock_t cycle, unsigned chip, unsigned reg, uint8_t value);
    bool (*shouldStop)(void *user);
    void *user = nullptr;
};

SidRegisterTraceSink *sidRegisterTraceSink();
void setSidRegisterTraceSink(SidRegisterTraceSink *sink);

void traceSidRegisterWrite(EventScheduler &scheduler, unsigned chip, unsigned reg, uint8_t value);

}

#endif