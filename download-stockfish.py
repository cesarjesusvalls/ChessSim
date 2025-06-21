#!/usr/bin/env python3
"""
Download Stockfish.js locally to avoid CORS issues
"""

import urllib.request
import os

def download_file(url, filename):
    print(f"Downloading {filename} from {url}...")
    try:
        urllib.request.urlretrieve(url, filename)
        print(f"✅ Successfully downloaded {filename}")
        return True
    except Exception as e:
        print(f"❌ Failed to download {filename}: {e}")
        return False

# Create stockfish directory
os.makedirs('stockfish', exist_ok=True)

# Download Stockfish.js
stockfish_url = "https://unpkg.com/stockfish.js@10.0.2/stockfish.js"
if download_file(stockfish_url, "stockfish/stockfish.js"):
    print("\n🎉 Stockfish downloaded successfully!")
    print("You can now use './stockfish/stockfish.js' as a local worker")
else:
    print("\n❌ Failed to download Stockfish")