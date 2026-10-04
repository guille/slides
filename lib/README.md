# deck

A small, dependency-free presentation runtime: a fixed 1920×1080 stage scaled to
the window, keyboard/click/swipe navigation, steps within slides, an overview
grid, PDF export through print CSS, and a presenter view synced across windows.

Plain ES modules and CSS. No build step required.

## Minimal deck

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My talk</title>
  <link rel="stylesheet" href="../../lib/deck.css">
  <link rel="stylesheet" href="./theme.css">
</head>
<body>
  <main class="deck" data-transition="fade" data-progress>
    <section data-layout="title" id="intro">
      <h1>My talk</h1>
      <p>Subtitle</p>
      <aside class="notes">Speaker notes, any HTML.</aside>
    </section>

    <section>
      <h2>Three things</h2>
      <ul>
        <li data-step>First</li>
        <li data-step>Second</li>
        <li data-step>Third</li>
      </ul>
    </section>
  </main>
  <script type="module">
    import { deck } from "../../lib/deck.js";
    deck(document.querySelector(".deck"));
  </script>
</body>
</html>
```

Serve decks over http(s), not `file://`. Module scripts and BroadcastChannel
need a real origin.

## Authoring contract

- **Slides** are the direct `<section>` children of `.deck`. Author at 1920×1080
  real pixels. Content never reflows; the whole stage scales.
- **Ids:** give a slide an `id` to link to it by name (`#intro`). Don't use
  all-digit ids or ids ending in `.<digits>`. Those fall back to the slide
  number in the URL.
- **Persistent chrome:** any other child of `.deck` (a logo, a live readout)
  sits on the scaled stage above every slide. Position it absolutely. It's
  hidden in overview and print. Restyle it per slide through
  `.deck[data-slide-layout="…"] > …`.
- **Speaker notes:** `<aside class="notes">` anywhere inside a slide. Hidden on
  stage, shown in the presenter view.
- **Overflow is a bug.** Slides clip at the stage edge. The runtime watches
  slide content as it changes size (images loading, fonts, components). An
  overflowing slide, or a clipped `<pre>`, triggers a console warning
  (`deck: slide N (#id) overflows the stage`, once web fonts have loaded) and
  a red outline in the overview.
  Split the slide or cut content instead of shrinking text. Decoration meant
  to run off the edge goes inside a `.backdrop`, which doesn't count.

### Layouts: `<section data-layout="…">`

| Layout    | Use for                         | Structure                                                      |
| --------- | ------------------------------- | -------------------------------------------------------------- |
| (none)    | Default: heading + content      | Vertical flex column with `--deck-gap` spacing                  |
| `title`   | Opening slide                   | `h1` + optional `p`/`h2` subtitle, vertically centered          |
| `section` | Chapter divider                 | `--deck-section-bg` background, big `h1`/`h2`. Text, progress bar and slide number use `--deck-section-fg` |
| `center`  | Single statement, big number    | Everything centered                                             |
| `split`   | Two columns                     | Optional heading (`h1`–`h3` or `header`) spans both, then exactly two block children |
| `bleed`   | Full-bleed photo/video          | Direct `img`/`video` fills the slide. Every other direct child becomes a caption box at bottom-left (max 60% wide, translucent `--deck-bg`) |
| `quote`   | Quotation                       | `blockquote` + optional `cite`/`figcaption`. The opening mark is `blockquote::before` |

Helper classes: `.muted`, `.accent`, `.small`, `.grow` (take remaining
space), `.columns` (equal-width columns from children), `.backdrop` (a layer
covering the slide, behind the content, clipped to the slide's edge: position
decoration inside it, and let it bleed).

State hooks for CSS:

| Hook                                   | Meaning                                    |
| -------------------------------------- | ------------------------------------------ |
| `section[data-state="past\|current\|future"]` | Slide position relative to the current one |
| `section[data-current-step]`, `[data-steps]` | Current step and step count, written on the current slide |
| `.deck[data-slide-layout="…"]`         | The current slide's layout, for deck-level chrome |
| `html[data-deck-mode="main\|presenter\|preview"]` | Which kind of window this is            |
| `html[data-deck-overview]`, `[data-deck-print]`, `[data-deck-blackout]` | Overview open, printing, blacked out |
| `html { --deck-slide; --deck-step }`   | Current slide index (0-based) and step, as numbers for `calc()` |
| `html { --deck-progress }`             | 0 on the first slide, 1 on the last        |

**A background behind the whole deck** goes on `body`, which is the letterbox
(`--deck-letterbox` by default) and sits behind the stage, so it fills the
window and stays put during slide transitions. Make slides transparent on
stage only; thumbnails and PDF pages have no `body` behind them, so give them
the background themselves:

```css
@media screen {
  html[data-deck-mode] body {
    background: url(stars.svg) calc(var(--deck-slide) * -40px) 0 / auto 100% repeat-x, var(--deck-bg);
  }
  html:not([data-deck-overview]) .deck > section { background: transparent; }
}
html[data-deck-overview] .deck > section { background: url(stars.svg) center / cover, var(--deck-bg); }
@media print { .deck > section { background: url(stars.svg) center / cover, var(--deck-bg); } }
```

For a drift that animates between slides, put the layers on a fixed element
behind the stage and move them with `translate` (driven by `--deck-progress`)
rather than transitioning `background-position`, which repaints the whole
window every frame. `demos/astro` does this.

### Steps: `data-step`

Elements with `data-step` change state as you press next.

- **Numbering:** an element without a value is one step after the previous
  step element in document order, which may be an explicit one. Explicit
  numbers group (`data-step="2"` on several elements reveals them together) or
  reorder.
- **Step 0** is the slide with nothing revealed. `data-step="0"` means "visible
  from the start".
- **Gaps** in numbering create steps where nothing changes.
- **JS-driven steps:** `data-step-count="4"` on the slide, or on any element
  inside it, gives the slide at least four steps even with no `data-step`
  elements. A component then reacts through `onSlide`'s `step` callback. A
  component can set the count on its own host element, so the number lives
  next to the data it draws. Counts don't add up: the slide takes the largest.
- **Fixed counts:** a slide's step count must be in the page from the start,
  as `data-step` elements or `data-step-count`. Define components that set
  their own count before calling `deck()`, or a deep link to one of their
  steps is clamped. Each window counts steps in
  its own DOM and clamps synced positions to that count, so steps added
  later (a fetched fragment) put windows out of step.

On the current slide, every step element gets
`data-state="future" | "current" | "past"`. Elements on other slides, and every
element in overview and print/PDF, have **no** `data-state`. Effects keyed on
`[data-state]` therefore switch off automatically and slides show fully
revealed.

| `data-effect` | Behaviour                                         |
| ------------- | ------------------------------------------------- |
| (none)        | Fade in at its step, then stays                    |
| `rise`        | Fade in while sliding up                           |
| `dim`         | Fade in, then dim once a later step is shown       |
| `only`        | Visible only during its own step                   |
| `highlight`   | Always visible, accent colored during its step     |
| anything else | Default reveal, plus whatever CSS you write for it |

Custom effects are just CSS on `[data-state]`. Move things with `translate`,
`scale` and `rotate`, not `transform`: overview and print reset those three
(plus `opacity`, `visibility`, `filter` and `clip-path`), and `transform` is
left alone for layout, e.g. `transform: translateX(-50%)` on a step element.

```css
.deck [data-effect="blur"] { transition: filter var(--deck-step-duration), opacity var(--deck-step-duration); }
.deck [data-effect="blur"][data-state="future"] { filter: blur(12px); }
.deck [data-effect="blur"][data-state="past"] { opacity: 0.4; }
```

`only` elements that share a slot (rotating captions) all appear at once in
overview and print. If they're stacked on top of each other, stack them only
for the live view: `html:not([data-deck-overview]) …` inside `@media screen`.

### Options on `.deck`

| Attribute                        | Effect                                                |
| -------------------------------- | ----------------------------------------------------- |
| `data-transition="fade"`         | Slide transition: `none` (default), `fade`, `slide`, or your own name |
| `data-progress`                  | Progress bar along the bottom (`.deck::after`, width from `--deck-progress`, 0–1) |
| `data-slide-numbers`             | Slide number bottom-right (`section::after`). `data-no-number` on a slide hides it |
| `data-width` / `data-height`     | Stage size in px (default 1920×1080)                   |

A slide can override the transition with its own `data-transition`. Moving
forward uses the incoming slide's transition; moving back uses the outgoing
one, so the same animation plays in reverse.

### Theming

All styling is CSS custom properties on `:root`. Override any of these in
your theme file:

```css
:root {
  --deck-bg: #fbfaf7;          /* slide background */
  --deck-fg: #1c1b19;          /* text */
  --deck-muted: #6b6862;       /* secondary text */
  --deck-accent: #d9480f;      /* highlights, markers, section slides, overview outline */
  --deck-accent-fg: #ffffff;   /* text on accent */
  --deck-section-bg / --deck-section-fg  /* section layout; default to the accent pair */
  --deck-surface: #efece6;     /* code blocks, table rules */
  --deck-letterbox: #111111;   /* around the stage */
  --deck-font-sans / --deck-font-heading / --deck-font-mono
  --deck-size-body: 40px;  --deck-size-small: 28px;
  --deck-size-h1: 112px;   --deck-size-h2: 72px;   --deck-size-h3: 48px;
  --deck-weight-h1: 800;   --deck-weight-h2: 700;  --deck-weight-h3: 600;
  --deck-line-height: 1.4;          /* body text */
  --deck-heading-line-height: 1.1;
  --deck-heading-tracking: -0.02em; /* heading letter-spacing */
  --deck-heading-variation: normal; /* heading font-variation-settings */
  --deck-pad: 112px;       /* slide padding */
  --deck-gap: 40px;        /* space between blocks */
  --deck-radius: 16px;
  --deck-transition-duration: 450ms;
  --deck-step-duration: 300ms;
}
```

Write theme and slide CSS as plain, unlayered CSS. It beats every library
default with no specificity fights. Only the stage mechanics (slide
positioning, hiding inactive slides, hiding `.notes`) use `!important`, so a
stray `section { position: relative }` can't break the deck.

<details><summary>Cascade layer details</summary>

Library CSS lives in `@layer deck.base, deck.layouts, deck.steps, deck.theme,
deck.core` (later wins). If you'd rather ship a reusable theme that per-deck
unlayered CSS can still override, put it in `@layer deck.theme { … }` and
load it after `deck.css`.

</details>

### Custom transitions

Transitions use the View Transitions API on the element named `deck`. While a
transition runs, `<html>` carries `data-deck-transition="<name>"` and
`data-deck-direction="forward" | "backward"`. To add one, pick a name and
target it:

```css
html[data-deck-transition="zoom"]::view-transition-old(deck) { animation: 400ms ease both zoom-out; }
html[data-deck-transition="zoom"]::view-transition-new(deck) { animation: 400ms ease both zoom-in; }
html[data-deck-transition="zoom"][data-deck-direction="backward"]::view-transition-old(deck) { /* … */ }
```

For full control, pass a function in JS. Call `update()` to swap the slides;
it may return a promise. If it never calls `update()`, the deck calls it once
the function returns or its promise settles.

```js
deck(root, {
  transition: async (update, { from, to, direction }) => { /* animate out */ update(); /* animate in */ },
});
```

Transitions are skipped under `prefers-reduced-motion`, in overview, and in
the presenter window and its previews. Pressing keys quickly during a transition
is safe: the deck renders and reports the latest position when the transition
lands.

## Controls

| Key                                   | Action                       |
| ------------------------------------- | ---------------------------- |
| → ↓ PageDown Space                    | Next step / slide            |
| ← ↑ PageUp Shift+Space                | Previous step / slide        |
| Home / End                            | First / last slide           |
| O, then arrows/Home/End + Enter (Esc closes) | Overview grid; clicking a thumbnail opens it |
| P                                     | Open presenter view          |
| F                                     | Fullscreen                   |
| B or .                                | Black screen (main window only; presenter shows a badge) |

Clicking the left third of the screen goes back, anywhere else goes forward.
Clicks and swipes are ignored when they start inside these elements:
`a, button, input, select, textarea, label, summary, video, audio, iframe,
[contenteditable], [data-no-nav]`. Keys go to a focused form field (a text
box, a range slider); **Esc** releases focus back to the deck. These checks
look at where the event started, including inside open shadow roots.

The URL hash tracks position as `#<slide>[.<step>]`, where `<slide>` is the
slide's id if it has a usable one, else its 1-based number: `#3`, `#3.2`,
`#intro.1`.

## Presenter view

Press **P**, or open the deck URL with `?presenter`. It shows the current
step, the next step, notes (A−/A+ resize them), a timer (starts on first
navigation; click to pause), and a clock. All windows of the same deck in the
same browser stay in sync through BroadcastChannel, and any window can drive.

A window opened with a position in its hash takes the others there. A window
opened without one joins wherever the others are.

The presenter window runs the deck on a hidden stage. Its slides get no
`data-state`, and it fires the deck-level events (`deckchange`,
`blackoutchange`, `deckresize`, `revealchange`) but no `slideenter`,
`slideleave` or `stepchange`, so components in it never start.

The previews are iframes of the same page loaded with `?preview`, so deck
scripts and components run there too, and so do their server requests: keep
slide-driven requests idempotent, or skip them unless `mode` is `"main"`. Every event and `onSlide` callback
receives `mode` (`"main" | "presenter" | "preview"`) so components can skip
expensive work outside `"main"`. Outside `"main"`, `<video>` and `<audio>`
are muted automatically, so only the audience window makes sound. Embedded
iframe players (YouTube etc.) can't be muted this way.

## PDF

`@page` matches the stage size and print mode stacks every slide with all
steps revealed. Use the browser's print dialog ("Save as PDF", margins none,
background graphics on) or:

```sh
mise run pdf http://localhost:8000/ talk.pdf
```

## JavaScript API

```js
import { deck, onSlide } from "@slides/deck";   // or a relative path to deck.js

const d = deck(rootEl, { width, height, transition, clickNav });
```

TypeScript types come with the package (`index.d.ts`), including the event
map, so `root.addEventListener("deckchange", e => e.detail.slide)` is typed.
They're generated from `deck.js`'s JSDoc into `types/`: run `mise run types`
after changing the API, and `mise run types:check` to type-check `lib/` and
catch stale types.

`deck()` called again on the same element destroys the previous instance first.

| Member                              | Description                                          |
| ----------------------------------- | ---------------------------------------------------- |
| `next()`, `prev()`                  | Step forward/back, crossing slides                   |
| `goto(slide, step = 0)`             | 0-based slide; `step` is clamped (`Infinity` = last) |
| `slide`, `step`, `steps`            | Current position and the current slide's step count  |
| `slides`, `root`, `mode`, `width`, `height` | Slide elements, root, `"main" \| "presenter" \| "preview"`, stage size |
| `overview`, `blackout`              | Current toggles                                      |
| `scale`                             | On-screen pixels per stage pixel (a thumbnail's in overview) |
| `stepCount(i)`                      | Step count of slide `i`                              |
| `positionAfter(slide, step)`        | `{slide, step}` that `next()` would go to, or `null` |
| `ref(slide, step)`                  | Hash string for a position (`"intro.1"`)             |
| `notes(i)`                          | Notes HTML of slide `i`                              |
| `setOverview(bool)`, `setBlackout(bool)`, `toggleFullscreen()`, `openPresenter()` | |
| `overflowing()`                     | Slides whose content currently overflows             |
| `refresh()`                         | Re-scan slides after adding/removing sections. Stays on the current slide element; fires events only if that slide was removed |
| `destroy()`                         | Remove listeners and observers (e.g. on HMR)         |

Events (all bubble). Every `detail` also has `mode` (`"main" | "presenter" |
"preview"`). `direction` is `"forward"`, `"backward"`, or `"none"` for the
initial render:

| Event            | Target   | `detail`                                             |
| ---------------- | -------- | ---------------------------------------------------- |
| `deckchange`     | `.deck`  | `{ slide, step, steps, previous, direction }` (`previous` is `null` initially) |
| `slideenter`     | section  | `{ step, direction }`                                |
| `slideleave`     | section  | `{ direction }`                                      |
| `stepchange`     | section  | `{ step, steps, direction }` (also fires on enter)   |
| `blackoutchange` | `.deck`  | `{ blackout }`                                       |
| `deckresize`     | `.deck`  | `{ scale }`, when `scale` changes                    |
| `revealchange`   | `.deck`  | `{ all }`: `true` when overview or print opens, `false` when it closes |

Events describe what's rendered. Several quick presses during a transition
produce one set of events for the final position, not one per press.

### Interactive components

`onSlide(el, { enter, leave, step, reveal, resize })` subscribes a component to the slide
that contains `el`, climbing out of shadow roots if `el` is inside one. If that slide is already current, `enter` and `step` are
called right away with `direction: "none"` (plus `mode`, like every event), so it doesn't matter whether the
component mounts before or after `deck()` runs. The root must already have
class `deck`. It returns a cleanup function.

`reveal({ all })` follows `revealchange`: while `all` is true (overview, print),
draw the final state, the way `[data-step]` elements are all shown. It's
called right away with `all: true` if the deck is already in overview.

`resize({ scale })` follows `deckresize`, and is called right away if `deck()`
has already run. A `<canvas>` is drawn at stage size and then scaled, so for
crisp output give it `scale * devicePixelRatio` backing pixels per stage pixel.

```js
const stop = onSlide(canvas, {
  enter: () => animation.play(),
  leave: () => animation.pause(),
  step: ({ step }) => chart.showSeries(step),
  reveal: ({ all }) => chart.showAll(all),
});
```

- Without JS, "this slide is on screen" is
  `el.closest(".deck > section").dataset.state === "current"`. That's true in
  the audience window and the previews, never in the presenter window. The
  first `slideenter`/`stepchange` fire while `deck()` runs, so a listener
  attached later (htmx processes `hx-*` on `DOMContentLoaded`) misses them.
  Check the state on mount instead, as `onSlide` does, e.g. with htmx:
  `hx-trigger="load[onStage(this)], stepchange from:closest section"`, where
  the page defines `onStage` as that check.
- Elements that take clicks themselves should be buttons or links, or sit
  inside `data-no-nav`, so clicking them doesn't advance the deck.
- To claim a key, handle `keydown` on the element itself (or in the capture
  phase) and call `event.preventDefault()`. The deck listens on `document`
  and skips events that are already default-prevented.
- Draw a sensible still frame up front, because components render in overview
  and print too. For print, draw the final state from `reveal`, which fires on
  `beforeprint` (`mise run pdf` dispatches it too). Without JS, `<html>` has
  `data-deck-print` or `data-deck-overview`. Skip tweens there, or the PDF
  catches them mid-animation.

### Choosing a setup

The library needs nothing but HTML. Pick a framework for what it adds:

- **No build** (`demos/vanilla`): the default. Code pastes verbatim, and the
  deck still opens in five years.
- **Astro** (`demos/astro`): repeated or data-driven slides, and build-time
  assets (generated SVG, highlighted code) with no client JS.
- **Svelte** (`demos/svelte`): many stateful, animated visualizations.
- **Lit** (`demos/lit`): widgets reused outside the deck. For one deck, render
  into the light DOM or use plain custom elements.
- **htmx + a server** (`demos/htmx`): live demos of a backend.
- **React** (no demo): when you want your product's real components on a
  slide, or a React-only library (charts, 3D).

### Using it from a framework (Svelte, React, …)

- Render the `<section>`s as **direct children** of the root. A `<Slide>`
  component must render the `section` itself, not wrap it.
- Call `deck(root)` after the slides mount and `destroy()` on unmount. Calling
  `deck()` again on the same root (HMR) destroys the old instance for you.
- When slides are added or removed after init, call `refresh()`.
- Wrap `onSlide` in whatever your framework uses for element lifecycles (a
  Svelte action/attachment, a React effect with a ref).
- React's strict mode runs effects twice in development. Return `destroy()`
  from the effect that calls `deck()`, or every mount logs the
  "already initialized" warning.

### Web components and shadow DOM

Clicks, keys and `onSlide` work from inside open shadow roots.
Document CSS doesn't reach into them, so:

- **Steps:** `data-step` inside a shadow root isn't seen. Either keep step
  elements in the light DOM (a custom element can be the step and style its
  shadow content with `:host([data-state="current"])`), or draw steps in JS
  and set `data-step-count` on the host.
- **Slide state:** bridge state hooks with an inherited custom property, e.g.
  `.deck > section[data-state="current"] { --spin: running }`, read inside as
  `animation-play-state: var(--spin, paused)`.
- **Typography:** `--deck-*` tokens and inherited `font`/`color` cross the
  boundary; element rules (`h3`, `.muted`) don't, so rebuild what you use from
  the tokens.
- **Closed shadow roots** hide where an event started. Put `data-no-nav` on
  the host.
