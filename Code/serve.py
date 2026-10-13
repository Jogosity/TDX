# TDX dev server — like `python3 -m http.server`, but tells browsers never to
# cache, so phones and desktops always load the latest JS after an edit.
# Run from anywhere:  python3 serve.py   (port 8000, or pass another)
import functools, http.server, os, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
here = os.path.dirname(os.path.abspath(__file__))
print(f'TDX serving {here} on http://localhost:{port} (no-cache)')
http.server.ThreadingHTTPServer(('', port), functools.partial(NoCache, directory=here)).serve_forever()
