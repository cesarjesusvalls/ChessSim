class StockfishInterface {
    constructor() {
        this.engine = null;
        this.isReady = false;
        this.currentEval = 0;
        this.engineButton = document.getElementById('toggle-engine');
        this.evaluationBar = document.getElementById('evaluation-fill');
        this.evaluationScore = document.getElementById('evaluation-score');
        this.engineInfo = document.getElementById('engine-info');
        this.useStockfish = true;
        this.messageUnsubscribe = null;
        
        this.attachEventListeners();
    }

    attachEventListeners() {
        this.engineButton?.addEventListener('click', () => {
            if (this.isReady) {
                this.stopEngine();
            } else {
                this.startEngine();
            }
        });
    }

    async startEngine() {
        this.engineButton.textContent = 'Loading Engine...';
        this.engineButton.disabled = true;

        if (this.useStockfish) {
            try {
                this.engine = new StockfishWrapper();
                
                this.messageUnsubscribe = this.engine.onMessage((message) => {
                    this.handleEngineMessage(message);
                });

                await this.engine.initialize();
                this.engine.postMessage('isready');
                
            } catch (error) {
                console.error('Failed to load Stockfish, falling back to simple evaluation:', error);
                this.useStockfish = false;
                this.engine = null;
                this.startSimpleEngine();
            }
        } else {
            this.startSimpleEngine();
        }
    }

    startSimpleEngine() {
        this.engineButton.textContent = 'Stop Analysis';
        this.engineButton.disabled = false;
        this.isReady = true;
        this.engineInfo.textContent = 'Simple evaluation active';
        
        if (window.databaseViewer && window.databaseViewer.board) {
            this.analyzePosition(window.databaseViewer.board);
        }
    }

    stopEngine() {
        if (this.engine) {
            this.engine.terminate();
            this.engine = null;
        }
        if (this.messageUnsubscribe) {
            this.messageUnsubscribe();
            this.messageUnsubscribe = null;
        }
        this.isReady = false;
        this.engineButton.textContent = 'Start Analysis';
        this.engineButton.disabled = false;
        this.engineInfo.textContent = '';
        this.evaluationScore.textContent = '0.0';
        this.evaluationBar.style.width = '50%';
    }

    handleEngineMessage(message) {
        if (message === 'readyok') {
            this.isReady = true;
            this.engineButton.textContent = 'Stop Analysis';
            this.engineButton.disabled = false;
            this.engineInfo.textContent = 'Stockfish ready';
            
            if (window.databaseViewer && window.databaseViewer.board) {
                this.analyzePosition(window.databaseViewer.board);
            }
        } else if (message.includes('info')) {
            this.parseEngineInfo(message);
        }
    }

    parseEngineInfo(message) {
        // Debug: log all info messages to see what we're getting
        if (message.includes('info')) {
            console.log('Stockfish info:', message);
        }

        const depthMatch = message.match(/depth (\d+)/);
        const scoreMatch = message.match(/score cp (-?\d+)/);
        const mateMatch = message.match(/score mate (-?\d+)/);
        const pvMatch = message.match(/pv (.+)/);

        let info = 'Stockfish: ';
        let hasUpdate = false;

        if (depthMatch) {
            info += `Depth ${depthMatch[1]} `;
        }

        if (mateMatch) {
            const mateIn = parseInt(mateMatch[1]);
            this.currentEval = mateIn > 0 ? 100 : -100;
            info += `Mate in ${Math.abs(mateIn)} `;
            this.updateEvaluation(this.currentEval, `M${Math.abs(mateIn)}`);
            hasUpdate = true;
        } else if (scoreMatch) {
            const cp = parseInt(scoreMatch[1]);
            this.currentEval = cp / 100;
            info += `Eval: ${this.currentEval.toFixed(2)} `;
            this.updateEvaluation(this.currentEval);
            hasUpdate = true;
            console.log('Updated evaluation to:', this.currentEval);
        }

        if (pvMatch && depthMatch && parseInt(depthMatch[1]) >= 5) {
            const moves = pvMatch[1].split(' ').slice(0, 3).join(' ');
            info += `Best: ${moves}`;
        }

        // Only update display if we have meaningful info
        if (hasUpdate || depthMatch) {
            this.engineInfo.textContent = info;
        }
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
        if (!this.isReady) return;

        if (this.engine && this.useStockfish) {
            const fen = this.boardToFEN(board);
            this.engine.postMessage(`position fen ${fen}`);
            this.engine.postMessage('go depth 20');
        } else {
            // Fallback to simple evaluation
            const evaluation = this.evaluatePosition(board);
            this.updateEvaluation(evaluation);
            
            const material = this.getMaterialBalance(board);
            let info = `Material: ${material > 0 ? '+' : ''}${material} `;
            
            if (board.getGameStatus().status === 'checkmate') {
                const winner = board.currentTurn === COLORS.WHITE ? 'Black' : 'White';
                info = `Checkmate - ${winner} wins`;
                this.updateEvaluation(board.currentTurn === COLORS.WHITE ? -100 : 100, '#');
            } else if (board.getGameStatus().status === 'stalemate') {
                info = 'Stalemate - Draw';
                this.updateEvaluation(0, '0.0');
            }
            
            this.engineInfo.textContent = info;
        }
    }

    evaluatePosition(board) {
        let score = 0;
        
        const pieceValues = {
            [PIECE_TYPES.PAWN]: 1,
            [PIECE_TYPES.KNIGHT]: 3,
            [PIECE_TYPES.BISHOP]: 3,
            [PIECE_TYPES.ROOK]: 5,
            [PIECE_TYPES.QUEEN]: 9,
            [PIECE_TYPES.KING]: 0
        };
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board.getPieceAt(row, col);
                if (piece) {
                    const value = pieceValues[piece.type];
                    if (piece.color === COLORS.WHITE) {
                        score += value;
                    } else {
                        score -= value;
                    }
                    
                    if (piece.type === PIECE_TYPES.PAWN) {
                        const advancement = piece.color === COLORS.WHITE ? 7 - row : row;
                        score += (advancement * 0.1) * (piece.color === COLORS.WHITE ? 1 : -1);
                    }
                }
            }
        }
        
        const mobility = this.evaluateMobility(board);
        score += mobility * 0.1;
        
        if (board.isInCheck(COLORS.WHITE)) score -= 0.5;
        if (board.isInCheck(COLORS.BLACK)) score += 0.5;
        
        return score;
    }

    getMaterialBalance(board) {
        let balance = 0;
        const pieceValues = {
            [PIECE_TYPES.PAWN]: 1,
            [PIECE_TYPES.KNIGHT]: 3,
            [PIECE_TYPES.BISHOP]: 3,
            [PIECE_TYPES.ROOK]: 5,
            [PIECE_TYPES.QUEEN]: 9
        };
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board.getPieceAt(row, col);
                if (piece && piece.type !== PIECE_TYPES.KING) {
                    const value = pieceValues[piece.type];
                    balance += piece.color === COLORS.WHITE ? value : -value;
                }
            }
        }
        
        return balance;
    }

    evaluateMobility(board) {
        let whiteMoves = 0;
        let blackMoves = 0;
        
        const originalTurn = board.currentTurn;
        
        board.currentTurn = COLORS.WHITE;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board.getPieceAt(row, col);
                if (piece && piece.color === COLORS.WHITE) {
                    whiteMoves += piece.getPossibleMoves(board).length;
                }
            }
        }
        
        board.currentTurn = COLORS.BLACK;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board.getPieceAt(row, col);
                if (piece && piece.color === COLORS.BLACK) {
                    blackMoves += piece.getPossibleMoves(board).length;
                }
            }
        }
        
        board.currentTurn = originalTurn;
        
        return whiteMoves - blackMoves;
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