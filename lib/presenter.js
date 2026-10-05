/** @type {(n: number) => string} */
const pad = (n) => String(n).padStart(2, "0");

/** @param {number} ms */
function formatElapsed(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  return `${h ? `${h}:` : ""}${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

/** @import { Deck, Position } from "./deck.js" */

/**
 * @param {Deck} api
 * @param {AbortSignal} signal
 */
export function mountPresenter(api, signal) {
  const ui = document.createElement("div");
  ui.className = "deck-presenter";
  ui.innerHTML = `
    <div class="deck-presenter-current">
      <iframe title="Current slide" tabindex="-1"></iframe>
    </div>
    <div class="deck-presenter-side">
      <div class="deck-presenter-next">
        <span class="deck-presenter-label">Next</span>
        <iframe title="Next slide" tabindex="-1"></iframe>
        <div class="deck-presenter-end" hidden>End of deck</div>
      </div>
      <div class="deck-presenter-notes"></div>
    </div>
    <div class="deck-presenter-bar">
      <span class="deck-presenter-pos"></span>
      <span class="deck-presenter-blackout" hidden>Blackout</span>
      <span class="deck-presenter-spacer"></span>
      <button type="button" data-action="smaller" title="Smaller notes">A−</button>
      <button type="button" data-action="larger" title="Larger notes">A+</button>
      <button type="button" data-action="timer" class="deck-presenter-timer" title="Start / pause timer">00:00</button>
      <button type="button" data-action="reset" title="Reset timer">Reset</button>
      <span class="deck-presenter-clock"></span>
    </div>`;
  ui.style.setProperty("--deck-aspect", `${api.width} / ${api.height}`);
  document.body.append(ui);
  document.title = `Presenter · ${document.title}`;

  /** @type {(sel: string) => HTMLElement} */
  const $ = (sel) => /** @type {HTMLElement} */ (ui.querySelector(sel));
  const [currentFrame, nextFrame] = ui.querySelectorAll("iframe");
  const notes = $(".deck-presenter-notes");

  /** @param {Position} pos */
  function previewUrl(pos) {
    const url = new URL(location.href);
    url.searchParams.delete("presenter");
    url.searchParams.set("preview", "");
    url.hash = api.ref(pos.slide, pos.step);
    return url.href;
  }

  /**
   * @param {HTMLIFrameElement} frame
   * @param {Position} pos
   */
  function show(frame, pos) {
    const url = previewUrl(pos);
    if (frame.src) frame.contentWindow?.location.replace(url);
    else frame.src = url;
  }

  let notesSize = 24;
  try {
    notesSize = Number(localStorage.getItem("deck:notes-size")) || notesSize;
  } catch {}
  const applyNotesSize = () => {
    notes.style.fontSize = `${notesSize}px`;
    try {
      localStorage.setItem("deck:notes-size", String(notesSize));
    } catch {}
  };
  applyNotesSize();

  /** @type {number | null} */
  let started = null;
  let elapsed = 0;
  const timerEl = $(".deck-presenter-timer");
  const clockEl = $(".deck-presenter-clock");
  const elapsedNow = () => elapsed + (started ? Date.now() - started : 0);
  const toggleTimer = () => {
    if (started) {
      elapsed = elapsedNow();
      started = null;
    } else started = Date.now();
    timerEl.classList.toggle("is-paused", !started);
  };
  timerEl.classList.add("is-paused");

  function tick() {
    timerEl.textContent = formatElapsed(elapsedNow());
    const now = new Date();
    clockEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }
  tick();
  const interval = setInterval(tick, 500);
  signal.addEventListener("abort", () => {
    clearInterval(interval);
    ui.remove();
  });

  ui.addEventListener("click", (e) => {
    const target = /** @type {Element} */ (e.target);
    const action = target.closest("[data-action]")?.getAttribute("data-action");
    if (action === "smaller") notesSize = Math.max(12, notesSize - 2);
    if (action === "larger") notesSize = Math.min(64, notesSize + 2);
    if (action === "smaller" || action === "larger") applyNotesSize();
    if (action === "timer") toggleTimer();
    if (action === "reset") {
      elapsed = 0;
      started = started && Date.now();
      tick();
    }
    target.closest("button")?.blur();
  });

  function update() {
    const { slide, step } = api;
    show(currentFrame, { slide, step });
    const after = api.positionAfter(slide, step);
    nextFrame.hidden = !after;
    $(".deck-presenter-end").hidden = Boolean(after);
    if (after) show(nextFrame, after);
    const steps = api.steps;
    $(".deck-presenter-pos").textContent =
      `Slide ${slide + 1} / ${api.slides.length}` + (steps ? ` · step ${step} / ${steps}` : "");
    notes.innerHTML = api.notes(slide) || `<p class="deck-presenter-empty">No notes for this slide.</p>`;
  }

  let autoStarted = false;
  api.root.addEventListener(
    "deckchange",
    (e) => {
      if (!autoStarted && /** @type {CustomEvent} */ (e).detail.previous) {
        autoStarted = true;
        if (!started) toggleTimer();
      }
      update();
    },
    { signal },
  );
  api.root.addEventListener("blackoutchange", () => ($(".deck-presenter-blackout").hidden = !api.blackout), { signal });
  update();
}
