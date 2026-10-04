import { LitElement, html, css } from "lit";
import { deckType } from "../lib/shadow-theme.js";

// Lays out slotted <ph-event>s on alternating sides of an axis. The events
// stay in the light DOM, so their data-step attributes are visible to the deck.
export class PhTimeline extends LitElement {
  static styles = css`
    .grid {
      display: grid;
      height: 100%;
      grid-template-columns: repeat(var(--cols), 1fr);
      grid-template-rows: 1fr 6px 1fr;
    }
    .axis {
      grid-row: 2;
      grid-column: 1 / -1;
      border-radius: 3px;
      background: linear-gradient(to right, var(--ph-red), var(--deck-accent));
    }
  `;

  #layout(e) {
    const events = e.target.assignedElements();
    this.style.setProperty("--cols", events.length + 1);
    events.forEach((el, i) => {
      el.side = i % 2 ? "below" : "above";
      el.style.gridRow = i % 2 ? "3" : "1";
      el.style.gridColumn = `${i + 1} / span 2`;
    });
  }

  render() {
    return html`<div class="grid"><div class="axis"></div><slot @slotchange=${this.#layout}></slot></div>`;
  }
}

export class PhEvent extends LitElement {
  static properties = {
    year: {},
    heading: {},
    side: { reflect: true },
  };

  // The deck writes data-state on this host; :host() selectors react to it.
  static styles = [
    deckType,
    css`
      :host {
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        padding-right: 32px;
      }
      :host([side="below"]) {
        flex-direction: column-reverse;
      }
      .card {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding-left: 28px;
      }
      .year {
        font: 600 52px / 1 var(--deck-font-heading);
        color: var(--deck-muted);
        transition: color var(--deck-step-duration);
      }
      h3 {
        font-size: 34px;
      }
      p {
        font-size: 26px;
        line-height: 1.35;
        color: var(--deck-muted);
      }
      .stem {
        height: 36px;
        margin-left: 12px;
        border-left: 3px solid var(--deck-muted);
      }
      .dot {
        position: absolute;
        left: 0;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--deck-bg);
        border: 4px solid var(--deck-fg);
        box-sizing: border-box;
        transition: scale var(--deck-step-duration), background-color var(--deck-step-duration);
      }
      :host([side="above"]) .dot {
        bottom: -15px;
      }
      :host([side="below"]) .dot {
        top: -15px;
      }
      :host([data-state="current"]) .year {
        color: var(--deck-accent);
      }
      :host([data-state="current"]) .dot {
        background: var(--ph-sun);
        scale: 1.5;
      }
    `,
  ];

  render() {
    return html`
      <div class="card">
        <span class="year">${this.year}</span>
        <h3>${this.heading}</h3>
        <p><slot></slot></p>
      </div>
      <div class="stem"></div>
      <div class="dot"></div>
    `;
  }
}

customElements.define("ph-timeline", PhTimeline);
customElements.define("ph-event", PhEvent);
