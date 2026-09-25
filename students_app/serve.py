import http.server
import socketserver
import os
import sys
import threading

DIRECTORY = os.path.join(os.path.dirname(__file__), 'build', 'web')

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

def serve_on_port(port):
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", port), NoCacheHandler) as httpd:
        print(f"Serving at http://localhost:{port}")
        sys.stdout.flush()
        httpd.serve_forever()

if __name__ == '__main__':
    t1 = threading.Thread(target=serve_on_port, args=(8080,), daemon=True)
    t2 = threading.Thread(target=serve_on_port, args=(8085,), daemon=True)
    t1.start()
    t2.start()
    print("Dual servers running on http://localhost:8080 and http://localhost:8085")
    sys.stdout.flush()
    t1.join()
    t2.join()
