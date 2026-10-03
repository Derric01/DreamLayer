"""Transport local Chrome DevTools messages for Node on Windows.

Uses the environment's websocket-client package. It only connects to the
loopback debugging endpoint passed by cdp.mjs and never accesses remote hosts.
"""
import json
import sys
import threading
from urllib.parse import urlparse

import websocket

target = sys.argv[1]
if urlparse(target).hostname not in ("localhost", "127.0.0.1"):
    raise ValueError("Only loopback CDP connections are permitted")

connection = websocket.create_connection(target, timeout=20, suppress_origin=True)

def send():
    try:
        for line in sys.stdin:
            connection.send(line.strip())
    except (OSError, websocket.WebSocketException):
        pass

threading.Thread(target=send, daemon=True).start()
try:
    while True:
        message = connection.recv()
        if not message:
            break
        json.loads(message)
        print(message, flush=True)
except (OSError, websocket.WebSocketException):
    pass
finally:
    connection.close()
