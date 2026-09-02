/* Global navigation progress bar.

   The route change used to be silent: a black curtain slid over the screen and
   nothing on it moved until the page had already rendered. This is the one
   thing on screen that keeps advancing from the instant a link is tapped until
   the page is on screen, so a slow route reads as slow rather than as broken.

   Two modes share one bar. Where the number of outstanding requests is known
   the caller drives it with step(done, total) and the bar is honestly
   determinate. Where it is not, tick() creeps along an asymptote that always
   advances and never arrives, so the bar cannot lie about being nearly done. */

window.KK = window.KK || {};

KK.progress = (function () {
  "use strict";

  var CREEP_TAU = 900;     // ms; the time constant of the indeterminate curve
  var CREEP_CEILING = 0.9; // creep alone never claims more than this
  var FADE_MS = 200;
  var MIN_VISIBLE_MS = 260; // so a fast route still reads as a deliberate beat

  var el = null;
  var fill = null;
  var status = null;

  var TICK_MS = 80;

  var timer = 0;
  var fadeTimer = 0;
  var startedAt = 0;
  var active = false;
  var value = 0;      // 0..1, only ever moves forward within one run
  var floor = 0;      // determinate floor set by step(); creep rides above it

  function nodes() {
    if (!el) {
      el = document.getElementById("navProgress");
      fill = el && el.firstElementChild;
      status = document.getElementById("routeLoaderStatus");
    }
    return !!el;
  }

  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function paint(next) {
    // Monotonic: a late step() that resolves lower than the creep must not
    // drag the bar backwards.
    if (next <= value) return;
    value = next;
    fill.style.transform = "scaleX(" + value.toFixed(4) + ")";
    el.setAttribute("aria-valuenow", String(Math.round(value * 100)));
  }

  /* Driven by a timer rather than requestAnimationFrame: rAF is paused in a
     backgrounded tab, and a progress bar that freezes the moment someone
     switches away and stays frozen when they come back is worse than none.
     The 120ms linear transition on the fill smooths the 80ms steps. */
  function frame() {
    if (!active) return;
    var elapsed = Date.now() - startedAt;
    var creep = CREEP_CEILING * (1 - Math.exp(-elapsed / CREEP_TAU));
    // The determinate floor and the creep are combined, not chosen between, so
    // a run that starts determinate and then stalls still shows life.
    paint(floor + (1 - floor) * creep);
  }

  function start(label) {
    if (!nodes()) return;
    if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = 0; }
    if (timer) clearInterval(timer);

    active = true;
    startedAt = Date.now();
    value = 0;
    floor = 0;

    el.classList.remove("is-done", "is-failed");
    el.hidden = false;
    el.setAttribute("aria-hidden", "false");
    el.setAttribute("aria-valuenow", "0");
    fill.style.transform = "scaleX(0)";
    // Commit the reset before the first advance, or the browser coalesces the
    // two and the bar appears to jump in from wherever it last was.
    void el.offsetWidth;

    if (label && status) status.textContent = "Loading " + label + ".";
    frame();
    timer = setInterval(frame, TICK_MS);
  }

  /* Determinate progress. Callers that know how many requests are outstanding
     report each one as it lands; the bar tops out at 0.95 so the final snap to
     full stays tied to the page actually being on screen. */
  function step(done, total) {
    if (!active || !total) return;
    floor = Math.max(floor, Math.min(0.95, done / total));
  }

  function settle(className) {
    if (!active) return;
    active = false;
    if (timer) { clearInterval(timer); timer = 0; }

    var hold = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt));
    fadeTimer = setTimeout(function () {
      paint(1);
      el.classList.add(className);
      fadeTimer = setTimeout(function () {
        el.hidden = true;
        el.setAttribute("aria-hidden", "true");
        el.classList.remove("is-done", "is-failed");
        fill.style.transform = "scaleX(0)";
        value = 0;
        fadeTimer = 0;
      }, reducedMotion() ? 0 : FADE_MS);
      if (status) status.textContent = "";
    }, reducedMotion() ? 0 : hold);
  }

  return {
    start: start,
    step: step,
    /* Nudges the bar immediately rather than waiting for the next tick, for a
       caller that has just finished a long synchronous stretch. */
    tick: frame,
    /* A navigation that is abandoned mid-flight (the stale-token guard in
       handleRoute) must not leave the bar stranded at 40%. */
    cancel: function () { settle("is-done"); },
    done: function () { settle("is-done"); },
    fail: function () { settle("is-failed"); },
    isActive: function () { return active; }
  };
})();
