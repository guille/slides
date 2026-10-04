import { LitElement, html, css } from "lit";
import { SlideController } from "../lib/slide-controller.js";

const ease = (t) => 1 - (1 - t) ** 3;

// Counts up to `to` once its slide reaches step `at`.
export class PhCount extends LitElement {
  static properties = {
    to: { type: Number },
    at: { type: Number },
    duration: { type: Number },
    suffix: {},
    value: { state: true },
  };

  static styles = css`
    :host {
      font-variant-numeric: tabular-nums;
    }
  `;

  slide = new SlideController(this);
  #shown = false;
  #frame = 0;

  constructor() {
    super();
    this.to = 0;
    this.at = 0;
    this.duration = 1600;
    this.suffix = "";
    this.value = 0;
  }

  willUpdate() {
    if (this.slide.revealAll) {
      cancelAnimationFrame(this.#frame);
      this.#shown = true;
      this.value = this.to;
      return;
    }
    const shown = this.slide.active && this.slide.step >= this.at;
    if (shown === this.#shown) return;
    this.#shown = shown;
    cancelAnimationFrame(this.#frame);
    if (shown) this.#tween(performance.now());
    else this.value = 0;
  }

  #tween(start) {
    const t = Math.min(1, (performance.now() - start) / this.duration);
    this.value = Math.round(ease(t) * this.to);
    if (t < 1) this.#frame = requestAnimationFrame(() => this.#tween(start));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    cancelAnimationFrame(this.#frame);
    this.#shown = false;
  }

  render() {
    return html`${this.value.toLocaleString("en-US")}${this.suffix}`;
  }
}

customElements.define("ph-count", PhCount);
