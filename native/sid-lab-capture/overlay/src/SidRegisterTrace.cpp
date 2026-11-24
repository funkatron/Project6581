/*
 * Optional SID register-write trace hook for Instrument Lab capture.
 */
#include "SidRegisterTrace.h"

namespace libsidplayfp
{

static SidRegisterTraceSink *g_sink = nullptr;

SidRegisterTraceSink *sidRegisterTraceSink()
{
    return g_sink;
}

void setSidRegisterTraceSink(SidRegisterTraceSink *sink)
{
    g_sink = sink;
}

void traceSidRegisterWrite(EventScheduler &scheduler, unsigned chip, unsigned reg, uint8_t value)
{
    SidRegisterTraceSink *sink = g_sink;
    if (sink == nullptr || sink->onWrite == nullptr)
        return;
    const event_clock_t cycle = scheduler.getTime(EVENT_CLOCK_PHI2);
    sink->onWrite(sink->user, cycle, chip, reg, value);
}

}