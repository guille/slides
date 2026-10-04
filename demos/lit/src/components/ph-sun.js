import { LitElement, svg, css } from "lit";
import { deckType } from "../lib/shadow-theme.js";

const RAY = svg`<path d="M0-42 6-90 0-96-6-90Z"/><path d="M8-42 18-74 14-78 4-44Z"/><path d="M-8-42-18-74-14-78-4-44Z"/>`;

// The flag's eight-rayed sun.
// Spins while --ph-sun-spin is "running": the deck's state hooks can't select
// inside the shadow root, but a custom property set from outside inherits in.
export class PhSun extends LitElement {
  static styles = [
    deckType,
    css`
      :host {
        color: var(--ph-sun);
        pointer-events: none;
      }
      svg {
        display: block;
        height: 100%;
      }
      g {
        transform-box: view-box;
        transform-origin: 0 0;
        animation: turn 120s linear infinite;
        animation-play-state: var(--ph-sun-spin, paused);
      }
      @keyframes turn {
        to {
          rotate: 1turn;
        }
      }
    `,
  ];

  render() {
    return svg`<svg viewBox="-100 -100 200 200" aria-hidden="true">
      <g fill="currentColor">
        <circle r="34"/>
        ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => svg`<g transform="rotate(${a})">${RAY}</g>`)}
      </g>
    </svg>`;
  }
}

customElements.define("ph-sun", PhSun);
