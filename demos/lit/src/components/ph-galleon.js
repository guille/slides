import { LitElement, html, svg, css } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { SlideController } from "../lib/slide-controller.js";
import { deckType } from "../lib/shadow-theme.js";

// Equirectangular, Pacific-centred. Points are [lat, lon] with lon in degrees
// east (west longitudes as negatives).
const LON = [108, 266];
const LAT = [4, 46];
const W = 1696;
const K = W / (LON[1] - LON[0]);
const H = (LAT[1] - LAT[0]) * K;
const xy = ([lat, lon]) => [((lon < 0 ? lon + 360 : lon) - LON[0]) * K, (LAT[1] - lat) * K];

// Simplified coastlines: shapes to orient by, not to navigate with.
const LAND = [
  // Asia, from the Russian Far East down to Indochina
  [[50, 100], [50, 140], [46, 138], [43, 132], [42.3, 130.7], [40, 128.5], [37.5, 129.3], [35.1, 129], [34.6, 126.4], [37, 126.5], [39.8, 124.3], [40.5, 122], [39, 118.5], [37.8, 120.5], [37.4, 122.6], [36, 120.3], [35.1, 119.4], [32, 121], [31, 121.9], [30, 122.2], [27, 120.3], [25, 119.5], [23, 116.5], [22.3, 114.2], [21.5, 111], [21, 110.5], [21.5, 108.5], [20, 106.5], [17, 107], [15.3, 108.9], [12.3, 109.3], [10.4, 107.3], [0, 100]],
  [[20, 110.5], [19.5, 111], [18.2, 109.5], [19.2, 108.6]], // Hainan
  [[25.3, 121.5], [24.6, 121.9], [22, 120.8], [22.6, 120.3], [24.1, 120.4]], // Taiwan
  // Japan: Kyushu to Honshu, then Hokkaido
  [[31, 130.5], [33.9, 130.9], [34.4, 133], [33.4, 135.8], [34.6, 138.2], [35.1, 139.8], [35.7, 140.9], [37.8, 141], [39.6, 142], [41.5, 141.4], [40.6, 140], [39, 139.9], [37.4, 136.8], [35.6, 135.2], [35.5, 133.1], [34.3, 130.9], [33.2, 129.6], [31.4, 130.1]],
  [[41.4, 140], [42.3, 143.3], [43.3, 145.8], [45.5, 141.9], [43.2, 140.3]],
  // Philippines
  [[18.6, 120.8], [18.5, 122.2], [17, 122.5], [15.8, 121.6], [14.7, 121.7], [14, 122.4], [14.1, 123.1], [13.7, 123.9], [12.9, 124.2], [12.6, 123.9], [13.2, 123], [13.5, 122.2], [13.9, 121.5], [13.8, 120.6], [14.5, 120.6], [14.8, 120.2], [15.9, 119.8], [16.4, 120.4], [17.6, 120.4]], // Luzon
  [[13.5, 120.3], [13.4, 121.5], [12.3, 121.4], [12.3, 121]], // Mindoro
  [[12.5, 124.3], [12.3, 125.4], [11, 125.7], [11.2, 124.9]], // Samar
  [[11.4, 124.4], [11, 125], [10.1, 125.2], [10.2, 124.8], [11, 124.3]], // Leyte
  [[11.9, 122], [11.5, 123.1], [10.5, 122.6], [10.8, 121.9]], // Panay
  [[10.9, 123.1], [10.4, 123.5], [9.1, 123.2], [9.6, 122.5], [10.5, 122.9]], // Negros
  [[11.3, 124.05], [10.3, 124], [9.45, 123.45], [9.8, 123.4], [10.5, 123.75], [11.2, 123.9]], // Cebu
  [[11.5, 119.5], [11.3, 119.9], [9.5, 118.8], [8.4, 117.4], [8.5, 117.2], [9.8, 118.3], [10.8, 119.2]], // Palawan
  [[9.8, 125.5], [8.6, 126.4], [7.1, 126.6], [6, 126.2], [5.6, 125.3], [6.3, 124], [7.3, 123.6], [6.9, 122], [8, 122.3], [8.5, 123.4], [8.2, 124.2], [8.9, 124.8], [9, 125.5]], // Mindanao
  [[7, 116.9], [5, 119.2], [3, 117.7], [0, 118], [0, 108], [1.8, 109.6], [2.9, 111.2], [4.6, 114], [5.9, 116]], // Borneo
  [[13.6, 144.9], [13.25, 144.65], [13.4, 144.6]], // Guam
  // North America
  [[50, 300], [50, -125], [48.4, -124.7], [46.3, -124], [42, -124.4], [40.4, -124.4], [37.8, -122.5], [36.6, -121.9], [34.5, -120.5], [34, -118.5], [32.7, -117.2], [30, -115.8], [28, -114.5], [26.5, -113.2], [24.6, -112.1], [22.9, -109.9], [24.2, -110.3], [26, -111.3], [28, -112.8], [31.5, -114.8], [30, -113], [27.9, -110.6], [25.8, -109.3], [23.2, -106.4], [20.6, -105.2], [19.1, -104.3], [18, -102.2], [16.85, -99.9], [15.8, -96.5], [16.2, -95.2], [14.5, -92.5], [0, -80], [0, 300]],
];

const PORTS = [
  { name: "Manila", at: [14.6, 121], dx: -24, dy: 44, anchor: "end" },
  { name: "Acapulco", at: [16.85, -99.9], dx: -36, dy: -14, anchor: "end" },
  { name: "Guam", at: [13.45, 144.8], dx: 0, dy: 48, anchor: "middle" },
];

const ROUTES = [
  {
    name: "west",
    label: "Westbound · trade winds · about 3 months",
    cargo: "Mexican and Peruvian silver",
    points: [[16.85, -99.9], [14.5, -108], [13, -125], [12.5, -150], [13, -175], [13.3, 160], [13.45, 144.8], [12.8, 133], [12.6, 124.6], [13, 123], [14.6, 121]],
  },
  {
    name: "east",
    label: "Eastbound · Kuroshio, then the westerlies · 4–6 months",
    cargo: "Chinese silk and porcelain, spices",
    points: [[14.6, 121], [13, 123], [12.6, 124.6], [17, 128], [26, 135], [33, 143], [38.5, 156], [40, 175], [40, -160], [40.2, -140], [40.4, -126], [37, -122.8], [33, -118.6], [28, -116], [23, -110.7], [19.3, -105.6], [16.85, -99.9]],
  },
];

// Catmull-Rom through the points, as cubic Béziers.
function smooth(points) {
  const p = points.map(xy);
  let d = `M${p[0]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const [a, b, c, e] = [p[i - 1] ?? p[i], p[i], p[i + 1], p[i + 2] ?? p[i + 1]];
    const c1 = [b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6];
    const c2 = [c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6];
    d += ` C${c1} ${c2} ${c}`;
  }
  return d;
}

const polygon = (pts) => pts.map(xy).join(" ");

// Step 1 draws the outbound route, step 2 the return, step 3 the summary.
const STEPS = ROUTES.length + 1;

export class PhGalleon extends LitElement {
  slide = new SlideController(this, { stepCount: STEPS });

  static styles = [
    deckType,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: 32px;
      }
      svg {
        display: block;
        width: 100%;
        border-radius: var(--deck-radius);
        background: color-mix(in oklab, var(--deck-accent) 9%, white);
      }
      .grid {
        stroke: color-mix(in srgb, var(--deck-accent) 14%, transparent);
        stroke-width: 1.5;
      }
      .land {
        fill: var(--deck-surface);
        stroke: color-mix(in srgb, var(--deck-muted) 50%, transparent);
        stroke-width: 1.5;
        stroke-linejoin: round;
      }
      .route {
        fill: none;
        stroke-width: 6;
        stroke-linecap: round;
        stroke-dasharray: 1;
        stroke-dashoffset: 0;
        transition: stroke-dashoffset 1800ms cubic-bezier(0.65, 0, 0.35, 1);
      }
      .route.hidden {
        stroke-dashoffset: 1;
        transition-duration: 0s;
      }
      .west {
        stroke: var(--ph-red);
      }
      .east {
        stroke: var(--deck-accent);
      }
      .port circle {
        fill: var(--deck-fg);
      }
      .port text {
        font: 600 30px var(--deck-font-sans);
        fill: var(--deck-fg);
      }
      .latitude {
        font: 22px var(--deck-font-sans);
        fill: var(--deck-muted);
      }
      .legend {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: var(--deck-gap);
      }
      .legend > div {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding-left: 24px;
        border-left: 8px solid var(--c);
        transition: opacity var(--deck-step-duration), translate var(--deck-step-duration);
      }
      .legend > div.hidden {
        opacity: 0;
        translate: 0 0.4em;
      }
      .legend strong {
        font-size: 34px;
      }
    `,
  ];

  render() {
    const shown = this.slide.shown();
    const hidden = (n) => ({ hidden: shown < n });
    return html`
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Schematic map of the Manila galleon routes across the Pacific">
        <defs><clipPath id="frame"><rect width=${W} height=${H}></rect></clipPath></defs>
        <g clip-path="url(#frame)">
          ${[10, 20, 30, 40].map((lat) => {
            const [, y] = xy([lat, LON[0]]);
            return svg`<line class="grid" x1="0" x2=${W} y1=${y} y2=${y}></line>
              <text class="latitude" x=${W / 2} y=${y - 8} text-anchor="middle">${lat}°N</text>`;
          })}
          ${LAND.map((pts) => svg`<polygon class="land" points=${polygon(pts)}></polygon>`)}
          ${ROUTES.map(
            (r, i) => svg`<path class=${classMap({ route: true, [r.name]: true, ...hidden(i + 1) })}
              d=${smooth(r.points)} pathLength="1"></path>`,
          )}
          ${PORTS.map(({ name, at, dx, dy, anchor }) => {
            const [x, y] = xy(at);
            return svg`<g class="port" transform="translate(${x} ${y})">
              <circle r="9"></circle><text x=${dx} y=${dy} text-anchor=${anchor}>${name}</text></g>`;
          })}
        </g>
      </svg>
      <div class="legend">
        ${ROUTES.map(
          (r, i) => html`<div class=${classMap(hidden(i + 1))} style="--c: var(${i ? "--deck-accent" : "--ph-red"})">
            <strong>${r.cargo}</strong>
            <span class="small muted">${r.label}</span>
          </div>`,
        )}
        <div class=${classMap(hidden(STEPS))} style="--c: var(--ph-sun)">
          <strong>1565–1815</strong>
          <span class="small muted">Usually one or two ships a year, for 250 years</span>
        </div>
      </div>
    `;
  }
}

customElements.define("ph-galleon", PhGalleon);
