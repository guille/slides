/** @typedef {"main" | "presenter" | "preview"} DeckMode */
/** @typedef {"forward" | "backward" | "none"} Direction */
/** @typedef {{ slide: number, step: number }} Position */

/**
 * A custom transition: call `update` to render the new slide, animating around it.
 * @callback TransitionFn
 * @param {() => void} update
 * @param {{ from: HTMLElement, to: HTMLElement, direction: Direction }} info
 * @returns {void | Promise<void>}
 */

/**
 * @typedef {object} DeckOptions
 * @property {number} [width] Stage width in px (default `data-width`, else 1920).
 * @property {number} [height] Stage height in px (default `data-height`, else 1080).
 * @property {string | TransitionFn} [transition] Default slide transition (default `data-transition`, else "none").
 * @property {boolean} [clickNav] Clicking the stage navigates (default true).
 */

/** @typedef {{ slide: number, step: number, steps: number, previous: Position | null, direction: Direction, mode: DeckMode }} DeckChangeDetail */
/** @typedef {{ step: number, direction: Direction, mode: DeckMode }} SlideEnterDetail */
/** @typedef {{ direction: Direction, mode: DeckMode }} SlideLeaveDetail */
/** @typedef {{ step: number, steps: number, direction: Direction, mode: DeckMode }} StepChangeDetail */
/** @typedef {{ blackout: boolean, mode: DeckMode }} BlackoutChangeDetail */
/** @typedef {{ all: boolean, mode: DeckMode }} RevealChangeDetail */
/** @typedef {{ scale: number, mode: DeckMode }} DeckResizeDetail */

/**
 * @typedef {object} SlideHandlers
 * @property {(detail: SlideEnterDetail) => void} [enter] The slide became current.
 * @property {(detail: SlideLeaveDetail) => void} [leave] The slide stopped being current.
 * @property {(detail: StepChangeDetail) => void} [step] The step changed (also on enter).
 * @property {(detail: RevealChangeDetail) => void} [reveal] Overview or print opened (`all: true`) or closed: draw the final state while open.
 * @property {(detail: DeckResizeDetail) => void} [resize] On-screen pixels per stage pixel changed.
 */

/** @typedef {ReturnType<typeof deck>} Deck */

const NAV_IGNORE = "a, button, input, select, textarea, label, summary, video, audio, iframe, [contenteditable], [data-no-nav]";
const TYPING = "input, select, textarea, [contenteditable]";

// Events leaving a shadow root are retargeted to its host, so filters test
// where the event actually started.
/** @type {(e: Event, selector: string) => boolean} */
const startsIn = (e, selector) => e.composedPath().some((n) => n instanceof Element && n.matches(selector));

const html = document.documentElement;
// Overview and print show every step, and components should draw their final state.
const revealing = () => "deckOverview" in html.dataset || "deckPrint" in html.dataset;
/** @type {WeakMap<Element, { readonly mode: DeckMode, readonly scale: number, destroy(): void }>} */
const instances = new WeakMap();

/** @type {(el: ParentNode, selector: string) => (HTMLElement | SVGElement)[]} */
const all = (el, selector) =>
  [...el.querySelectorAll(selector)].filter((e) => e instanceof HTMLElement || e instanceof SVGElement);

/** @type {(e: Event) => any} */
const detailOf = (e) => /** @type {CustomEvent} */ (e).detail;

/** @type {(node: Element) => HTMLElement | null} */
const slideOf = (node) => node.closest(".deck > section");

/**
 * Start a deck on `target`, whose direct `<section>` children are the slides.
 * @param {Element | null} [target]
 * @param {DeckOptions} [options]
 */
export function deck(target = document.querySelector(".deck"), options = {}) {
  if (!(target instanceof HTMLElement)) throw new Error("deck: root element not found");
  const root = target;
  const previous = instances.get(root);
  if (previous) {
    console.warn("deck: already initialized on this element; destroying the previous instance");
    previous.destroy();
  }

  const opts = {
    width: Number(root.dataset.width) || 1920,
    height: Number(root.dataset.height) || 1080,
    transition: root.dataset.transition ?? "none",
    clickNav: true,
    ...options,
  };
  const params = new URLSearchParams(location.search);
  /** @type {DeckMode} */
  const mode = params.has("presenter") ? "presenter" : params.has("preview") ? "preview" : "main";
  // The presenter window's stage is never shown, so its slides carry no state
  // and fire no slide events: components there stay idle.
  const staged = mode !== "presenter";
  const ac = new AbortController();
  const listen = (target, type, fn, extra) => target.addEventListener(type, fn, { signal: ac.signal, ...extra });

  /** @type {HTMLElement[]} */
  let slides = [];
  let index = 0;
  let step = 0;
  // Slide element and step last rendered to the DOM. Lags behind index/step
  // while a transition waits to capture the old slide.
  /** @type {{ el: HTMLElement, step: number } | null} */
  let rendered = null;
  let pending = false;
  let overview = false;
  let blackout = false;
  /** @type {ViewTransition | null} */
  let activeTransition = null;
  let idleTimer;

  root.classList.add("deck");
  html.dataset.deckMode = mode;
  root.style.setProperty("--deck-width", `${opts.width}px`);
  root.style.setProperty("--deck-height", `${opts.height}px`);

  const pageStyle = document.createElement("style");
  pageStyle.textContent = `@page { size: ${opts.width}px ${opts.height}px; margin: 0; }`;
  document.head.append(pageStyle);

  function stepsOf(slide) {
    let n = 0;
    let count = 0;
    for (const el of [slide, ...all(slide, "[data-step-count]")]) {
      count = Math.max(count, Number(el.dataset.stepCount) || 0);
    }
    const items = all(slide, "[data-step]").map((el) => {
      const explicit = parseInt(el.dataset.step ?? "", 10);
      n = Number.isNaN(explicit) ? n + 1 : explicit;
      count = Math.max(count, n);
      return { el, n };
    });
    return { items, count };
  }

  /** @type {(i: number) => number} */
  const stepCount = (i) => (slides[i] ? stepsOf(slides[i]).count : 0);

  /**
   * The position after slide `i`, step `s`, or null at the end.
   * @param {number} i
   * @param {number} s
   * @returns {Position | null}
   */
  function positionAfter(i, s) {
    if (s < stepCount(i)) return { slide: i, step: s + 1 };
    if (i < slides.length - 1) return { slide: i + 1, step: 0 };
    return null;
  }

  // Ids that would parse back as a number or as "id.step" fall back to the slide number.
  const hashSafe = (id) => id && !/^\d+$/.test(id) && !/\.\d+$/.test(id);

  /**
   * The URL hash for a position, without the `#`.
   * @param {number} i
   * @param {number} [s]
   */
  function ref(i, s = 0) {
    const id = slides[i]?.id;
    return (hashSafe(id) ? encodeURIComponent(id) : String(i + 1)) + (s ? `.${s}` : "");
  }

  function parseHash() {
    let h;
    try {
      h = decodeURIComponent(location.hash.slice(1));
    } catch {
      return null;
    }
    if (!h) return null;
    const [, name, s] = h.match(/^(.*?)(?:\.(\d+))?$/);
    const i = /^\d+$/.test(name) ? Number(name) - 1 : slides.findIndex((el) => el.id === name);
    return i >= 0 && i < slides.length ? { slide: i, step: s ? Number(s) : 0 } : null;
  }

  function writeHash() {
    if (mode !== "preview") history.replaceState(null, "", `#${ref(index, step)}`);
  }

  function render() {
    slides.forEach((el, i) => {
      if (staged) el.dataset.state = i < index ? "past" : i > index ? "future" : "current";
      el.inert = !overview && i !== index;
    });
    // Steps only carry state on the live slide, so overview shows plain, fully revealed slides.
    for (const el of all(root, "[data-step][data-state]")) delete el.dataset.state;
    const current = slides[index];
    if (staged) {
      const { items, count } = stepsOf(current);
      if (!overview) {
        for (const { el, n } of items) el.dataset.state = n < step ? "past" : n === step ? "current" : "future";
      }
      current.dataset.currentStep = String(step);
      current.dataset.steps = String(count);
    }
    if (current.dataset.layout) root.dataset.slideLayout = current.dataset.layout;
    else delete root.dataset.slideLayout;
    // On <html>, so backgrounds behind the stage (body, the letterbox) can follow along.
    html.style.setProperty("--deck-progress", String(slides.length > 1 ? index / (slides.length - 1) : 1));
    html.style.setProperty("--deck-slide", String(index));
    html.style.setProperty("--deck-step", String(step));
    if (overview) current.scrollIntoView({ block: "nearest" });
  }

  function emit(target, type, detail) {
    target.dispatchEvent(new CustomEvent(type, { bubbles: true, detail: { ...detail, mode } }));
  }

  // Bring the DOM up to the current position and announce whatever changed
  // since the last render. Safe to call late or more than once.
  function update() {
    pending = false;
    const el = slides[index];
    const prior = rendered;
    if (prior && prior.el === el && prior.step === step) return;
    render();
    rendered = { el, step };

    const steps = stepCount(index);
    const previous = prior && { slide: slides.indexOf(prior.el), step: prior.step };
    const direction = !previous
      ? "none"
      : index > previous.slide || (index === previous.slide && step > previous.step)
        ? "forward"
        : "backward";
    const slideChanged = prior?.el !== el;
    if (staged) {
      if (slideChanged && prior) emit(prior.el, "slideleave", { direction });
      if (slideChanged) emit(el, "slideenter", { direction, step });
      emit(el, "stepchange", { direction, step, steps });
    }
    emit(root, "deckchange", { slide: index, step, steps, previous, direction });
  }

  function runTransition(from, to, direction) {
    const t = (direction === "backward" ? slides[from] : slides[to]).dataset.transition ?? opts.transition;
    const skip =
      !t || t === "none" || mode !== "main" || overview ||
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (skip) return update();

    if (typeof t === "function") {
      pending = true;
      Promise.resolve()
        .then(() => t(update, { from: slides[from], to: slides[to], direction }))
        .catch((err) => console.error("deck: transition failed", err))
        .finally(() => pending && update());
      return;
    }
    if (!document.startViewTransition) return update();

    activeTransition?.skipTransition();
    html.dataset.deckTransition = t;
    html.dataset.deckDirection = direction;
    pending = true;
    const vt = document.startViewTransition(update);
    vt.ready.catch(() => {});
    activeTransition = vt;
    vt.finished.finally(() => {
      if (activeTransition !== vt) return;
      activeTransition = null;
      delete html.dataset.deckTransition;
      delete html.dataset.deckDirection;
    });
  }

  /**
   * Go to slide `i`, step `s`. Both are clamped; `Infinity` means the last step.
   * @param {number} i
   * @param {number} [s]
   * @param {{ remote?: boolean }} [opts] `remote`: the move came from another window, so don't echo it.
   */
  function goto(i, s = 0, { remote = false } = {}) {
    if (!slides.length || Number.isNaN(Number(i))) return;
    i = Math.max(0, Math.min(slides.length - 1, Number(i)));
    s = Math.max(0, Math.min(stepCount(i), Number(s) || 0));
    if (i === index && s === step) return;

    const from = index;
    const direction = i > index || (i === index && s > step) ? "forward" : "backward";
    index = i;
    step = s;

    // A pending transition will render the latest position when it runs.
    if (!pending) {
      if (slides[i] !== (rendered?.el ?? slides[from])) runTransition(from, i, direction);
      else update();
    }
    writeHash();
    if (!remote) broadcast();
  }

  function next() {
    const pos = positionAfter(index, step);
    if (pos) goto(pos.slide, pos.step);
  }

  function prev() {
    if (step > 0) goto(index, step - 1);
    else if (index > 0) goto(index - 1, Infinity);
  }

  // On-screen size of one stage pixel: the stage's scale, or a thumbnail's in overview.
  let scale = 0;
  function fit() {
    let next = Math.min(innerWidth / opts.width, innerHeight / opts.height);
    root.style.setProperty("--deck-scale", String(next));
    if (overview) {
      const gap = 24;
      const width = root.clientWidth;
      const cols = Math.max(1, Math.floor((width - gap) / 380));
      next = (width - gap * (cols + 1)) / cols / opts.width;
      root.style.setProperty("--deck-cols", String(cols));
      root.style.setProperty("--deck-thumb", String(next));
    }
    if (next === scale) return;
    scale = next;
    emit(root, "deckresize", { scale });
  }

  /** @param {boolean} on */
  function setOverview(on) {
    if (mode !== "main" || on === overview) return;
    overview = on;
    on ? (html.dataset.deckOverview = "") : delete html.dataset.deckOverview;
    fit();
    render();
    announceReveal();
  }

  let revealed = false;
  function announceReveal() {
    if (revealing() === revealed) return;
    revealed = !revealed;
    emit(root, "revealchange", { all: revealed });
  }

  /**
   * @param {boolean} on
   * @param {{ remote?: boolean }} [opts]
   */
  function setBlackout(on, { remote = false } = {}) {
    if (on === blackout) return;
    blackout = on;
    on ? (html.dataset.deckBlackout = "") : delete html.dataset.deckBlackout;
    emit(root, "blackoutchange", { blackout });
    if (!remote) broadcast();
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else html.requestFullscreen?.().catch(() => {});
  }

  function openPresenter() {
    const url = new URL(location.href);
    url.searchParams.set("presenter", "");
    window.open(url.href, `deck-presenter:${location.pathname}`, "popup,width=1280,height=800");
  }

  const clips = (el) => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;

  function overflowing() {
    return slides.filter((el) => clips(el) || [...el.querySelectorAll("pre")].some(clips));
  }

  // Marks overflowing slides for the overview, and warns once per slide.
  // Fallback fonts can overflow where the real ones fit, so warnings wait for
  // web fonts to load.
  const warned = new WeakSet();
  function checkOverflow() {
    const found = overflowing();
    const fontsLoaded = document.fonts.status === "loaded";
    for (const el of slides) {
      if (!found.includes(el)) {
        delete el.dataset.overflow;
        warned.delete(el);
        continue;
      }
      el.dataset.overflow = "";
      if (mode === "main" && fontsLoaded && !warned.has(el)) {
        warned.add(el);
        console.warn(`deck: slide ${slides.indexOf(el) + 1}${el.id ? ` (#${el.id})` : ""} overflows the stage`, el);
      }
    }
  }

  // Content can grow after init (images, fonts, components), so re-check whenever it resizes.
  let overflowFrame = 0;
  const contentObserver = new ResizeObserver(() => {
    cancelAnimationFrame(overflowFrame);
    overflowFrame = requestAnimationFrame(checkOverflow);
  });

  function observeContent() {
    contentObserver.disconnect();
    for (const slide of slides) for (const child of slide.children) contentObserver.observe(child);
  }

  // Sync between windows of the same deck (main, presenter).
  const channel = mode !== "preview" && "BroadcastChannel" in window ? new BroadcastChannel(`deck:${location.pathname}`) : null;

  function broadcast() {
    channel?.postMessage({ type: "state", slide: index, step, blackout });
  }

  if (channel) {
    listen(channel, "message", ({ data }) => {
      if (data?.type === "hello") broadcast();
      if (data?.type === "state") {
        goto(data.slide, data.step, { remote: true });
        setBlackout(Boolean(data.blackout), { remote: true });
      }
    });
  }

  function onKey(e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (startsIn(e, TYPING)) {
      // Escape hands the keyboard back to the deck.
      if (e.key === "Escape") e.composedPath()[0].blur?.();
      return;
    }
    const onControl = startsIn(e, "button, a, summary");

    if (overview) {
      const cols = Number(root.style.getPropertyValue("--deck-cols")) || 1;
      const moves = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
      if (e.key in moves) goto(index + moves[e.key], 0);
      else if (e.key === "Home") goto(0);
      else if (e.key === "End") goto(slides.length - 1);
      else if (["Escape", "Enter", "o", "O"].includes(e.key)) setOverview(false);
      else return;
      e.preventDefault();
      return;
    }

    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
      case "PageDown":
        next();
        break;
      case "ArrowLeft":
      case "ArrowUp":
      case "PageUp":
        prev();
        break;
      case " ":
        if (onControl) return;
        e.shiftKey ? prev() : next();
        break;
      case "Home":
        goto(0);
        break;
      case "End":
        goto(slides.length - 1, Infinity);
        break;
      case "f":
      case "F":
        toggleFullscreen();
        break;
      case "o":
      case "O":
        setOverview(true);
        break;
      case "b":
      case "B":
      case ".":
        setBlackout(!blackout);
        break;
      case "p":
      case "P":
        if (mode !== "main") return;
        openPresenter();
        break;
      default:
        return;
    }
    e.preventDefault();
  }

  function onClick(e) {
    if (e.button !== 0 || e.defaultPrevented) return;
    if (overview) {
      const slide = e.target.closest(".deck > section");
      if (slide && slides.includes(slide)) {
        goto(slides.indexOf(slide), 0);
        setOverview(false);
      }
      return;
    }
    if (!opts.clickNav || startsIn(e, NAV_IGNORE)) return;
    if (String(getSelection())) return;
    e.clientX < innerWidth / 3 ? prev() : next();
  }

  /** @type {{ x: number, y: number } | null} */
  let touchStart = null;

  function onTouchStart(e) {
    const single = e.touches.length === 1 && !startsIn(e, NAV_IGNORE);
    touchStart = single ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }

  function onTouchEnd(e) {
    if (!touchStart || overview) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) dx < 0 ? next() : prev();
  }

  function onPointerMove() {
    delete html.dataset.deckIdle;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => (html.dataset.deckIdle = ""), 2000);
  }

  const scan = () => /** @type {HTMLElement[]} */ ([...root.querySelectorAll(":scope > section")]);

  // Re-scan slides, staying on the current slide element if it still exists.
  function refresh() {
    const current = slides[index];
    slides = scan();
    observeContent();
    if (!slides.length) return;
    const kept = slides.indexOf(current);
    index = kept >= 0 ? kept : Math.min(index, slides.length - 1);
    step = Math.min(step, stepCount(index));
    render();
    update();
    writeHash();
  }

  slides = scan();
  if (!slides.length) console.warn("deck: no <section> slides found in", root);

  const api = {
    root,
    mode,
    width: opts.width,
    height: opts.height,
    get slides() {
      return slides;
    },
    get slide() {
      return index;
    },
    get step() {
      return step;
    },
    get steps() {
      return stepCount(index);
    },
    get scale() {
      return scale;
    },
    get overview() {
      return overview;
    },
    get blackout() {
      return blackout;
    },
    next,
    prev,
    goto,
    stepCount,
    positionAfter,
    ref,
    /** @param {number} i The slide's speaker notes as HTML. */
    notes: (i) => [...(slides[i]?.querySelectorAll(".notes") ?? [])].map((el) => el.innerHTML).join(""),
    setOverview,
    setBlackout,
    toggleFullscreen,
    openPresenter,
    overflowing,
    refresh,
    destroy() {
      ac.abort();
      contentObserver.disconnect();
      cancelAnimationFrame(overflowFrame);
      activeTransition?.skipTransition();
      channel?.close();
      pageStyle.remove();
      clearTimeout(idleTimer);
      for (const el of slides) el.inert = false;
      for (const key of ["deckMode", "deckOverview", "deckBlackout", "deckIdle", "deckTransition", "deckDirection", "deckPrint"]) {
        delete html.dataset[key];
      }
      html.style.removeProperty("--deck-progress");
      html.style.removeProperty("--deck-slide");
      html.style.removeProperty("--deck-step");
      instances.delete(root);
    },
  };
  instances.set(root, api);

  const initial = parseHash();
  if (slides.length) {
    index = initial?.slide ?? 0;
    step = Math.min(initial?.step ?? 0, stepCount(index));
    update();
    if (initial) writeHash();
  }

  fit();
  listen(window, "resize", fit);
  // Print shows every slide fully revealed, so step effects must not apply.
  listen(window, "beforeprint", () => {
    html.dataset.deckPrint = "";
    for (const el of all(root, "[data-step][data-state]")) delete el.dataset.state;
    announceReveal();
  });
  listen(window, "afterprint", () => {
    delete html.dataset.deckPrint;
    render();
    announceReveal();
  });
  listen(window, "hashchange", () => {
    const pos = parseHash();
    if (pos) goto(pos.slide, pos.step);
  });

  if (mode !== "preview") listen(document, "keydown", onKey);
  if (mode === "main") {
    listen(document, "click", onClick);
    listen(document, "touchstart", onTouchStart, { passive: true });
    listen(document, "touchend", onTouchEnd, { passive: true });
    listen(document, "pointermove", onPointerMove, { passive: true });
  } else {
    // Only the audience window makes sound. "play" doesn't bubble, so catch it while capturing.
    for (const media of root.querySelectorAll("video, audio")) if (media instanceof HTMLMediaElement) media.muted = true;
    listen(document, "play", (e) => e.target instanceof HTMLMediaElement && (e.target.muted = true), { capture: true });
  }

  // A window opened at an explicit position leads; otherwise it joins the others.
  if (initial) broadcast();
  else channel?.postMessage({ type: "hello" });

  observeContent();
  document.fonts.ready.then(() => !ac.signal.aborted && checkOverflow());

  if (mode === "presenter") import("./presenter.js").then((m) => !ac.signal.aborted && m.mountPresenter(api, ac.signal));

  return api;
}

/**
 * Subscribe a component to its slide's lifecycle. Calls `enter` and `step`
 * immediately if the slide is already current, so mount order does not matter.
 * @param {Element} el Any element inside the slide, including inside shadow roots.
 * @param {SlideHandlers} [handlers]
 * @returns {() => void} Unsubscribes.
 */
export function onSlide(el, { enter, leave, step, reveal, resize } = {}) {
  let slide = slideOf(el);
  // Climb out of shadow roots, which closest() doesn't cross.
  for (let root = el.getRootNode(); !slide && root instanceof ShadowRoot; root = root.host.getRootNode()) {
    slide = slideOf(root.host);
  }
  if (!slide?.parentElement) throw new Error("onSlide: element is not inside a .deck > section");
  const deckRoot = slide.parentElement;
  const ac = new AbortController();
  const opt = { signal: ac.signal };
  if (enter) slide.addEventListener("slideenter", (e) => e.target === slide && enter(detailOf(e)), opt);
  if (leave) slide.addEventListener("slideleave", (e) => e.target === slide && leave(detailOf(e)), opt);
  if (step) slide.addEventListener("stepchange", (e) => e.target === slide && step(detailOf(e)), opt);
  if (reveal) deckRoot.addEventListener("revealchange", (e) => reveal(detailOf(e)), opt);
  if (resize) deckRoot.addEventListener("deckresize", (e) => resize(detailOf(e)), opt);
  const mode = /** @type {DeckMode} */ (html.dataset.deckMode);
  if (slide.dataset.state === "current") {
    const current = Number(slide.dataset.currentStep) || 0;
    enter?.({ direction: "none", step: current, mode });
    step?.({ direction: "none", step: current, steps: Number(slide.dataset.steps) || 0, mode });
  }
  if (revealing()) reveal?.({ all: true, mode });
  const running = instances.get(deckRoot);
  if (running) resize?.({ scale: running.scale, mode });
  return () => ac.abort();
}
