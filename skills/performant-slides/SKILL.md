---
name: performant-slides
description: Write and review decks, slide components, themes and demos for the `deck` presentation library (lib/deck.js) so they stay smooth — compositor-only effects, components that stop when their slide isn't on screen, canvases sized to the screen, cheap enter/step handlers, and a profiling recipe that finds per-slide hot spots. Use when building or reviewing slides, step effects, transitions, themes, onSlide components (canvas, WebGL, SVG, Lit/Svelte/htmx widgets), when a deck stutters, drops frames, runs hot or lags the presenter view, or when asked to profile or audit a deck or demo for performance.
---

# Performant slides

A deck runs on one main thread per window. JavaScript, style, layout and paint
all share it; only compositing runs elsewhere. A slide stutters when something
holds that thread, not when its code is algorithmically slow. Every rule below
either keeps work off the main thread or keeps it from running when nobody is
looking.

The library is already careful: step effects animate `opacity` and
`translate`/`scale`/`rotate`, transitions are View Transitions on a snapshot,
and the presenter window is opened with `noopener` so it can get its own
thread in Chromium. Slides and components are where regressions come from.

## Rules

### Effects and CSS

- **Animate only `opacity`, `translate`, `scale`, `rotate`** (and `transform`
  outside step elements). These run on the compositor. Anything that changes
  geometry (`width`, `height`, `top`/`left`, `margin`, `padding`, font size)
  re-runs layout every frame. Anything that changes pixels (`background-position`,
  `box-shadow`, `color` on big areas, `filter: blur` on big areas) repaints
  every frame.
- Step effects should also stick to `translate`/`scale`/`rotate` rather than
  `transform`, because overview and print reset exactly those.
- **Never animate SVG elements, including the outer `<svg>`.** Chrome runs
  animations on SVG elements on the main thread (about 60 style recalcs a second for a
  slowly rotating sun). Animate an HTML box instead: the custom element's
  `:host`, or a wrapping `<div>`. A bare `g { animation: … }` also matches
  every nested `<g>` and multiplies the work.
- **Parallax/drift between slides:** put layers on a fixed element and move
  them with `translate` driven by `--deck-progress`, rather than transitioning
  `background-position`.
- **Don't use `transition: all`.** List the properties, so a state change
  doesn't quietly animate `box-shadow` or `border-color`.
- **Infinite CSS animations are fine if they're compositor-only.** A field of
  twinkling stars on `transform`/`opacity` costs ~0 main-thread time. Pause
  anything else off-slide. Shadow DOM can't see `[data-state]`, so set an
  inherited custom property from outside, e.g.
  `.deck > section[data-state="current"] { --spin: running }`, and use
  `animation-play-state: var(--spin, paused)` inside.
- **Large static filters** (`drop-shadow`/`blur` on big SVG shapes) only cost
  at paint, but they are re-rasterized for every transition snapshot. Combined
  with a full-stage `filter: blur()` View Transition, this is the usual cause of
  long frames with no script attributed to them.

### Components (`onSlide`)

- **Start on `enter`, stop on `leave`.** Every `requestAnimationFrame` or
  interval must be cancelled on `leave` and on cleanup.
- **Stop when nothing changes.** If a loop eases toward a target, stop it once
  it gets there (e.g. within half a pixel) and restart it on the next `step`. A
  settled canvas redrawn at 60fps is pure waste.
- **Respect `mode`.** Animate only when `mode === "main"`. In `"preview"` and
  `"presenter"`, draw a still frame per step. The presenter window has two
  preview iframes running the same components, so an unguarded component runs
  three times.
- **Keep `enter` and `step` cheap.** They run inside the View Transition
  callback, before the new slide is snapshotted, so synchronous work there
  delays the animation. Defer setup with `await scheduler.yield()` or a
  `requestAnimationFrame`. Move real computation (parsing, simulation, layout
  algorithms) to a Worker. `JSON.parse` of a big payload can't be split, so
  parse it in the Worker.
- **Don't write the DOM per frame unless the value changed.** Setting
  `textContent`, attributes or `dataset` invalidates style, and text changes
  also trigger layout. Compare before writing:
  `if (el.textContent !== text) el.textContent = text`. Drop debug
  `data-*` attributes that get bumped every frame.
- **Never read computed style or geometry in a frame loop.** Read
  `getComputedStyle(...)` theme tokens, `getBoundingClientRect`, `clientWidth`
  and so on once, at mount or in `resize`, and cache them. Reading after a
  write in the same frame forces a synchronous layout.
- **Text that must change every frame** (a running date or counter) costs one
  layout per frame. Keep it small, give it a fixed width, and isolate it with
  `contain: layout` so the relayout stays local. A short count-up tween that
  ends is fine.
- **Draw the final state for `reveal({ all: true })`** (overview, print), and
  skip tweens there.

### Canvas and WebGL

- **Size the backing store to the screen, not the stage.** Pixels per stage
  pixel = `scale * devicePixelRatio`, where `scale` comes from `onSlide`'s
  `resize`. A fixed stage-size canvas is blurry on a 4K projector
  (scale ≈ 2) and renders 2–3× too many pixels in a laptop window. For
  per-pixel shaders, cost scales with pixel count.
  ```js
  function fit() {
    const printing = document.documentElement.hasAttribute("data-deck-print");
    const k = (canvas.clientWidth * (printing ? 1 : deckScale) * devicePixelRatio) / W; // W = drawing units
    const w = Math.round(W * k), h = Math.round(H * k);
    if (!w || (canvas.width === w && canvas.height === h)) return; // 0 in the hidden presenter deck
    canvas.width = w; canvas.height = h;
    ctx.setTransform(k, 0, 0, k, 0, 0); // keep drawing in fixed units
    draw();
  }
  onSlide(canvas, { resize: ({ scale }) => { deckScale = scale; fit(); }, reveal: fit, … });
  ```
- **Print has no `deckresize`.** Size for scale 1 while `data-deck-print` is
  set, which `reveal` sees, since it fires on `beforeprint`. **Draw
  synchronously there:** no animation frame runs between `beforeprint` and the
  snapshot, so a redraw queued with rAF is missing from the PDF.
- **Shaders that use pixel constants** (a glow "in pixels") must divide by the
  scale, or the effect shrinks with the canvas. Pass the scale as a uniform.
- **Share one WebGL context** across many canvases. Browsers cap live
  contexts (~16), and overview plus the previews multiply the count. Render
  into the shared context and `drawImage` into each 2D canvas. Draw initial
  stills a couple per frame rather than all at once.
- Shader compile/link is synchronous when you check status right after. Do it
  once, early, not on slide entry.

### Theming the library's own chrome

- The progress bar is documented as width-driven, and themes decorate it with
  `box-shadow`/radius. Don't switch it to `scale`: the decoration would
  stretch. It's one tiny element, so the cost is negligible.

## Profiling a deck

Run the bundled profiler (`scripts/` in this skill's directory) against a served
deck (production build for framework demos: `vite preview`, `astro preview`):

```sh
uv run scripts/profile.py http://127.0.0.1:8000/demos/vanilla/ [more urls…]
```

It steps through every step of the deck with the arrow keys and prints, for
each position:
- **nav:** main-thread time spent on that navigation;
- **idle/s:** script, layout and style per second while sitting on the slide;
- **long frames:** frames over 50ms, with script attribution from the
  long-animation-frame API.

Then it returns to slide 1, opens overview, and measures the presenter
window.

Reading it:
- **Idle should be ~0** on static slides. Anything above a handful of
  layouts/style recalcs a second while idle means a loop or a main-thread
  animation is running. Check its CSS animations
  (`el.getAnimations({ subtree: true })`, including shadow roots) and rAF loops.
  Pausing one candidate and re-measuring confirms the cause.
- **Style ticks without layouts** usually mean a CSS animation the compositor
  didn't take (an SVG target, or a non-composited property).
- **Work on "back on first slide" or in overview** that wasn't there at the
  start means something didn't stop on `leave`.
- **Long frames with empty script lists** come from paint/raster: filters,
  big shadows, transition snapshots.

Caveats:
- Headless Chromium rasterizes and runs WebGL in software. Absolute numbers
  for canvas, WebGL and filter-heavy slides are inflated, so judge those on
  shape (does it stop? does it scale?). For real numbers, record ~5s on the slide
  in the DevTools Performance panel on real hardware.
- Treat a finding as confirmed only after measuring it before and after
  the fix. Theory about what the compositor takes is often wrong; the SVG
  rule above was learned that way.

## Review checklist

- [ ] Animated properties: only `opacity`/`translate`/`scale`/`rotate`/`transform`; nothing animated on SVG elements
- [ ] Every rAF/interval cancelled on `leave`; loops stop when settled
- [ ] Animation gated on `mode === "main"`; previews draw stills
- [ ] No per-frame `getComputedStyle`/geometry reads; DOM writes only on change
- [ ] `enter`/`step` do no heavy sync work; heavy compute in a Worker
- [ ] Canvases sized from `resize` × DPR, stage resolution for print, drawn synchronously in `reveal`
- [ ] `reveal({ all })` draws the final state
- [ ] Profiler: idle ≈ 0 on static slides, nothing running after leaving, overview quiet
