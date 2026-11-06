
#### Web Test

**Start the Session**
1. Start a Terminal
2. Run this command
This runs the game server and the ledger server

cd ~/Library/Mobile\ Documents/iCloud~md~obsidian/Documents/JogoHome/1_projects/05_TDX && python3 Code/serve.py

Wait for `TDX serving ... on http://localhost:8000`, then leave that window open.


**Run the Game and Tools (Desktop)**
To run the game and the ledger themselves, open both in your browser, in separate tabs:
With `serve.py` running:

- **Level Editor:** [http://localhost:8000/tools/editor/](http://localhost:8000/tools/editor/)
- **Ledger:** [http://localhost:8000/tools/ledger/](http://localhost:8000/tools/ledger/)
- **Game:** [http://localhost:8000/](http://localhost:8000/)

**Run the Game (mobile)** 
On your phone (optional): use the Mac’s LAN address in place of localhost, the same way you playtest. For example, [http://192.168.x.x:8000/](http://192.168.x.x:8000/) for the game.


**[https://jogosity.github.io/TDX/](https://jogosity.github.io/TDX/)**,


**Finish up**
When you're done, click the Terminal window and press Ctrl+C.

If Terminal says the address is already in use, the server from a previous session is still running, so just open the tabs.