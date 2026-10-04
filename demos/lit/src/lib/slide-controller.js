import { onSlide } from "@slides/deck";

// Slide lifecycle for a Lit element: re-renders the host whenever the slide is
// entered or left, the step changes, or overview/print toggles.
// `stepCount` is how many steps the component draws itself. It's set on the
// host as data-step-count, so the deck gives the slide that many steps.
export class SlideController {
  active = false;
  step = 0;
  steps = 0;
  // Overview and print: draw the final state.
  revealAll = false;

  constructor(host, { stepCount = 0 } = {}) {
    this.host = host;
    this.stepCount = stepCount;
    host.addController(this);
  }

  // The step to draw, capped at `last`.
  shown(last = this.stepCount) {
    return this.revealAll ? last : Math.min(this.step, last);
  }

  hostConnected() {
    const update = () => this.host.requestUpdate();
    if (this.stepCount) this.host.dataset.stepCount = this.stepCount;
    this.stop = onSlide(this.host, {
      enter: ({ step }) => {
        this.active = true;
        this.step = step;
        update();
      },
      leave: () => {
        this.active = false;
        update();
      },
      step: ({ step, steps }) => {
        this.step = step;
        this.steps = steps;
        update();
      },
      reveal: ({ all }) => {
        this.revealAll = all;
        update();
      },
    });
  }

  hostDisconnected() {
    this.stop?.();
  }
}
