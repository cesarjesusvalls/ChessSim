class ChessUI {
    constructor() {
        this.board = new ChessBoard();
        this.selectedSquare = null;
        this.validMoves = [];
        this.boardElement = document.getElementById('chess-board');
        this.turnIndicator = document.getElementById('turn-indicator');
        this.gameStatus = document.getElementById('game-status');
        this.promotionModal = document.getElementById('promotion-modal');
        this.pendingPromotion = null;
        
        this.initializeBoard();
        this.attachEventListeners();
        this.updateDisplay();
    }

    initializeBoard() {
        this.boardElement.innerHTML = '';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = 'square';
                square.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
                square.dataset.row = row;
                square.dataset.col = col;
                this.boardElement.appendChild(square);
            }
        }
    }

    attachEventListeners() {
        this.boardElement.addEventListener('click', (e) => {
            const square = e.target.closest('.square');
            if (square) {
                const row = parseInt(square.dataset.row);
                const col = parseInt(square.dataset.col);
                this.handleSquareClick(row, col);
            }
        });

        document.getElementById('new-game').addEventListener('click', () => {
            this.board = new ChessBoard();
            this.selectedSquare = null;
            this.validMoves = [];
            this.updateDisplay();
        });

        document.getElementById('undo-move').addEventListener('click', () => {
            if (this.board.undoMove()) {
                this.selectedSquare = null;
                this.validMoves = [];
                this.updateDisplay();
            }
        });

        document.querySelectorAll('.promotion-piece').forEach(button => {
            button.addEventListener('click', (e) => {
                const pieceType = e.target.dataset.piece;
                this.completePromotion(pieceType);
            });
        });
    }

    handleSquareClick(row, col) {
        if (this.pendingPromotion) return;

        const piece = this.board.getPieceAt(row, col);

        if (this.selectedSquare) {
            const [fromRow, fromCol] = this.selectedSquare;
            const isValidMove = this.validMoves.some(([r, c]) => r === row && c === col);

            if (isValidMove) {
                const result = this.board.movePiece(fromRow, fromCol, row, col);
                
                if (result === 'promotion_required') {
                    this.pendingPromotion = { from: [fromRow, fromCol], to: [row, col] };
                    this.showPromotionModal();
                    return;
                }

                this.selectedSquare = null;
                this.validMoves = [];
                this.updateDisplay();
            } else if (piece && piece.color === this.board.currentTurn) {
                this.selectedSquare = [row, col];
                this.validMoves = piece.getPossibleMoves(this.board);
                this.updateDisplay();
            } else {
                this.selectedSquare = null;
                this.validMoves = [];
                this.updateDisplay();
            }
        } else if (piece && piece.color === this.board.currentTurn) {
            this.selectedSquare = [row, col];
            this.validMoves = piece.getPossibleMoves(this.board);
            this.updateDisplay();
        }
    }

    showPromotionModal() {
        this.promotionModal.classList.remove('hidden');
        const color = this.board.currentTurn;
        document.querySelectorAll('.promotion-piece').forEach(button => {
            const pieceType = button.dataset.piece;
            button.textContent = PIECE_SYMBOLS[color][pieceType];
        });
    }

    completePromotion(pieceType) {
        if (!this.pendingPromotion) return;

        const { from, to } = this.pendingPromotion;
        this.board.movePiece(from[0], from[1], to[0], to[1], pieceType);
        
        this.promotionModal.classList.add('hidden');
        this.pendingPromotion = null;
        this.selectedSquare = null;
        this.validMoves = [];
        this.updateDisplay();
    }

    updateDisplay() {
        this.renderBoard();
        this.updateGameInfo();
    }

    renderBoard() {
        const squares = this.boardElement.querySelectorAll('.square');
        const lastMove = this.board.moveHistory[this.board.moveHistory.length - 1];

        squares.forEach(square => {
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            const piece = this.board.getPieceAt(row, col);

            square.innerHTML = '';
            square.classList.remove('selected', 'valid-move', 'last-move-from', 'last-move-to');

            if (piece) {
                const pieceElement = document.createElement('div');
                pieceElement.className = 'piece';
                pieceElement.textContent = piece.getSymbol();
                square.appendChild(pieceElement);
            }

            if (this.selectedSquare && row === this.selectedSquare[0] && col === this.selectedSquare[1]) {
                square.classList.add('selected');
            }

            if (this.validMoves.some(([r, c]) => r === row && c === col)) {
                square.classList.add('valid-move');
            }

            if (lastMove) {
                if (row === lastMove.from[0] && col === lastMove.from[1]) {
                    square.classList.add('last-move-from');
                }
                if (row === lastMove.to[0] && col === lastMove.to[1]) {
                    square.classList.add('last-move-to');
                }
            }
        });
    }

    updateGameInfo() {
        const capitalizedTurn = this.board.currentTurn.charAt(0).toUpperCase() + 
                               this.board.currentTurn.slice(1);
        this.turnIndicator.textContent = `${capitalizedTurn}'s Turn`;
        
        const status = this.board.getGameStatus();
        switch (status.status) {
            case 'checkmate':
                const winner = status.winner.charAt(0).toUpperCase() + status.winner.slice(1);
                this.gameStatus.textContent = `Checkmate! ${winner} wins!`;
                break;
            case 'stalemate':
                this.gameStatus.textContent = 'Stalemate! Game is a draw.';
                break;
            case 'check':
                this.gameStatus.textContent = 'Check!';
                break;
            default:
                this.gameStatus.textContent = '';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ChessUI();
});