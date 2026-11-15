(function () {
  "use strict";
  // Fixed achievement moment: 2026-11-15 14:00:00 Asia/Dhaka (UTC+6, no DST) = 08:00:00 UTC
  var START_MS = Date.UTC(2026, 10, 15, 8, 0, 0);
  var offset = 0; // trusted time minus device time (ms)

  var el = { d: byId("d"), h: byId("h"), m: byId("m"), s: byId("s"), sync: byId("sync") };
  var last = {};
  function byId(i) { return document.getElementById(i); }
  function pad(n, w) { var t = n.toString(); while (t.length < w) t = "0" + t; return t; }

  // Elapsed whole seconds -> parts. BigInt keeps day counts exact for any duration.
  function split(totalSec) {
    if (typeof BigInt === "function") {
      var t = BigInt(totalSec);
      return { d: (t / 86400n).toString(), h: Number((t % 86400n) / 3600n), m: Number((t % 3600n) / 60n), s: Number(t % 60n) };
    }
    return { d: String(Math.floor(totalSec / 86400)), h: Math.floor(totalSec % 86400 / 3600), m: Math.floor(totalSec % 3600 / 60), s: totalSec % 60 };
  }
  function nowMs() { return Date.now() + offset; }

  function set(key, text) {
    if (last[key] === text) return;
    last[key] = text;
    var n = el[key];
    n.textContent = text;
    n.classList.remove("tick"); void n.offsetWidth; n.classList.add("tick");
  }

  function render() {
    var diff = nowMs() - START_MS;
    var sec = diff > 0 ? Math.floor(diff / 1000) : 0; // never negative
    var p = split(sec);
    set("d", p.d.length < 3 ? ("000" + p.d).slice(-3) : p.d);
    set("h", pad(p.h, 2)); set("m", pad(p.m, 2)); set("s", pad(p.s, 2));
  }

  // Tick aligned to the next real second boundary, always recomputed from timestamps.
  function loop() {
    render();
    var wait = 1000 - (nowMs() % 1000) + 5;
    setTimeout(loop, wait);
  }

  // Time sync: try public time APIs; fall back silently to device clock.
  function sync() {
    var t0 = Date.now();
    fetch("https://worldtimeapi.org/api/timezone/Asia/Dhaka", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) { apply(j.unixtime * 1000, t0); })
      .catch(function () {
        return fetch("https://timeapi.io/api/Time/current/zone?timeZone=Asia/Dhaka", { cache: "no-store" })
          .then(function (r) { if (!r.ok) throw 0; return r.json(); })
          .then(function (j) { apply(Date.UTC(j.year, j.month - 1, j.day, j.hour, j.minute, j.seconds) - 6 * 3600000, t0); });
      })
      .catch(function () { el.sync.textContent = "Using device clock"; });
  }
  function apply(serverMs, t0) {
    var t1 = Date.now();
    var o = serverMs + (t1 - t0) / 2 - t1;
    if (isFinite(o) && Math.abs(o) < 3.15e10) { offset = o; el.sync.textContent = "Synced with online time"; render(); }
  }

  document.addEventListener("visibilitychange", function () { if (!document.hidden) { render(); sync(); } });
  setInterval(sync, 10 * 60 * 1000);
  loop(); sync();

  // Gallery fallback + lightbox
  var imgs = document.querySelectorAll(".frame img");
  imgs.forEach(function (im) {
    im.addEventListener("error", function () {
      var f = im.parentNode;
      f.classList.add("fail");
      f.removeAttribute("aria-label");
      f.textContent = "Screenshot could not load. Check your connection and refresh.";
    });
  });
  var lb = byId("lb"), lbimg = byId("lbimg"), opener;
  function open(i) { lbimg.src = i.src; lbimg.alt = i.alt; lb.hidden = false; opener = i; byId("lbx").focus(); }
  function close() { lb.hidden = true; lbimg.removeAttribute("src"); if (opener && opener.parentNode) opener.parentNode.focus(); }
  document.querySelectorAll(".frame").forEach(function (b) {
    b.addEventListener("click", function () { var i = b.querySelector("img"); if (i && !b.classList.contains("fail")) open(i); });
  });
  lb.addEventListener("click", function (e) { if (e.target !== lbimg) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !lb.hidden) close(); });

  // Light particles (skipped for reduced motion; paused when tab hidden)
  var cv = byId("fx"), cx = cv.getContext("2d");
  if (!cx || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var W, H, ps = [], low = (navigator.hardwareConcurrency || 4) <= 4 || innerWidth < 600;
  var N = low ? 22 : 48, cols = ["246,196,83", "122,60,255", "76,195,255"];
  function size() { W = cv.width = innerWidth; H = cv.height = innerHeight; }
  function mk(init) { return { x: Math.random() * W, y: init ? Math.random() * H : H + 10, r: Math.random() * 1.8 + .6, v: Math.random() * .35 + .12, c: cols[(Math.random() * 3) | 0], a: Math.random() * .5 + .2 }; }
  size(); for (var k = 0; k < N; k++) ps.push(mk(true));
  addEventListener("resize", size);
  (function frame() {
    if (!document.hidden) {
      cx.clearRect(0, 0, W, H);
      for (var j = 0; j < ps.length; j++) {
        var p = ps[j]; p.y -= p.v; p.x += Math.sin(p.y / 40) * .2;
        if (p.y < -10) ps[j] = mk(false);
        cx.fillStyle = "rgba(" + p.c + "," + p.a + ")";
        cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.283); cx.fill();
      }
    }
    requestAnimationFrame(frame);
  })();
})();
