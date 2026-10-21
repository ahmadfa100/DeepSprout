#!/usr/bin/env python3
"""Publish the landing page at both default homepage URLs from one source."""

from argparse import ArgumentParser
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Client" / "src" / "pages" / "public" / "landing" / "home.html"
TARGETS = (
    (ROOT / "Client" / "index.html", "./src/pages/public/landing/"),
    (ROOT / "index.html", "./Client/src/pages/public/landing/"),
)
MARKER = "<!-- Generated from Client/src/pages/public/landing/home.html by scripts/build_root_home.py. -->"
LOCAL_ANCHORS = """<script>
  // A <base> keeps landing assets and routes portable at both homepage URLs.
  // Keep same-page anchors on this document, including its query string.
  document.addEventListener('click', function (event) {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const hash = link.getAttribute('href');
    const target = hash.length > 1 && document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!target) return;
    event.preventDefault();
    history.pushState(null, '', location.pathname + location.search + hash);
    target.scrollIntoView();
  });
</script>"""


def render(base_href):
    source = SOURCE.read_text(encoding="utf-8")
    if source.count("<head>") != 1 or source.count("</body>") != 1:
        raise ValueError("Unexpected landing page structure")
    # Normalize incidental source-line whitespace in the generated artifact.
    source = "\n".join(line.rstrip() for line in source.splitlines()) + "\n"
    return (source.replace("<head>", f'<head>\n  {MARKER}\n  <base href="{base_href}">', 1)
                  .replace("</body>", f"  {LOCAL_ANCHORS}\n</body>", 1))


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fail if either generated homepage is stale")
    args = parser.parse_args()
    if args.check:
        stale = [target for target, base_href in TARGETS
                 if not target.exists() or target.read_text(encoding="utf-8") != render(base_href)]
        if stale:
            print(f"Stale homepage: {', '.join(str(path.relative_to(ROOT)) for path in stale)}; "
                  "run python3 scripts/build_root_home.py", file=sys.stderr)
            return 1
        print("Default homepages match the landing page")
    else:
        for target, base_href in TARGETS:
            target.write_text(render(base_href), encoding="utf-8")
            print(f"Wrote {target.relative_to(ROOT)} from the landing page")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
