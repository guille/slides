import { onSlide } from "./lib/deck.js";

const STAGE = { w: 1920, h: 1080 };
const PRESETS = [
  null, // step 0: drift through sizes on its own
  { w: 1440, h: 900 },  // laptop
  { w: 1024, h: 768 },  // projector
  { w: 390, h: 844 },   // phone
  { w: 3440, h: 1440 }, // ultrawide
];

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function mountStageWidget(canvas, readout) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const pad = 40;
  let frame = 0;
  let raf = 0;
  let target = null;
  let t0 = 0;
  // Current window size in "device" pixels; eased toward the target each frame.
  const cur = { w: 1920, h: 1080 };

  function drift(t) {
    const p = (Math.sin(t / 1400) + 1) / 2;
    const q = (Math.sin(t / 2300 + 1) + 1) / 2;
    return { w: 700 + p * 2600, h: 700 + q * 700 };
  }

  function render(now) {
    const goal = target ?? drift(now - t0);
    cur.w += (goal.w - cur.w) * 0.08;
    cur.h += (goal.h - cur.h) * 0.08;

    // Fit the device window into the canvas.
    const fit = Math.min((W - pad * 2) / cur.w, (H - pad * 2) / cur.h);
    const ww = cur.w * fit;
    const wh = cur.h * fit;
    const wx = (W - ww) / 2;
    const wy = (H - wh) / 2;

    // Fit the stage into the window: that's all the runtime does.
    const scale = Math.min(cur.w / STAGE.w, cur.h / STAGE.h);
    const sw = STAGE.w * scale * fit;
    const sh = STAGE.h * scale * fit;
    const sx = wx + (ww - sw) / 2;
    const sy = wy + (wh - sh) / 2;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = css("--deck-letterbox");
    roundRect(wx, wy, ww, wh, 14);
    ctx.fill();
    ctx.strokeStyle = css("--rule");
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#f6efe2";
    ctx.fillRect(sx, sy, sw, sh);
    // Fake slide content, laid out in stage units so it scales as one piece.
    const u = sw / STAGE.w;
    ctx.fillStyle = "#15130f";
    ctx.fillRect(sx + 120 * u, sy + 140 * u, 900 * u, 110 * u);
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 4; i++) ctx.fillRect(sx + 120 * u, sy + (360 + i * 90) * u, (1300 - i * 160) * u, 40 * u);
    ctx.globalAlpha = 1;
    ctx.fillStyle = css("--deck-accent");
    ctx.fillRect(sx + 1450 * u, sy + 360 * u, 350 * u, 560 * u);

    readout.querySelector("[data-size]").textContent = `${Math.round(cur.w)} × ${Math.round(cur.h)}`;
    readout.querySelector("[data-scale]").textContent = `× ${scale.toFixed(3)}`;
  }

  function loop(now) {
    render(now);
    canvas.dataset.frames = ++frame;
    raf = requestAnimationFrame(loop);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  // A still frame for print, overview and presenter previews.
  render(0);

  return onSlide(canvas, {
    enter: () => {
      t0 = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
      canvas.dataset.running = "true";
    },
    leave: () => {
      cancelAnimationFrame(raf);
      canvas.dataset.running = "false";
    },
    step: ({ step }) => {
      target = PRESETS[Math.min(step, PRESETS.length - 1)];
    },
  });
}
