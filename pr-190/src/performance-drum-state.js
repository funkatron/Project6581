/** Running state for drum transport (DRUM pill, independent of arp toggles). */
export function createPerformanceDrumState() {
  const listeners = new Set();
  let running = false;

  function notify() {
    const snapshot = {drumOn: running};
    for (const fn of listeners) fn(snapshot);
  }

  return {
    get drumOn() {
      return running;
    },
    setRunning(value) {
      const next = Boolean(value);
      if (running === next) return false;
      running = next;
      notify();
      return true;
    },
    subscribe(fn) {
      listeners.add(fn);
      fn({drumOn: running});
      return () => listeners.delete(fn);
    },
    fieldForGenerator() {
      return 'drumOn';
    },
  };
}