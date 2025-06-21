// Stockfish NNUE Web Worker wrapper
class StockfishWrapper {
    constructor() {
        this.worker = null;
        this.messageHandlers = new Map();
        this.ready = false;
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            try {
                // Check if Web Workers are supported
                if (typeof Worker === 'undefined') {
                    reject(new Error('Web Workers not supported in this browser'));
                    return;
                }

                // Try multiple sources for Stockfish - local first, then CDN fallbacks
                const sources = [
                    './stockfish/stockfish.js', // Local file first
                    'https://unpkg.com/stockfish.js@10.0.2/stockfish.js',
                    'https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js'
                ];

                console.log('Initializing Stockfish engine...');
                this.tryLoadWorker(sources, 0, resolve, reject);
            } catch (error) {
                console.error('Error initializing Stockfish:', error);
                reject(error);
            }
        });
    }

    tryLoadWorker(sources, index, resolve, reject) {
        if (index >= sources.length) {
            console.error('Failed to load Stockfish from any source');
            reject(new Error('Failed to load Stockfish from any source'));
            return;
        }

        console.log(`Attempting to load Stockfish from: ${sources[index]}`);

        try {
            this.worker = new Worker(sources[index]);
            
            this.worker.onmessage = (e) => {
                const message = e.data;
                console.log('Stockfish message:', message);
                
                if (message === 'uciok') {
                    console.log('UCI initialized, sending isready');
                    this.worker.postMessage('isready');
                } else if (message === 'readyok') {
                    console.log('Stockfish is ready!');
                    this.ready = true;
                    resolve();
                }
                
                // Notify all handlers
                this.messageHandlers.forEach(handler => handler(message));
            };

            this.worker.onerror = (error) => {
                console.error(`Worker error from ${sources[index]}:`, error);
                this.worker = null;
                // Try next source
                this.tryLoadWorker(sources, index + 1, resolve, reject);
            };

            console.log('Sending UCI command...');
            // Initialize UCI
            this.worker.postMessage('uci');
            
            // Set a timeout for initialization
            setTimeout(() => {
                if (!this.ready) {
                    console.warn(`Timeout waiting for readyok from ${sources[index]}`);
                    this.worker?.terminate();
                    this.worker = null;
                    this.tryLoadWorker(sources, index + 1, resolve, reject);
                }
            }, 10000); // Increased timeout to 10 seconds

        } catch (error) {
            console.error(`Error creating worker from ${sources[index]}:`, error);
            this.tryLoadWorker(sources, index + 1, resolve, reject);
        }
    }

    postMessage(command) {
        if (this.worker) {
            this.worker.postMessage(command);
        }
    }

    onMessage(handler) {
        const id = Date.now() + Math.random();
        this.messageHandlers.set(id, handler);
        return () => this.messageHandlers.delete(id);
    }

    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.ready = false;
            this.messageHandlers.clear();
        }
    }

    isReady() {
        return this.ready;
    }
}