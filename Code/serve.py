# TDX dev server — like `python3 -m http.server`, but tells browsers never to
# cache, so phones and desktops always load the latest JS after an edit.
# Run from anywhere:  python3 serve.py   (port 8000, or pass another)
#
# Two write routes, one per tool: POST /tools/editor/save replaces js/levels.js
# (Level Editor), POST /tools/mixer/save replaces js/sounds.js (Sound Mixer, M8).
# They only answer this Mac (not phones on the LAN) and only accept a file that
# starts with that tool's own header line.
import functools, http.server, os, sys

here = os.path.dirname(os.path.abspath(__file__))
# route → (file, header the text must start with, the export it must contain, tool name)
ROUTES = {
    '/tools/editor/save': (os.path.join(here, 'js', 'levels.js'), '// TDX — level data. Written by the Level Editor',
                           'export const LEVELS', 'Level Editor'),
    '/tools/mixer/save': (os.path.join(here, 'js', 'sounds.js'), '// TDX — the sound list (M8 "Hypercard"). Written by the Sound Mixer',
                          'export const SOUNDS', 'Sound Mixer'),
}
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
        route = ROUTES.get(self.path)
        if not route:
            return self.reply(404, 'Not found')
        path, header, export, tool = route
        if self.client_address[0] not in ('127.0.0.1', '::1', '::ffff:127.0.0.1'):
            return self.reply(403, f'The {tool} can only save from this computer (open it at http://localhost).')
        length = int(self.headers.get('Content-Length') or 0)
        if not 0 < length <= MAX_BYTES:
            return self.reply(400, 'Empty or oversized file.')
        text = self.rfile.read(length).decode('utf-8')
        if not text.startswith(header) or export not in text:
            return self.reply(400, f'That doesn\'t look like a file from the {tool}.')
        tmp = path + '.saving'
        with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)
        os.replace(tmp, path)   # atomic: the game never reads a half-written file
        print(f'{tool} saved js/{os.path.basename(path)} ({len(text):,} bytes)')
        return self.reply(200, 'Saved')

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
print(f'TDX serving {here} on http://localhost:{port} (no-cache)')
print(f'Level Editor: http://localhost:{port}/tools/editor/')
print(f'Sound Mixer:  http://localhost:{port}/tools/mixer/')
http.server.ThreadingHTTPServer(('', port), functools.partial(NoCache, directory=here)).serve_forever()
