import { LitElement, html, css } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { deckType } from "../lib/shadow-theme.js";
import { toBaybayin, transliterate } from "./baybayin.js";

const SAMPLES = ["Pilipinas", "Kalayaan", "Mabuhay", "Bayanihan"];

// Interactive transliterator.
export class PhBaybayin extends LitElement {
  static properties = {
    value: {},
    virama: { type: Boolean },
  };

  constructor() {
    super();
    this.value = SAMPLES[0];
    this.virama = true;
  }

  static styles = [
    deckType,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: 48px;
      }
      .output {
        display: flex;
        flex-wrap: wrap;
        align-content: flex-start;
        column-gap: 72px;
        row-gap: 24px;
        height: 440px;
        overflow: hidden;
      }
      .word {
        display: flex;
        gap: 12px;
      }
      .syl {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }
      .sign {
        font: 150px / 1.2 "Noto Sans Tagalog", sans-serif;
        min-width: 0.4em;
        text-align: center;
      }
      .roman {
        font-size: var(--deck-size-small);
        color: var(--deck-muted);
      }
      .silent .roman {
        text-decoration: line-through;
        text-decoration-color: var(--ph-red);
      }
      .controls {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 24px 32px;
        font-size: var(--deck-size-small);
      }
      input[type="text"] {
        width: 13em;
        font: inherit;
        font-size: 40px;
        padding: 12px 20px;
        color: var(--deck-fg);
        background: var(--deck-bg);
        border: 3px solid var(--deck-muted);
        border-radius: var(--deck-radius);
      }
      input[type="text"]:focus {
        outline: none;
        border-color: var(--deck-accent);
      }
      label {
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
      }
      input[type="checkbox"] {
        width: 32px;
        height: 32px;
        accent-color: var(--deck-accent);
      }
      .samples {
        display: flex;
        gap: 12px;
      }
      button {
        font: inherit;
        padding: 8px 20px;
        color: var(--deck-accent);
        background: none;
        border: 2px solid currentColor;
        border-radius: 999px;
        cursor: pointer;
      }
      button[aria-pressed="true"] {
        color: var(--deck-accent-fg);
        background: var(--deck-accent);
        border-color: var(--deck-accent);
      }
    `,
  ];

  render() {
    const words = transliterate(this.value, { virama: this.virama });
    return html`
      <div class="output" lang="tl" aria-label=${toBaybayin(this.value, { virama: this.virama })}>
        ${words.map(
          (w) => html`<span class="word">
            ${w.map(
              (s) => html`<span class=${classMap({ syl: true, silent: s.silent })}>
                <span class="sign">${s.sign || " "}</span>
                <span class="roman">${s.roman}</span>
              </span>`,
            )}
          </span>`,
        )}
      </div>
      <div class="controls">
        <input
          type="text"
          maxlength="24"
          spellcheck="false"
          aria-label="Text to transliterate"
          .value=${this.value}
          @input=${(e) => (this.value = e.target.value)}
        />
        <div class="samples">
          ${SAMPLES.map(
            (w) => html`<button aria-pressed=${w === this.value} @click=${() => (this.value = w)}>${w}</button>`,
          )}
        </div>
        <label>
          <input type="checkbox" .checked=${this.virama} @change=${(e) => (this.virama = e.target.checked)} />
          Write final consonants (krus-kudlit, 1620)
        </label>
      </div>
    `;
  }
}

// Static Baybayin text for use in markup.
export class PhBaybayinText extends LitElement {
  static properties = { text: {} };

  static styles = css`
    :host {
      font-family: "Noto Sans Tagalog", sans-serif;
    }
  `;

  render() {
    return html`<span lang="tl">${toBaybayin(this.text ?? "")}</span>`;
  }
}

customElements.define("ph-baybayin", PhBaybayin);
customElements.define("ph-baybayin-text", PhBaybayinText);
