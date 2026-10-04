import { random } from "./random";

export const W = 1920;
export const H = 1080;

const TINTS = ["#ffffff", "#ffffff", "#dfe8ff", "#cfdcff", "#fff1dc", "#ffe2c4"];

// The band of the Milky Way: a gentle diagonal that wraps horizontally.
const bandY = (x: number) => H * 0.55 + Math.sin((x / W) * Math.PI * 2) * H * 0.18 - (x / W - 0.5) * H * 0.1;

const f = (v: number) => +v.toFixed(1);

// Draws at x and, near an edge, again one tile over, so the layer tiles seamlessly.
function wrapped(x: number, reach: number, draw: (x: number) => string) {
  let out = draw(x);
  if (x < reach) out += draw(x + W);
  if (x > W - reach) out += draw(x - W);
  return out;
}

function far() {
  const rnd = random(7);
  let out = "";
  for (let i = 0; i < 1400; i++) {
    const x = rnd() * W;
    const inBand = rnd() < 0.55;
    const y = inBand ? bandY(x) + (rnd() + rnd() + rnd() - 1.5) * 150 : rnd() * H;
    const r = 0.35 + rnd() ** 3 * 0.9;
    out += `<circle cx="${f(x)}" cy="${f(y)}" r="${r.toFixed(2)}" fill="${TINTS[i % TINTS.length]}" opacity="${(0.25 + rnd() * 0.55).toFixed(2)}"/>`;
  }
  return out;
}

function near() {
  const rnd = random(42);
  let out = "";
  for (let i = 0; i < 160; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const r = 0.8 + rnd() ** 4 * 1.8;
    const tint = TINTS[i % TINTS.length];
    const glow = r > 1.6;
    out += wrapped(x, 24, (cx) =>
      (glow ? `<circle cx="${f(cx)}" cy="${f(y)}" r="${f(r * 7)}" fill="url(#glow)" opacity="0.7"/>` : "") +
      `<circle cx="${f(cx)}" cy="${f(y)}" r="${r.toFixed(2)}" fill="${tint}"/>`,
    );
  }
  return `<defs><radialGradient id="glow"><stop offset="0" stop-color="#cfe0ff" stop-opacity="0.6"/><stop offset="1" stop-color="#cfe0ff" stop-opacity="0"/></radialGradient></defs>${out}`;
}

function nebula() {
  const rnd = random(1977);
  const colors = ["#3b1d6e", "#5a1f5c", "#123f63", "#1a5a6b", "#2a1f66"];
  let defs = "";
  let out = "";
  colors.forEach((c, i) => {
    defs += `<radialGradient id="n${i}"><stop offset="0" stop-color="${c}" stop-opacity="0.55"/><stop offset="0.5" stop-color="${c}" stop-opacity="0.18"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
  });
  for (let i = 0; i < 26; i++) {
    const x = rnd() * W;
    const y = bandY(x) + (rnd() - 0.5) * 420;
    const rx = 180 + rnd() * 420;
    const ry = rx * (0.35 + rnd() * 0.4);
    const id = `n${Math.floor(rnd() * colors.length)}`;
    const angle = f(-12 + rnd() * 6);
    out += wrapped(x, rx, (cx) => `<ellipse cx="${f(cx)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#${id})" transform="rotate(${angle} ${f(cx)} ${f(y)})"/>`);
  }
  // A faint glow along the whole band.
  defs += `<linearGradient id="band" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fa0ff" stop-opacity="0"/><stop offset="0.5" stop-color="#b7b0ff" stop-opacity="0.07"/><stop offset="1" stop-color="#8fa0ff" stop-opacity="0"/></linearGradient>`;
  let band = "";
  for (let x = 0; x <= W; x += 40) band += `${x ? "L" : "M"}${x} ${f(bandY(x) - 260)} `;
  for (let x = W; x >= 0; x -= 40) band += `L${x} ${f(bandY(x) + 260)} `;
  return `<defs>${defs}</defs><path d="${band}Z" fill="url(#band)"/>${out}`;
}

export const layers = { far, near, nebula };
export type Layer = keyof typeof layers;

export const svg = (layer: Layer) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${layers[layer]()}</svg>`;
