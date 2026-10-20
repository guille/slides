# /// script
# dependencies = ["playwright"]
# ///
"""Step through a deck and report main-thread cost per position.

usage: uv run profile.py URL [URL ...] [--idle SECONDS]
"""
import argparse
import time

from playwright.sync_api import sync_playwright

KEYS = ("TaskDuration", "ScriptDuration", "LayoutDuration", "RecalcStyleDuration", "LayoutCount", "RecalcStyleCount")

LOAF = """
window.__loaf = [];
new PerformanceObserver((list) => {
  for (const e of list.getEntries()) window.__loaf.push({
    t: e.startTime, d: Math.round(e.duration), block: Math.round(e.blockingDuration),
    scripts: e.scripts.map((s) => `${(s.sourceURL || "").split("/").pop()}:${s.sourceFunctionName} (${s.invoker}) ${Math.round(s.duration)}ms`),
  });
}).observe({ type: "long-animation-frame", buffered: true });
"""


def metrics(cdp):
    m = {x["name"]: x["value"] for x in cdp.send("Performance.getMetrics")["metrics"]}
    return {k: m.get(k, 0) for k in KEYS}


def rate(a, b, secs):
    return {k: (b[k] - a[k]) / secs * (1000 if k.endswith("Duration") else 1) for k in KEYS}


def fmt(d):
    return (
        f"task {d['TaskDuration']:5.0f}ms  script {d['ScriptDuration']:5.0f}  "
        f"layout {d['LayoutDuration']:4.0f} ({d['LayoutCount']:3.0f}x)  "
        f"style {d['RecalcStyleDuration']:4.0f} ({d['RecalcStyleCount']:3.0f}x)"
    )


def long_frames(page, since):
    for e in page.evaluate("(s) => window.__loaf.filter((e) => e.t >= s && e.duration > 50)", since):
        print(f"      long frame {e['d']}ms (blocking {e['block']}ms): {e['scripts'][:3] or 'no script: style/layout/paint'}")


def profile(browser, url, idle):
    ctx = browser.new_context(viewport={"width": 1600, "height": 900})
    page = ctx.new_page()
    page.add_init_script(LOAF)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: m.type in ("error", "warning") and errors.append(m.text))
    cdp = ctx.new_cdp_session(page)
    cdp.send("Performance.enable")
    page.goto(url)
    page.wait_for_load_state("networkidle")
    time.sleep(1)
    page.mouse.move(5, 5)
    print(f"\n===== {url}")

    def sit(label):
        t0 = page.evaluate("performance.now()")
        a = metrics(cdp)
        time.sleep(idle)
        d = rate(a, metrics(cdp), idle)
        hot = d["TaskDuration"] > 50 or d["LayoutCount"] > 5 or d["RecalcStyleCount"] > 5
        print(f"  {label:24} idle/s {fmt(d)}{'  <<' if hot else ''}")
        long_frames(page, t0)

    sit(page.evaluate("location.hash") or "(start)")
    seen = set()
    while True:
        t0 = page.evaluate("performance.now()")
        a = metrics(cdp)
        page.keyboard.press("ArrowRight")
        time.sleep(0.7)
        pos = page.evaluate("location.hash")
        if pos in seen:
            break
        seen.add(pos)
        d = rate(a, metrics(cdp), 1)
        print(f"  -> {pos:21} nav    {fmt(d)}{'  <<' if d['TaskDuration'] > 150 else ''}")
        long_frames(page, t0)
        sit(pos)

    page.keyboard.press("Home")
    time.sleep(1)
    sit("back on first slide")
    page.keyboard.press("o")
    time.sleep(1)
    sit("overview")
    for e in sorted(set(errors))[:10]:
        print(f"  console: {e[:200]}")
    ctx.close()

    # The presenter window plus its two preview iframes.
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    cdp = ctx.new_cdp_session(page)
    cdp.send("Performance.enable")
    base = url.split("#")[0]
    page.goto(base + ("&" if "?" in base else "?") + "presenter")
    page.wait_for_load_state("networkidle")
    time.sleep(1.5)
    a = metrics(cdp)
    time.sleep(idle)
    print(f"  {'presenter window':24} idle/s {fmt(rate(a, metrics(cdp), idle))}")
    ctx.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("urls", nargs="+")
    ap.add_argument("--idle", type=float, default=1.5, help="seconds to sit on each position")
    args = ap.parse_args()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for url in args.urls:
            profile(browser, url, args.idle)
        browser.close()


main()
