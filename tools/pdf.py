# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright"]
# ///
"""Export a deck to PDF: uv run tools/pdf.py <url> [out.pdf]"""

import sys

from playwright.sync_api import sync_playwright


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit("usage: pdf.py <deck-url> [out.pdf]")
    url, out = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else "deck.pdf")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.on("console", lambda m: m.type == "warning" and print(f"[page] {m.text}", file=sys.stderr))
        page.goto(url, wait_until="networkidle")
        page.wait_for_selector(".deck > section[data-state]", state="attached")
        page.evaluate("document.fonts.ready")
        page.emulate_media(media="print")
        page.evaluate("dispatchEvent(new Event('beforeprint'))")
        page.pdf(path=out, prefer_css_page_size=True, print_background=True)
        browser.close()
    print(out)


if __name__ == "__main__":
    main()
