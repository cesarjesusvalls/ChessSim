#!/usr/bin/env python3
"""
Simple HTTP server for ChessSim to avoid CORS issues
Run with: python3 server.py
Then open: http://localhost:8000
"""

import http.server
import socketserver
import os

PORT = 8000

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        # Required for SharedArrayBuffer support in Stockfish NNUE
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        # Cache control
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

os.chdir(os.path.dirname(os.path.abspath(__file__)))

with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
    print(f"Server running at http://localhost:{PORT}/")
    print(f"Open http://localhost:{PORT}/database.html for the game database")
    print("Press Ctrl+C to stop the server")
    httpd.serve_forever()