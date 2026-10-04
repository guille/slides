import { deck } from "/lib/deck.js";

deck(document.querySelector(".deck"));

const slideOf = (el) => el.closest(".deck > section");

// For hx-trigger filters: true while el's slide is the one on screen, in
// the audience window or a presenter preview. Off-screen slides don't poll.
// The deck announces the first slide before htmx processes the page, so
// slide-driven elements also trigger on `load[onStage(this)]`.
window.onStage = (el) => slideOf(el)?.dataset.state === "current";

// For hx-vals: the current step of el's slide.
window.stepOf = (el) => Number(slideOf(el)?.dataset.currentStep) || 0;

// Tell the server which kind of window is asking, so the presenter's
// previews stay out of the talk's request log.
document.addEventListener("htmx:configRequest", (e) => {
  e.detail.headers["Deck-Mode"] = document.documentElement.dataset.deckMode;
});
