import { css } from "lit";

// deck.css styles light-DOM descendants of .deck and can't reach into a shadow
// root. The --deck-* tokens and inherited font/color do, so components rebuild
// the bits of the base typography they use from those.
export const deckType = css`
  :host {
    display: block;
  }
  h2,
  h3 {
    margin: 0;
    font-family: var(--deck-font-heading);
    line-height: var(--deck-heading-line-height);
    letter-spacing: var(--deck-heading-tracking);
    font-variation-settings: var(--deck-heading-variation);
    text-wrap: balance;
  }
  h3 {
    font-size: var(--deck-size-h3);
    font-weight: var(--deck-weight-h3);
  }
  p {
    margin: 0;
    text-wrap: pretty;
  }
  .muted {
    color: var(--deck-muted);
  }
  .accent {
    color: var(--deck-accent);
  }
  .small {
    font-size: var(--deck-size-small);
  }
  @media print {
    *,
    *::before,
    *::after {
      transition: none !important;
      animation: none !important;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      transition: none !important;
      animation: none !important;
    }
  }
`;
