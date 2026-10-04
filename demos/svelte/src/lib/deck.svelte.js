import { getContext, setContext } from "svelte";
import { onSlide } from "@slides/deck";

const KEY = Symbol("deck");

export const setDeckContext = (ctx) => setContext(KEY, ctx);
export const getDeckContext = () => getContext(KEY);

// Attachment form of onSlide: <canvas {@attach slide({ enter, leave })}>
export const slide = (handlers) => (el) => onSlide(el, handlers);

// Reactive view of the enclosing slide. Attach `track` to any element inside it.
export class SlideState {
  active = $state(false);
  step = $state(0);
  steps = $state(0);
  // Print and overview reveal every data-step; JS-driven components should match.
  revealAll = $state(false);

  track = (el) =>
    onSlide(el, {
      enter: ({ step }) => {
        this.active = true;
        this.step = step;
      },
      leave: () => {
        this.active = false;
      },
      step: ({ step, steps }) => {
        this.step = step;
        this.steps = steps;
      },
      reveal: ({ all }) => {
        this.revealAll = all;
      },
    });

  shown(last) {
    return this.revealAll ? last : Math.min(this.step, last);
  }
}
