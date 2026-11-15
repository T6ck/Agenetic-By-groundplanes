"""CI smoke test for the packaged companion, without user files or model weights."""
import json, os, pathlib, queue, secrets, subprocess, sys, tempfile, threading, urllib.request
with tempfile.TemporaryDirectory() as folder:
    key = secrets.token_urlsafe(32)
    proc = subprocess.Popen([str(pathlib.Path(sys.argv[1]).resolve()), '--desktop', '--origin', 'agenetic://app', '--port', '0', '--models-dir', folder], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, env={**os.environ, 'AGENETIC_SESSION_KEY': key})
    events = queue.Queue()
    def read():
        for line in proc.stdout:
            try:
                event = json.loads(line)
                if event.get('event') == 'ready': events.put(event); return
            except ValueError: pass
    threading.Thread(target=read, daemon=True).start()
    try:
        event = events.get(timeout=60)
        request = urllib.request.Request(f"http://127.0.0.1:{event['port']}/status", headers={'Origin':'agenetic://app', 'Authorization':'Bearer '+key})
        with urllib.request.urlopen(request, timeout=15) as response:
            if response.status != 200: raise RuntimeError('Companion health failed')
        print('Packaged companion started and answered authenticated health request.')
    finally:
        proc.kill(); proc.wait(timeout=15)
