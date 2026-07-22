
#### Web Test

This is a two-minute Terminal job, and you only need one command. The game itself is just files — the server is only needed because browsers block modular JavaScript when opened straight from a file.

Here's the walkthrough:

1. Open **Terminal** (press `Cmd+Space`, type "Terminal", hit Enter).
2. Paste this in and press Enter (it's one long line — the quotes matter because your folder path has spaces):


cd "/Users/Jogosity/Library/Mobile Documents/iCloud~md~obsidian/Documents/JogoHome/1_projects/05_TDX/Code" && python3 -m http.server 8000


3. You should see `Serving HTTP on :: port 8000`. That means it's running.\
4. Open your browser and go to **[http://localhost:8000](http://localhost:8000)** — the game should load. Since it's designed portrait-first, narrow your browser window to a tall phone-ish shape for the intended look.
5. When you're done playing, click back into Terminal and press `Ctrl+C` to stop the server. (Closing the Terminal window also kills it — that's fine.)


#### Mobile Test
To try it on your phone later: with the server running, type `ipconfig getifaddr en0` in a second Terminal window to get your Mac's local address, then visit `http://<that-address>:8000` on your phone (same Wi-Fi).

192.168.4.29


http://192.168.4.29:8000





