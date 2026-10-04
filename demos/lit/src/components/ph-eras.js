import { LitElement, html, css } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { SlideController } from "../lib/slide-controller.js";
import { deckType } from "../lib/shadow-theme.js";
import "./ph-count.js";

const FROM = 1565;
const TO = 2026;
const ERAS = [
  { from: 1565, to: 1898, name: "Spain", note: "Ruled from Mexico City until 1821, then from Madrid" },
  { from: 1898, to: 1946, name: "United States", note: "Japanese occupation 1942–45", gap: [1942, 1945] },
  { from: 1946, to: TO, name: "Republic", note: "and counting", open: true },
];
const TICKS = [1600, 1700, 1800, 1900, 2000];

const pct = (year) => `${((year - FROM) / (TO - FROM)) * 100}%`;

// One step per era.
export class PhEras extends LitElement {
  slide = new SlideController(this, { stepCount: ERAS.length });

  static styles = [
    deckType,
    css`
      :host {
        --bar: 120px;
        position: relative;
        height: 640px;
      }
      .bar {
        position: absolute;
        inset: 260px 0 auto;
        height: var(--bar);
        border-radius: 8px;
        background: var(--deck-surface);
      }
      .era {
        position: absolute;
        top: 0;
        height: 100%;
        transform-origin: left;
        transition: scale 700ms cubic-bezier(0.65, 0, 0.35, 1), opacity 300ms;
      }
      .era.hidden {
        scale: 0 1;
        opacity: 0;
      }
      .era:nth-child(1) {
        background: var(--ph-red);
        border-radius: 8px 0 0 8px;
      }
      .era:nth-child(2) {
        background: var(--deck-accent);
      }
      .era:nth-child(3) {
        background: var(--ph-sun);
        border-radius: 0 8px 8px 0;
      }
      .gap {
        position: absolute;
        top: 0;
        height: 100%;
        background: repeating-linear-gradient(45deg, var(--deck-fg) 0 4px, transparent 4px 8px);
      }
      .tick {
        position: absolute;
        top: calc(100% + 16px);
        translate: -50%;
        font-size: var(--deck-size-small);
        color: var(--deck-muted);
      }
      .label {
        position: absolute;
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding-left: 20px;
        border-left: 4px solid var(--deck-fg);
        transition: opacity 400ms 300ms;
      }
      .label.hidden {
        opacity: 0;
        transition-delay: 0s;
      }
      .label.above {
        bottom: calc(100% + 24px);
      }
      .label.below {
        top: calc(100% + 80px);
      }
      .years {
        font: 600 88px / 1 var(--deck-font-heading);
      }
      .years small {
        font-size: 0.45em;
        font-weight: 400;
        color: var(--deck-muted);
      }
      h3 {
        font-size: 40px;
      }
      .label.right {
        align-items: flex-end;
        padding: 0 20px 0 0;
        border-left: 0;
        border-right: 4px solid var(--deck-fg);
        text-align: right;
      }
    `,
  ];

  render() {
    const shown = this.slide.shown();
    return html`
      <div class="bar">
        ${ERAS.map(
          (e, i) => html`<div
            class=${classMap({ era: true, hidden: i >= shown })}
            style="left: ${pct(e.from)}; width: calc(${pct(e.to)} - ${pct(e.from)})"
          ></div>`,
        )}
        ${ERAS.filter((e) => e.gap).map(
          ({ gap: [a, b] }) =>
            html`<div class="gap" style="left: ${pct(a)}; width: calc(${pct(b)} - ${pct(a)})"></div>`,
        )}
        ${TICKS.map((y) => html`<span class="tick" style="left: ${pct(y)}">${y}</span>`)}
        ${ERAS.map((e, i) => this.#label(e, i, i >= shown))}
      </div>
    `;
  }

  #label(e, i, hidden) {
    // The last two eras are narrow; alternate sides and right-align the last.
    const side = i === 1 ? "above" : "below";
    const right = i === ERAS.length - 1;
    const x = right ? "right: 0" : `left: ${pct(e.from)}`;
    return html`
      <div class=${classMap({ label: true, [side]: true, right, hidden })} style=${x}>
        <span class="years"><ph-count .to=${e.to - e.from} .at=${i + 1} .duration=${1200}></ph-count> <small>years</small></span>
        <h3>${e.name}</h3>
        <p class="small muted">${e.open ? `Since ${e.from}` : `${e.from}–${e.to}`} · ${e.note}</p>
      </div>
    `;
  }
}

customElements.define("ph-eras", PhEras);
