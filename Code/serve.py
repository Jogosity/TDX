# TDX dev server — like `python3 -m http.server`, but tells browsers never to
# cache, so phones and desktops always load the latest JS after an edit.
# Run from anywhere:  python3 serve.py   (port 8000, or pass another)
#
# One write route, for the Level Editor (tools/editor/): POST /tools/editor/save
# replaces js/levels.js. It only answers this Mac (not phones on the LAN) and
# only accepts a file that starts with the editor's own header line.
import functools, http.server, os, sys

here = os.path.dirname(os.path.abspath(__file__))
LEVELS_FILE = os.path.join(here, 'js', 'levels.js')
LEVELS_HEADER = '// TDX — level data. Written by the Level Editor'
MAX_BYTES = 1_000_000

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def reply(self, code, text):
        body = text.encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != '/tools/editor/save':
            return self.reply(404, 'Not found')
        if self.client_address[0] not in ('127.0.0.1', '::1', '::ffff:127.0.0.1'):
            return self.reply(403, 'The editor can only save from this computer (open it at http://localhost).')
        length = int(self.headers.get('Content-Length') or 0)
        if not 0 < length <= MAX_BYTES:
            return self.reply(400, 'Empty or oversized level file.')
        text = self.rfile.read(length).decode('utf-8')
        if not text.startswith(LEVELS_HEADER) or 'export const LEVELS' not in text:
            return self.reply(400, 'That doesn\'t look like a level file from the editor.')
        tmp = LEVELS_FILE + '.saving'
        with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)
        os.replace(tmp, LEVELS_FILE)   # atomic: the game never reads a half-written file
        print(f'Level Editor saved js/levels.js ({len(text):,} bytes)')
        return self.reply(200, 'Saved')

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
print(f'TDX serving {here} on http://localhost:{port} (no-cache)')
print(f'Level Editor: http://localhost:{port}/tools/editor/')
http.server.ThreadingHTTPServer(('', port), functools.partial(NoCache, directory=here)).serve_forever()
