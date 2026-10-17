#!/usr/bin/env python3
"""Publish the Client homepage at the repository root without a second source."""

from argparse import ArgumentParser
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Client" / "index.html"
TARGET = ROOT / "index.html"
MARKER = "<!-- Generated from Client/index.html by scripts/build_root_home.py. -->"
LOCAL_ANCHORS = """<script>
  // A <base> keeps Client assets and routes portable under a Pages project path.
  // Keep anchors on this root document, including its query string.
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


def render():
    source = SOURCE.read_text(encoding="utf-8")
    if source.count("<head>") != 1 or source.count("</body>") != 1:
        raise ValueError("Unexpected Client homepage structure")
    return (source.replace("<head>", f'<head>\n  {MARKER}\n  <base href="./Client/">', 1)
                  .replace("</body>", f"  {LOCAL_ANCHORS}\n</body>", 1))


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fail if root homepage is stale")
    args = parser.parse_args()
    expected = render()
    if args.check:
        if not TARGET.exists() or TARGET.read_text(encoding="utf-8") != expected:
            print("Root index.html is stale; run python3 scripts/build_root_home.py", file=sys.stderr)
            return 1
        print("Root homepage matches Client/index.html")
    else:
        TARGET.write_text(expected, encoding="utf-8")
        print("Wrote index.html from Client/index.html")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
