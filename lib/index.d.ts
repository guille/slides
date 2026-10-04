// Types for deck.js. types/ is generated from its JSDoc (mise run types); this
// file adds the event map, which JSDoc can't declare.
import type {
  BlackoutChangeDetail,
  DeckChangeDetail,
  DeckResizeDetail,
  RevealChangeDetail,
  SlideEnterDetail,
  SlideLeaveDetail,
  StepChangeDetail,
} from "./types/deck.js";

export * from "./types/deck.js";

declare global {
  interface GlobalEventHandlersEventMap {
    deckchange: CustomEvent<DeckChangeDetail>;
    slideenter: CustomEvent<SlideEnterDetail>;
    slideleave: CustomEvent<SlideLeaveDetail>;
    stepchange: CustomEvent<StepChangeDetail>;
    blackoutchange: CustomEvent<BlackoutChangeDetail>;
    revealchange: CustomEvent<RevealChangeDetail>;
    deckresize: CustomEvent<DeckResizeDetail>;
  }
}
