#!/usr/bin/env python3
"""Serve DeepSprout locally, including its custom HTTP 404 page."""

import argparse
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


CLIENT_ROOT = Path(__file__).resolve().parent


class DeepSproutHandler(SimpleHTTPRequestHandler):
    def send_error(self, code, message=None, explain=None):
        if code != HTTPStatus.NOT_FOUND:
            return super().send_error(code, message, explain)

        try:
            page = (CLIENT_ROOT / '404.html').read_bytes()
        except OSError:
            return super().send_error(code, message, explain)

        # Render at the requested URL and retain the actual error status.
        # Root-relative asset URLs in 404.html also work for nested paths.
        self.send_response(HTTPStatus.NOT_FOUND)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(page)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(page)


def create_server(host='127.0.0.1', port=8765):
    handler = partial(DeepSproutHandler, directory=str(CLIENT_ROOT))
    return ThreadingHTTPServer((host, port), handler)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--bind', default='127.0.0.1')
    args = parser.parse_args()
    with create_server(args.bind, args.port) as server:
        print(f'DeepSprout: http://{args.bind}:{args.port} (custom 404 enabled)', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    main()
