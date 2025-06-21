class StockfishInterface {
    constructor() {
        this.engine = null;
        this.isReady = false;
        this.currentEval = 0;
        this.engineButton = document.getElementById('toggle-engine');
        this.evaluationBar = document.getElementById('evaluation-fill');
        this.evaluationScore = document.getElementById('evaluation-score');
        this.engineInfo = document.getElementById('engine-info');
        
        this.attachEventListeners();
    }

    attachEventListeners() {
        this.engineButton?.addEventListener('click', () => {
            if (this.engine) {
                this.stopEngine();
            } else {
                this.startEngine();
            }
        });
    }

    async startEngine() {
        try {
            this.engineButton.textContent = 'Loading Engine...';
            this.engineButton.disabled = true;

            this.engine = new Worker('https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js');
            
            this.engine.onmessage = (event) => {
                this.handleEngineMessage(event.data);
            };

            this.engine.postMessage('uci');
            
        } catch (error) {
            console.error('Failed to load Stockfish:', error);
            this.engineInfo.textContent = 'Failed to load engine';
            this.engineButton.textContent = 'Start Engine';
            this.engineButton.disabled = false;
        }
    }

    stopEngine() {
        if (this.engine) {
            this.engine.terminate();
            this.engine = null;
            this.isReady = false;
            this.engineButton.textContent = 'Start Engine';
            this.engineInfo.textContent = '';
            this.evaluationScore.textContent = '0.0';
            this.evaluationBar.style.width = '50%';
        }
    }

    handleEngineMessage(message) {
        if (message === 'uciok') {
            this.engine.postMessage('isready');
        } else if (message === 'readyok') {
            this.isReady = true;
            this.engineButton.textContent = 'Stop Engine';
            this.engineButton.disabled = false;
            this.engineInfo.textContent = 'Engine ready';
            
            if (window.databaseViewer && window.databaseViewer.board) {
                this.analyzePosition(window.databaseViewer.board);
            }
        } else if (message.includes('info')) {
            this.parseEngineInfo(message);
        }
    }

    parseEngineInfo(message) {
        const depthMatch = message.match(/depth (\d+)/);
        const scoreMatch = message.match(/score cp (-?\d+)/);
        const mateMatch = message.match(/score mate (-?\d+)/);
        const pvMatch = message.match(/pv (.+)/);

        let info = '';
        if (depthMatch) {
            info += `Depth: ${depthMatch[1]} `;
        }

        if (mateMatch) {
            const mateIn = parseInt(mateMatch[1]);
            this.currentEval = mateIn > 0 ? 100 : -100;
            info += `Mate in ${Math.abs(mateIn)} `;
            this.updateEvaluation(this.currentEval, `M${Math.abs(mateIn)}`);
        } else if (scoreMatch) {
            const cp = parseInt(scoreMatch[1]);
            this.currentEval = cp / 100;
            info += `Eval: ${this.currentEval.toFixed(2)} `;
            this.updateEvaluation(this.currentEval);
        }

        if (pvMatch) {
            const moves = pvMatch[1].split(' ').slice(0, 3).join(' ');
            info += `Best: ${moves}`;
        }

        this.engineInfo.textContent = info;
    }

    updateEvaluation(score, displayScore = null) {
        const clampedScore = Math.max(-10, Math.min(10, score));
        const percentage = 50 + (clampedScore * 5);
        
        this.evaluationBar.style.width = `${percentage}%`;
        this.evaluationScore.textContent = displayScore || score.toFixed(1);
        
        if (score > 2) {
            this.evaluationBar.style.backgroundColor = '#ffffff';
        } else if (score < -2) {
            this.evaluationBar.style.backgroundColor = '#333333';
        } else {
            this.evaluationBar.style.backgroundColor = '#cccccc';
        }
    }

    analyzePosition(board) {
        if (!this.isReady || !this.engine) return;

        const fen = this.boardToFEN(board);
        this.engine.postMessage(`position fen ${fen}`);
        this.engine.postMessage('go depth 15');
    }

    boardToFEN(board) {
        let fen = '';
        
        for (let row = 0; row < 8; row++) {
            let emptyCount = 0;
            
            for (let col = 0; col < 8; col++) {
                const piece = board.getPieceAt(row, col);
                
                if (!piece) {
                    emptyCount++;
                } else {
                    if (emptyCount > 0) {
                        fen += emptyCount;
                        emptyCount = 0;
                    }
                    
                    const pieceChar = {
                        [PIECE_TYPES.KING]: 'k',
                        [PIECE_TYPES.QUEEN]: 'q',
                        [PIECE_TYPES.ROOK]: 'r',
                        [PIECE_TYPES.BISHOP]: 'b',
                        [PIECE_TYPES.KNIGHT]: 'n',
                        [PIECE_TYPES.PAWN]: 'p'
                    };
                    
                    let char = pieceChar[piece.type];
                    if (piece.color === COLORS.WHITE) {
                        char = char.toUpperCase();
                    }
                    fen += char;
                }
            }
            
            if (emptyCount > 0) {
                fen += emptyCount;
            }
            
            if (row < 7) {
                fen += '/';
            }
        }
        
        fen += ' ' + (board.currentTurn === COLORS.WHITE ? 'w' : 'b');
        
        let castling = '';
        const whiteKing = board.getPieceAt(7, 4);
        const blackKing = board.getPieceAt(0, 4);
        
        if (whiteKing && !whiteKing.hasMoved) {
            const kingsideRook = board.getPieceAt(7, 7);
            if (kingsideRook && !kingsideRook.hasMoved) castling += 'K';
            const queensideRook = board.getPieceAt(7, 0);
            if (queensideRook && !queensideRook.hasMoved) castling += 'Q';
        }
        
        if (blackKing && !blackKing.hasMoved) {
            const kingsideRook = board.getPieceAt(0, 7);
            if (kingsideRook && !kingsideRook.hasMoved) castling += 'k';
            const queensideRook = board.getPieceAt(0, 0);
            if (queensideRook && !queensideRook.hasMoved) castling += 'q';
        }
        
        fen += ' ' + (castling || '-');
        
        fen += ' ' + (board.enPassantTarget ? 
            String.fromCharCode(97 + board.enPassantTarget[1]) + (8 - board.enPassantTarget[0]) : '-');
        
        fen += ' 0 1';
        
        return fen;
    }
}

let stockfishInterface;

document.addEventListener('DOMContentLoaded', () => {
    stockfishInterface = new StockfishInterface();
    
    window.databaseViewer = document.querySelector('.database-viewer') ? 
        new DatabaseViewer() : null;
    
    if (window.databaseViewer) {
        const originalRenderBoard = window.databaseViewer.renderBoard.bind(window.databaseViewer);
        window.databaseViewer.renderBoard = function() {
            originalRenderBoard();
            if (stockfishInterface && stockfishInterface.isReady) {
                stockfishInterface.analyzePosition(this.board);
            }
        };
    }
});