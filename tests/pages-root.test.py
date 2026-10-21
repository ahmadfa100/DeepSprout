#!/usr/bin/env python3
"""Check the published root homepage and local assets under a Pages subpath."""

from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]
PREFIX = "/DeepSprout/"


class PagesHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        parsed = urlparse(path).path
        if not parsed.startswith(PREFIX):
            return str(ROOT / "__missing__")
        return str(ROOT / parsed[len(PREFIX):])

    def log_message(self, *_):
        pass


class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.assets = []
        self.base = None

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "base":
            self.base = values.get("href")
        if tag in ("script", "img", "link"):
            value = values.get("src") or values.get("href")
            if value and not value.startswith(("#", "data:", "http:", "https:")):
                self.assets.append(value)


def main():
    subprocess.run([sys.executable, str(ROOT / "scripts/build_root_home.py"), "--check"], check=True)
    server = ThreadingHTTPServer(("127.0.0.1", 0), PagesHandler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        url = f"http://127.0.0.1:{server.server_port}{PREFIX}"
        with urlopen(url) as response:
            html = response.read().decode("utf-8")
        assert '<h1 id="hero-title">Make room for' in html, "root is not the landing page"
        parser = Assets()
        parser.feed(html)
        assert parser.base == "./Client/src/pages/public/landing/", parser.base
        for asset in parser.assets:
            resolved = urljoin(urljoin(url, parser.base), asset)
            assert urlparse(resolved).path.startswith(PREFIX), resolved
            with urlopen(Request(resolved, method="HEAD")) as response:
                assert response.status == 200, resolved
        with urlopen(urljoin(url, "Client/index.html")) as response:
            client_html = response.read().decode("utf-8")
        assert '<h1 id="hero-title">Make room for' in client_html
        client_parser = Assets()
        client_parser.feed(client_html)
        assert client_parser.base == "./src/pages/public/landing/", client_parser.base
        for route in ("Client/login.html", "Client/register.html", "Client/workspaces.html#/mentor/dashboard",
                      "Client/src/pages/member/training/training.html"):
            with urlopen(Request(urljoin(url, route), method="HEAD")) as response:
                assert response.status == 200, route
        print(f"Pages subpath: root, {len(parser.assets)} local assets and 4 routes OK")
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
