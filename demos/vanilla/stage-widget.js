import { onSlide } from "./lib/deck.js";

const STAGE = { w: 1920, h: 1080 };
// In list order: step n highlights WINDOWS[n - 1], step 0 lights them all.
const WINDOWS = [
  { w: 1440, h: 900 },  // laptop
  { w: 1024, h: 768 },  // projector
  { w: 390, h: 844 },   // phone
  { w: 3440, h: 1440 }, // ultrawide
];
const DIM = 0.3;

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const scaleOf = (win) => Math.min(win.w / STAGE.w, win.h / STAGE.h);

export function mountStageWidget(canvas, readout) {
  const ctx = canvas.getContext("2d");
  // Drawing units; the backing store is sized to the screen in fit().
  const W = canvas.width;
  const H = canvas.height;
  const pad = 40;
  const colors = { letterbox: css("--deck-letterbox"), rule: css("--rule"), accent: css("--deck-accent") };
  const fadeMs = parseFloat(css("--deck-step-duration")) || 300;
  const sizeEl = readout.querySelector("[data-size]");
  const scaleEl = readout.querySelector("[data-scale]");
  let raf = 0;
  let deckScale = 1;
  let current = 0;
  // Each window's opacity, faded toward goal() after a step.
  const alpha = WINDOWS.map(() => 1);
  let fade = null;
  let arriving = false;

  // A 2×2 grid, each window fitted into its own cell.
  const cw = (W - pad * 3) / 2;
  const ch = (H - pad * 3) / 2;
  const cells = WINDOWS.map((win, i) => {
    const zoom = Math.min(cw / win.w, ch / win.h);
    const w = win.w * zoom;
    const h = win.h * zoom;
    const x = pad + (i % 2) * (cw + pad) + (cw - w) / 2;
    const y = pad + Math.floor(i / 2) * (ch + pad) + (ch - h) / 2;
    return { x, y, w, h, zoom };
  });

  const goal = (i) => (current === 0 || current === i + 1 ? 1 : DIM);

  function drawWindow(win, cell, a, lit) {
    ctx.globalAlpha = a;
    ctx.fillStyle = colors.letterbox;
    ctx.beginPath();
    ctx.roundRect(cell.x, cell.y, cell.w, cell.h, 10);
    ctx.fill();
    ctx.strokeStyle = lit ? colors.accent : colors.rule;
    ctx.lineWidth = 3;
    ctx.stroke();

    // The same stage in every window, fitted by one uniform scale.
    const u = scaleOf(win) * cell.zoom;
    const sx = cell.x + (cell.w - STAGE.w * u) / 2;
    const sy = cell.y + (cell.h - STAGE.h * u) / 2;
    ctx.fillStyle = "#f6efe2";
    ctx.fillRect(sx, sy, STAGE.w * u, STAGE.h * u);
    ctx.fillStyle = "#15130f";
    ctx.fillRect(sx + 120 * u, sy + 140 * u, 900 * u, 110 * u);
    ctx.globalAlpha = a * 0.35;
    for (let i = 0; i < 4; i++) ctx.fillRect(sx + 120 * u, sy + (360 + i * 90) * u, (1300 - i * 160) * u, 40 * u);
    ctx.globalAlpha = a;
    ctx.fillStyle = colors.accent;
    ctx.fillRect(sx + 1450 * u, sy + 360 * u, 350 * u, 560 * u);
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    WINDOWS.forEach((win, i) => drawWindow(win, cells[i], alpha[i], current === i + 1));
    const win = WINDOWS[current - 1] ?? STAGE;
    // Text changes cost a layout, so only write when the text does.
    setText(sizeEl, `${win.w} × ${win.h}`);
    setText(scaleEl, `× ${scaleOf(win).toFixed(3)}`);
  }

  function setText(el, text) {
    if (el.textContent !== text) el.textContent = text;
  }

  // Returns whether the fade is done, so the loop can stop.
  function advance(now) {
    fade ??= { from: [...alpha], start: now };
    const p = Math.min((now - fade.start) / fadeMs, 1);
    alpha.forEach((_, i) => (alpha[i] = fade.from[i] + (goal(i) - fade.from[i]) * p));
    return p === 1;
  }

  function loop(now) {
    const settled = advance(now);
    draw();
    raf = settled ? 0 : requestAnimationFrame(loop);
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  function settle() {
    stop();
    alpha.forEach((_, i) => (alpha[i] = goal(i)));
    draw();
  }

  // One backing pixel per screen pixel. Print has no deckresize, so it gets
  // stage resolution.
  function fit() {
    const printing = document.documentElement.hasAttribute("data-deck-print");
    const k = (canvas.clientWidth * (printing ? 1 : deckScale) * devicePixelRatio) / W;
    const w = Math.round(W * k);
    const h = Math.round(H * k);
    if (!w || (canvas.width === w && canvas.height === h)) return;
    canvas.width = w;
    canvas.height = h;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    draw();
  }

  // A still frame for print, overview and presenter previews.
  draw();

  return onSlide(canvas, {
    enter: () => (arriving = true),
    leave: settle,
    step: ({ step, mode }) => {
      current = Math.min(step, WINDOWS.length);
      // Arriving from another slide snaps, like the deck's own steps.
      if (arriving || mode !== "main") {
        arriving = false;
        return settle();
      }
      fade = null;
      if (!raf) raf = requestAnimationFrame(loop);
    },
    reveal: fit,
    resize: (detail) => {
      deckScale = detail.scale;
      fit();
    },
  });
}
