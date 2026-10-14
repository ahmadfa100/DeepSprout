"""HTTP integration checks for missing pages and normal static files."""

import importlib.util
from pathlib import Path
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('deepsprout_serve', ROOT / 'serve.py')
serve = importlib.util.module_from_spec(spec)
spec.loader.exec_module(serve)


class NotFoundServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = serve.create_server(port=0)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.origin = f'http://127.0.0.1:{cls.server.server_port}'

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def test_missing_urls_render_custom_page_with_404(self):
        for path in ['/does-not-exist', '/missing.html', '/a/b/missing?query=hello', '/a/b/']:
            with self.subTest(path=path):
                with self.assertRaises(HTTPError) as caught:
                    urlopen(self.origin + path)
                with caught.exception as response:
                    self.assertEqual(response.code, 404)
                    self.assertIn('text/html', response.headers['Content-Type'])
                    self.assertEqual(response.read(), (ROOT / '404.html').read_bytes())

    def test_missing_head_returns_headers_without_body(self):
        with self.assertRaises(HTTPError) as caught:
            urlopen(Request(self.origin + '/a/missing', method='HEAD'))
        with caught.exception as response:
            self.assertEqual(response.code, 404)
            self.assertEqual(int(response.headers['Content-Length']), (ROOT / '404.html').stat().st_size)
            self.assertEqual(response.read(), b'')

    def test_existing_pages_and_illustration_assets_still_load(self):
        for path in ['/', '/404.html', '/training.html', '/src/pages/public/not-found/not-found.css',
                     '/src/pages/public/not-found/not-found.js', '/assets/hero-v2/fonts/inter-400.ttf']:
            with self.subTest(path=path):
                with urlopen(self.origin + path) as response:
                    self.assertEqual(response.status, 200)
                    self.assertGreater(len(response.read()), 0)


if __name__ == '__main__':
    unittest.main()
