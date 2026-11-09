// "Auto" theme: dark when the room is dark.
// Uses the Ambient Light Sensor where the browser exposes it (with hysteresis so
// it doesn't flicker); otherwise falls back to the local clock (dark 18:00–06:00).

export function createAmbient(apply, onSource) {
  let sensor = null, timer = 0, current = null, active = false;

  const set = t => { if (t !== current) { current = t; apply(t); } };
  const byClock = () => { const h = new Date().getHours(); set(h >= 18 || h < 6 ? 'dark' : 'light'); };
  const useClock = () => {
    if (sensor) { try { sensor.stop(); } catch {} sensor = null; }
    byClock(); clearInterval(timer); timer = setInterval(byClock, 60000);
    onSource && onSource('clock');
  };

  return {
    get active() { return active; },
    start() {
      this.stop(); active = true; current = null;
      try {
        if ('AmbientLightSensor' in window) {
          sensor = new window.AmbientLightSensor({ frequency: 1 });
          sensor.addEventListener('reading', () => {
            const lux = sensor.illuminance;
            if (lux < 30) set('dark'); else if (lux > 90) set('light');
          });
          sensor.addEventListener('error', useClock);
          sensor.start();
          byClock(); // until the first reading arrives
          onSource && onSource('sensor');
          return;
        }
      } catch { /* blocked by policy or permissions */ }
      useClock();
    },
    stop() {
      active = false; clearInterval(timer);
      if (sensor) { try { sensor.stop(); } catch {} sensor = null; }
    },
  };
}
