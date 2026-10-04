"""Browser tests for lib/deck.js, lib/presenter.js and lib/deck.css.

Run from the repo root:

    uv run --with pytest --with playwright pytest tests/ -q

Serves the repo on DECK_TEST_PORT (default 8101). Known bugs are marked
xfail(strict=True) so they start failing loudly once fixed.
"""

import functools
import http.server
import json
import os
import threading
from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PORT = int(os.environ.get("DECK_TEST_PORT", "8101"))
BASE = f"http://127.0.0.1:{PORT}/tests/fixtures/"
SPY = "() => { window.__m = []; new BroadcastChannel('deck:' + location.pathname).onmessage = (e) => __m.push(e.data) }"


@pytest.fixture(scope="session")
def server():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass

    handler = functools.partial(Quiet, directory=str(ROOT))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    yield
    httpd.shutdown()


@pytest.fixture(scope="session")
def pw():
    with sync_playwright() as p:
        yield p


@pytest.fixture(scope="session", params=["chromium", "firefox"])
def browser(request, pw, server):
    b = getattr(pw, request.param).launch()
    yield b
    b.close()


@pytest.fixture(scope="session")
def chromium(pw, server):
    b = pw.chromium.launch()
    yield b
    b.close()


class Page:
    """A page plus collected console errors and page errors."""

    def __init__(self, page):
        self.page = page
        self.errors = []
        self.warnings = []
        page.on("pageerror", lambda e: self.errors.append(str(e)))
        page.on("console", self._console)

    def _console(self, m):
        if m.type == "error":
            self.errors.append(m.text)
        if m.type == "warning":
            self.warnings.append(m.text)

    def open(self, path):
        self.page.goto(BASE + path)
        self.page.wait_for_function("window.d")
        return self

    def __getattr__(self, name):
        return getattr(self.page, name)

    def pos(self):
        return self.page.evaluate("[d.slide, d.step]")


@pytest.fixture
def page(browser):
    ctx = browser.new_context(viewport={"width": 1280, "height": 720})
    yield Page(ctx.new_page())
    ctx.close()


@pytest.fixture
def cpage(chromium):
    ctx = chromium.new_context(viewport={"width": 1280, "height": 720})
    yield Page(ctx.new_page())
    ctx.close()


def rect(p, js):
    return json.loads(p.evaluate(f"JSON.stringify({js}.getBoundingClientRect())"))


# ---------- Stage ----------


@pytest.mark.parametrize("vw,vh", [(1280, 720), (1000, 1000), (2560, 1080), (400, 800)])
def test_stage_letterboxes_at_16_9(page, vw, vh):
    page.open("basic.html")
    page.set_viewport_size({"width": vw, "height": vh})
    page.wait_for_timeout(50)
    r = rect(page, "d.root")
    scale = min(vw / 1920, vh / 1080)
    assert r["width"] == pytest.approx(1920 * scale, abs=1)
    assert r["height"] == pytest.approx(1080 * scale, abs=1)
    assert r["x"] == pytest.approx((vw - r["width"]) / 2, abs=1)
    assert r["y"] == pytest.approx((vh - r["height"]) / 2, abs=1)


# ---------- Navigation and steps ----------


def test_next_walks_every_step_and_updates_hash(page):
    page.open("basic.html")
    seen = []
    for _ in range(12):
        page.keyboard.press("ArrowRight")
        seen.append((*page.pos(), page.evaluate("location.hash")))
    assert seen == [
        (1, 0, "#auto"), (1, 1, "#auto.1"), (1, 2, "#auto.2"), (1, 3, "#auto.3"),
        (2, 0, "#grouped"), (2, 1, "#grouped.1"), (2, 2, "#grouped.2"), (2, 3, "#grouped.3"),
        (3, 0, "#controls"), (4, 0, "#last"), (4, 1, "#last.1"), (4, 2, "#last.2"),
    ]
    page.keyboard.press("ArrowRight")
    assert page.pos() == [4, 2]


def test_prev_into_slide_lands_on_last_step(page):
    page.open("basic.html#controls")
    page.keyboard.press("ArrowLeft")
    assert page.pos() == [2, 3]
    page.keyboard.press("Shift+Space")
    assert page.pos() == [2, 2]


def test_grouped_and_explicit_step_numbering(page):
    page.open("basic.html#grouped")
    q = "[...document.querySelectorAll('#grouped [data-step]')].map(e => e.dataset.state)"
    assert page.evaluate("d.steps") == 3
    expected = {
        0: ["future", "future", "future", "future"],
        1: ["future", "current", "future", "future"],
        2: ["current", "past", "current", "future"],
        3: ["past", "past", "past", "current"],
    }
    for s, states in expected.items():
        page.evaluate(f"d.goto(2, {s})")
        assert page.evaluate(q) == states


def test_hash_ids_and_reload_restore(page):
    page.open("basic.html")
    page.evaluate("location.hash = '#auto.2'")
    page.wait_for_timeout(50)
    assert page.pos() == [1, 2]
    page.reload()
    page.wait_for_function("window.d")
    assert page.pos() == [1, 2]
    page.evaluate("location.hash = '#4'")
    page.wait_for_timeout(50)
    assert page.pos() == [3, 0]


def test_hash_step_is_clamped(page):
    page.open("basic.html#auto.99")
    assert page.pos() == [1, 3]


def test_malformed_hash_does_not_break_init(page):
    page.goto(BASE + "basic.html#100%")
    page.wait_for_timeout(300)
    assert page.evaluate("!!window.d"), page.errors


@pytest.mark.parametrize("i", [1, 2])
def test_slide_id_round_trips_through_hash(page, i):
    page.open("edge.html")
    page.evaluate(f"d.goto({i}, 0)")
    page.reload()
    page.wait_for_function("window.d")
    assert page.pos() == [i, 0]


def test_slide_id_with_space_round_trips(page):
    page.open("edge.html")
    page.evaluate("d.goto(3, 1)")
    page.reload()
    page.wait_for_function("window.d")
    assert page.pos() == [3, 1]


def test_initial_events_and_onslide_before_and_after_init(page):
    page.open("basic.html#auto.2")
    events = page.evaluate("__events")
    assert [e[0] for e in events] == ["slideenter", "stepchange", "deckchange"]
    assert events[2][2]["previous"] is None
    assert page.evaluate("__comp") == [["enter", 2], ["step", 2]]  # registered before deck()
    page.goto(BASE + "basic.html")
    page.reload()
    page.wait_for_function("window.d")
    assert page.evaluate("__late") == [["enter", 0], ["step", 0]]  # registered after deck()
    page.evaluate("__comp.length = 0; d.goto(1, 0); d.goto(1, 1); d.goto(2, 0)")
    assert page.evaluate("__comp") == [["enter", 0], ["step", 0], ["step", 1], ["leave"]]
    page.evaluate("__lateStop(); __late.length = 0; d.goto(0, 0)")
    assert page.evaluate("__late") == []


# ---------- Transitions ----------


@pytest.mark.parametrize("t", ["fade", "slide", "fn"])
def test_rapid_keys_mid_transition_keep_dom_state(page, t):
    page.open(f"basic.html?t={t}")
    for _ in range(15):
        page.keyboard.press("ArrowRight")
    for _ in range(7):
        page.keyboard.press("ArrowLeft")
    page.wait_for_timeout(800)
    assert page.pos() == [2, 0]
    assert page.evaluate("d.slides.map(s => s.dataset.state)") == ["past", "past", "current", "future", "future"]
    assert page.evaluate("location.hash") == "#grouped"
    assert page.errors == []


@pytest.mark.parametrize("t", ["fade", "fn"])
def test_events_match_state_after_step_during_transition(page, t):
    page.open(f"basic.html?t={t}")
    page.evaluate("__events.length = 0; __comp.length = 0; d.next(); d.next()")
    page.wait_for_timeout(700)
    assert page.pos() == [1, 1]
    last = [e for e in page.evaluate("__events") if e[0] == "deckchange"][-1][2]
    assert (last["slide"], last["step"]) == (1, 1)
    # Events describe the position actually rendered, collapsing steps taken mid-transition.
    assert page.evaluate("__comp") == [["enter", 1], ["step", 1]]


def test_reduced_motion_skips_transition(browser):
    ctx = browser.new_context(reduced_motion="reduce")
    p = Page(ctx.new_page()).open("basic.html?t=fade")
    p.evaluate("d.next()")
    assert p.evaluate("d.slides[1].dataset.state") == "current"  # rendered synchronously
    ctx.close()


# ---------- Overview ----------


def test_overview_keys_and_click(page):
    page.open("basic.html#auto.2")
    page.keyboard.press("o")
    assert page.evaluate("d.overview")
    page.wait_for_timeout(400)  # visibility transitions with --deck-step-duration
    assert page.evaluate("[...document.querySelectorAll('#auto [data-step]')].every(e => getComputedStyle(e).visibility === 'visible')")
    cols = int(page.evaluate("getComputedStyle(d.root).getPropertyValue('--deck-cols')"))
    page.keyboard.press("ArrowRight")
    assert page.pos() == [2, 0]
    page.keyboard.press("ArrowDown")
    assert page.pos() == [min(2 + cols, 4), 0]
    page.keyboard.press("Enter")
    assert not page.evaluate("d.overview")
    page.keyboard.press("o")
    r = rect(page, "d.slides[1]")
    page.mouse.click(r["x"] + r["width"] / 2, r["y"] + r["height"] / 2)
    assert page.pos() == [1, 0]
    assert not page.evaluate("d.overview")


def test_overview_has_no_horizontal_scroll_with_classic_scrollbars(pw, server):
    b = pw.chromium.launch(ignore_default_args=["--hide-scrollbars"])
    p = Page(b.new_page(viewport={"width": 1280, "height": 720})).open("basic.html")
    p.evaluate("for (let i = 0; i < 20; i++) { const s = document.createElement('section'); d.root.append(s) } d.refresh()")
    p.keyboard.press("o")
    p.wait_for_timeout(100)
    sw, cw = p.evaluate("[d.root.scrollWidth, d.root.clientWidth]")
    b.close()
    assert sw <= cw


# ---------- Pointer and keyboard input ----------


def test_click_zones_and_nav_ignore(page):
    page.open("basic.html#auto.1")
    page.mouse.click(100, 360)
    assert page.pos() == [1, 0]
    page.mouse.click(900, 360)
    assert page.pos() == [1, 1]
    page.evaluate("d.goto(3, 0)")
    for sel in ["#btn", "#lnk", "#nonav-inner", "#txt"]:
        page.click(sel)
        assert page.pos() == [3, 0], sel
    page.focus("#txt")
    page.keyboard.press("ArrowRight")
    assert page.pos() == [3, 0]
    page.focus("#btn")
    page.keyboard.press(" ")
    assert page.pos() == [3, 0]


def test_swipe(page):
    page.open("basic.html#auto")
    swipe = """(dx) => {
      const t = (x) => new Touch({ identifier: 1, target: document.body, clientX: x, clientY: 300 });
      document.dispatchEvent(new TouchEvent('touchstart', { touches: [t(600)], changedTouches: [t(600)] }));
      document.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t(600 + dx)] }));
    }"""
    if page.context.browser.browser_type.name == "firefox":
        pytest.skip("Touch constructor needs touch events enabled in Firefox")
    page.evaluate(swipe, -200)
    assert page.pos() == [1, 1]
    page.evaluate(swipe, 200)
    assert page.pos() == [1, 0]


def test_blackout_toggle(page):
    page.open("basic.html")
    page.keyboard.press("b")
    assert page.evaluate("'deckBlackout' in document.documentElement.dataset")
    page.keyboard.press(".")
    assert not page.evaluate("'deckBlackout' in document.documentElement.dataset")


def test_only_current_slide_is_interactive(page):
    page.open("basic.html#grouped")
    assert page.evaluate("d.slides.map(s => s.inert)") == [True, True, False, True, True]


def test_destroy_removes_listeners(page):
    page.open("basic.html#auto.1")
    page.evaluate("d.destroy()")
    page.keyboard.press("ArrowRight")
    page.mouse.click(900, 300)
    assert page.pos() == [1, 1]
    assert page.evaluate("document.documentElement.dataset.deckMode") is None


def test_refresh_keeps_current_slide_without_reentering(page):
    page.open("basic.html#auto.1")
    page.evaluate("__comp.length = 0; __events.length = 0")
    page.evaluate("""() => {
        const s = document.createElement('section');
        s.id = 'inserted';
        d.root.prepend(s);
        d.refresh();
    }""")
    assert page.pos() == [2, 1]
    assert page.evaluate("location.hash") == "#auto.1"
    assert page.evaluate("__comp") == []
    assert [e[0] for e in page.evaluate("__events")] == []
    # Removing the current slide moves on; its slideleave fires on the detached section.
    page.evaluate("d.slides[2].remove(); d.refresh()")
    assert [e[0] for e in page.evaluate("__events")] == ["slideenter", "stepchange", "deckchange"]


def test_declared_step_count_adds_js_only_steps(page):
    page.open("basic.html#intro")
    page.evaluate("d.slides[0].dataset.stepCount = 3")
    page.keyboard.press("ArrowRight")
    page.keyboard.press("ArrowRight")
    page.keyboard.press("ArrowRight")
    assert page.pos() == [0, 3]
    page.keyboard.press("ArrowRight")
    assert page.pos() == [1, 0]


def test_step_count_on_a_descendant_counts_for_its_slide(page):
    page.open("basic.html#intro")
    page.evaluate("""() => {
        d.slides[0].dataset.stepCount = 2;
        const el = document.createElement("div");
        el.dataset.stepCount = 4;
        d.slides[0].append(el);
    }""")
    assert page.evaluate("d.stepCount(0)") == 4


def test_escape_releases_focus_from_form_controls(page):
    page.open("basic.html#controls")
    page.click("#txt")
    page.keyboard.press("ArrowRight")
    assert page.pos() == [3, 0]
    page.keyboard.press("Escape")
    page.keyboard.press("ArrowRight")
    assert page.pos() == [4, 0]


def test_events_and_onslide_carry_mode(page):
    page.open("basic.html?preview#auto")
    assert page.evaluate("__comp[0]") == ["enter", 0]
    assert page.evaluate("__events.every(e => e[2].mode === 'preview')")
    modes = page.evaluate("""async () => {
        const { onSlide } = await import('../../lib/deck.js');
        const seen = [];
        onSlide(d.slides[1].querySelector('h2'), { enter: (e) => seen.push(e.mode) });
        return seen;
    }""")
    assert modes == ["preview"]


def test_onslide_reveal_follows_overview_and_print(page):
    page.open("basic.html#intro")
    page.evaluate("""async () => {
        const { onSlide } = await import('../../lib/deck.js');
        window.__reveals = [];
        onSlide(d.slides[1].querySelector('h2'), { reveal: (e) => __reveals.push(e.all) });
    }""")
    page.keyboard.press("o")
    page.keyboard.press("Escape")
    page.evaluate("dispatchEvent(new Event('beforeprint')); dispatchEvent(new Event('afterprint'))")
    assert page.evaluate("__reveals") == [True, False, True, False]
    # Subscribing while revealed gets the current state right away.
    page.keyboard.press("o")
    late = page.evaluate("""async () => {
        const { onSlide } = await import('../../lib/deck.js');
        const seen = [];
        onSlide(d.slides[2].querySelector('*'), { reveal: (e) => seen.push(e.all) });
        return seen;
    }""")
    assert late == [True]


def test_onslide_resize_reports_stage_and_thumbnail_scale(page):
    page.set_viewport_size({"width": 960, "height": 540})
    page.open("basic.html#intro")
    page.evaluate("""async () => {
        const { onSlide } = await import('../../lib/deck.js');
        window.__scales = [];
        onSlide(d.slides[1].querySelector('h2'), { resize: (e) => __scales.push(e.scale) });
    }""")
    assert page.evaluate("__scales") == [0.5]
    page.set_viewport_size({"width": 1920, "height": 1080})
    page.wait_for_function("__scales.length === 2")
    page.keyboard.press("o")
    scales = page.evaluate("__scales")
    assert scales[1] == 1
    assert scales[2] == page.evaluate("d.scale") < 1


@pytest.mark.parametrize("mode,muted", [("", False), ("?preview", True), ("?presenter", True)])
def test_media_muted_outside_main_window(page, mode, muted):
    page.open(f"basic.html{mode}#auto")
    result = page.evaluate("""async () => {
        const v = document.createElement('video');
        d.slides[1].append(v);
        v.play().catch(() => {});
        await new Promise((r) => setTimeout(r, 50));
        return v.muted;
    }""")
    assert result is muted


# ---------- Presenter ----------


@pytest.fixture
def pair(chromium):
    ctx = chromium.new_context(viewport={"width": 1280, "height": 720})
    main = Page(ctx.new_page()).open("basic.html#auto.1")
    pres = Page(ctx.new_page())
    pres.goto(BASE + "basic.html?presenter")
    pres.wait_for_function("document.querySelector('.deck-presenter')")
    pres.wait_for_timeout(500)
    yield main, pres
    ctx.close()


def frame_positions(pres):
    return [f.evaluate("[d.slide, d.step]") for f in pres.frames[1:]]


def test_presenter_syncs_both_ways(pair):
    main, pres = pair
    assert pres.pos() == [1, 1]  # adopted from main via hello
    assert frame_positions(pres) == [[1, 1], [1, 2]]
    assert "Auto notes" in pres.inner_text(".deck-presenter-notes")
    main.keyboard.press("ArrowRight")
    pres.wait_for_timeout(300)
    assert pres.pos() == [1, 2]
    assert frame_positions(pres) == [[1, 2], [1, 3]]
    pres.keyboard.press("ArrowRight")
    pres.keyboard.press("ArrowRight")
    main.wait_for_timeout(300)
    assert main.pos() == [2, 0]
    assert main.evaluate("location.hash") == "#grouped"
    assert pres.inner_text(".deck-presenter-pos") == "Slide 3 / 5 · step 0 / 3"
    assert main.errors == [] and pres.errors == []


def test_presenter_no_feedback_loop(pair):
    main, pres = pair
    main.evaluate(SPY)
    pres.keyboard.press("ArrowRight")
    main.wait_for_timeout(500)
    assert main.evaluate("__m") == [{"type": "state", "slide": 1, "step": 2, "blackout": False}]


def test_presenter_blackout_reaches_main(pair):
    main, pres = pair
    pres.keyboard.press("b")
    main.wait_for_timeout(200)
    assert main.evaluate("'deckBlackout' in document.documentElement.dataset")


def test_presenter_stays_visible_during_blackout(pair):
    main, pres = pair
    main.keyboard.press("b")
    pres.wait_for_timeout(200)
    assert pres.evaluate("getComputedStyle(document.documentElement, '::after').content") == "none"


def test_presenter_hidden_elements_are_hidden(pair):
    main, pres = pair
    q = "el => getComputedStyle(el).display"
    assert pres.eval_on_selector(".deck-presenter-end", q) == "none"
    main.evaluate("d.goto(4, Infinity)")
    pres.wait_for_timeout(300)
    assert pres.eval_on_selector(".deck-presenter-next iframe", q) == "none"


def test_presenter_paused_timer_stays_paused(pair):
    main, pres = pair
    main.keyboard.press("ArrowRight")
    pres.wait_for_timeout(200)
    pres.click(".deck-presenter-timer")
    main.keyboard.press("ArrowRight")
    pres.wait_for_timeout(200)
    assert pres.evaluate("document.querySelector('.deck-presenter-timer').classList.contains('is-paused')")


# ---------- Print ----------


def pdf_pages(p):
    p.emulate_media(media="print")
    data = p.pdf(prefer_css_page_size=True, print_background=True)
    p.emulate_media(media="screen")
    sizes = []
    for chunk in data.split(b"/MediaBox")[1:]:
        nums = chunk.split(b"[", 1)[1].split(b"]", 1)[0].split()
        sizes.append((float(nums[2]), float(nums[3])))
    return sizes


def test_print_one_page_per_slide_with_steps_revealed(cpage):
    cpage.open("basic.html#auto.1")
    cpage.emulate_media(media="print")
    hidden = cpage.evaluate(
        "[...document.querySelectorAll('.deck > section, [data-step]')]"
        ".filter(e => getComputedStyle(e).visibility !== 'visible' || getComputedStyle(e).opacity !== '1').length"
    )
    assert hidden == 0
    assert pdf_pages(cpage) == [(1440.0, 810.0)] * 5  # 1920x1080 CSS px


def test_print_from_overview_is_full_size(cpage):
    cpage.open("basic.html")
    cpage.evaluate("d.setOverview(true)")
    cpage.emulate_media(media="print")
    assert rect(cpage, "d.slides[0]")["width"] == 1920


# ---------- Overflow ----------


def test_overflow_warns(cpage):
    cpage.open("overflow.html")
    cpage.wait_for_timeout(500)
    assert any("slide 2 (#tall) overflows" in w for w in cpage.warnings)
    assert "tall" in cpage.evaluate("d.overflowing().map(s => s.id)")


def test_overflow_warns_for_late_images(cpage):
    cpage.open("overflow.html")
    cpage.wait_for_timeout(1000)
    assert any("(#img)" in w for w in cpage.warnings)


def test_overflow_detects_clipped_code(cpage):
    cpage.open("overflow.html")
    assert "code" in cpage.evaluate("d.overflowing().map(s => s.id)")


# ---------- Cascade layers ----------


def test_unlayered_theme_overrides_tokens_and_typography(page):
    page.open("layers.html")
    cs = "([sel, prop]) => getComputedStyle(document.querySelector(sel)).getPropertyValue(prop)"
    assert page.evaluate(cs, [".deck", "--deck-accent"]) == "rgb(1, 2, 3)"
    assert page.evaluate(cs, ["#s1 h2", "color"]) == "rgb(10, 20, 30)"


def test_unlayered_css_cannot_break_stage_mechanics(page):
    page.open("layers.html")
    cs = "([sel, prop]) => getComputedStyle(document.querySelector(sel)).getPropertyValue(prop)"
    assert page.evaluate(cs, ["#s2", "position"]) == "absolute"
    assert page.evaluate(cs, [".notes", "display"]) == "none"
