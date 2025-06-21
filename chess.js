const PIECE_TYPES = {
    KING: 'king',
    QUEEN: 'queen',
    ROOK: 'rook',
    BISHOP: 'bishop',
    KNIGHT: 'knight',
    PAWN: 'pawn'
};

const COLORS = {
    WHITE: 'white',
    BLACK: 'black'
};

const PIECE_SYMBOLS = {
    white: {
        king: '♔',
        queen: '♕',
        rook: '♖',
        bishop: '♗',
        knight: '♘',
        pawn: '♙'
    },
    black: {
        king: '♚',
        queen: '♛',
        rook: '♜',
        bishop: '♝',
        knight: '♞',
        pawn: '♟'
    }
};

class Piece {
    constructor(type, color, position) {
        this.type = type;
        this.color = color;
        this.position = position;
        this.hasMoved = false;
    }

    getSymbol() {
        return PIECE_SYMBOLS[this.color][this.type];
    }

    getPossibleMoves(board) {
        const moves = [];
        const [row, col] = this.position;

        switch (this.type) {
            case PIECE_TYPES.PAWN:
                moves.push(...this.getPawnMoves(board, row, col));
                break;
            case PIECE_TYPES.KNIGHT:
                moves.push(...this.getKnightMoves(board, row, col));
                break;
            case PIECE_TYPES.BISHOP:
                moves.push(...this.getBishopMoves(board, row, col));
                break;
            case PIECE_TYPES.ROOK:
                moves.push(...this.getRookMoves(board, row, col));
                break;
            case PIECE_TYPES.QUEEN:
                moves.push(...this.getQueenMoves(board, row, col));
                break;
            case PIECE_TYPES.KING:
                moves.push(...this.getKingMoves(board, row, col));
                break;
        }

        return moves.filter(move => this.isValidMove(board, move));
    }

    getPawnMoves(board, row, col) {
        const moves = [];
        const direction = this.color === COLORS.WHITE ? -1 : 1;
        const startRow = this.color === COLORS.WHITE ? 6 : 1;

        if (board.isValidPosition(row + direction, col) && !board.getPieceAt(row + direction, col)) {
            moves.push([row + direction, col]);

            if (row === startRow && !board.getPieceAt(row + 2 * direction, col)) {
                moves.push([row + 2 * direction, col]);
            }
        }

        const captureOffsets = [[direction, -1], [direction, 1]];
        for (const [dr, dc] of captureOffsets) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (board.isValidPosition(newRow, newCol)) {
                const targetPiece = board.getPieceAt(newRow, newCol);
                if (targetPiece && targetPiece.color !== this.color) {
                    moves.push([newRow, newCol]);
                }
            }
        }

        const enPassantRow = this.color === COLORS.WHITE ? 3 : 4;
        if (row === enPassantRow && board.enPassantTarget) {
            const [epRow, epCol] = board.enPassantTarget;
            if (epRow === row + direction && Math.abs(epCol - col) === 1) {
                moves.push([epRow, epCol]);
            }
        }

        return moves;
    }

    getKnightMoves(board, row, col) {
        const moves = [];
        const offsets = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        for (const [dr, dc] of offsets) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (board.isValidPosition(newRow, newCol)) {
                const targetPiece = board.getPieceAt(newRow, newCol);
                if (!targetPiece || targetPiece.color !== this.color) {
                    moves.push([newRow, newCol]);
                }
            }
        }

        return moves;
    }

    getBishopMoves(board, row, col) {
        const moves = [];
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

        for (const [dr, dc] of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = row + dr * i;
                const newCol = col + dc * i;
                if (!board.isValidPosition(newRow, newCol)) break;

                const targetPiece = board.getPieceAt(newRow, newCol);
                if (!targetPiece) {
                    moves.push([newRow, newCol]);
                } else {
                    if (targetPiece.color !== this.color) {
                        moves.push([newRow, newCol]);
                    }
                    break;
                }
            }
        }

        return moves;
    }

    getRookMoves(board, row, col) {
        const moves = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        for (const [dr, dc] of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = row + dr * i;
                const newCol = col + dc * i;
                if (!board.isValidPosition(newRow, newCol)) break;

                const targetPiece = board.getPieceAt(newRow, newCol);
                if (!targetPiece) {
                    moves.push([newRow, newCol]);
                } else {
                    if (targetPiece.color !== this.color) {
                        moves.push([newRow, newCol]);
                    }
                    break;
                }
            }
        }

        return moves;
    }

    getQueenMoves(board, row, col) {
        return [...this.getBishopMoves(board, row, col), ...this.getRookMoves(board, row, col)];
    }

    getKingMoves(board, row, col) {
        const moves = [];
        const offsets = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        for (const [dr, dc] of offsets) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (board.isValidPosition(newRow, newCol)) {
                const targetPiece = board.getPieceAt(newRow, newCol);
                if (!targetPiece || targetPiece.color !== this.color) {
                    moves.push([newRow, newCol]);
                }
            }
        }

        if (!this.hasMoved && !board.isInCheck(this.color)) {
            const kingSideRook = board.getPieceAt(row, 7);
            if (kingSideRook && kingSideRook.type === PIECE_TYPES.ROOK && !kingSideRook.hasMoved) {
                if (!board.getPieceAt(row, 5) && !board.getPieceAt(row, 6)) {
                    if (!board.wouldBeInCheck(this.color, [row, col], [row, 5]) &&
                        !board.wouldBeInCheck(this.color, [row, col], [row, 6])) {
                        moves.push([row, 6]);
                    }
                }
            }

            const queenSideRook = board.getPieceAt(row, 0);
            if (queenSideRook && queenSideRook.type === PIECE_TYPES.ROOK && !queenSideRook.hasMoved) {
                if (!board.getPieceAt(row, 1) && !board.getPieceAt(row, 2) && !board.getPieceAt(row, 3)) {
                    if (!board.wouldBeInCheck(this.color, [row, col], [row, 3]) &&
                        !board.wouldBeInCheck(this.color, [row, col], [row, 2])) {
                        moves.push([row, 2]);
                    }
                }
            }
        }

        return moves;
    }

    isValidMove(board, targetPosition) {
        return !board.wouldBeInCheck(this.color, this.position, targetPosition);
    }
}

class ChessBoard {
    constructor() {
        this.board = Array(8).fill(null).map(() => Array(8).fill(null));
        this.currentTurn = COLORS.WHITE;
        this.enPassantTarget = null;
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.setupInitialPosition();
    }

    setupInitialPosition() {
        const backRow = [
            PIECE_TYPES.ROOK, PIECE_TYPES.KNIGHT, PIECE_TYPES.BISHOP, PIECE_TYPES.QUEEN,
            PIECE_TYPES.KING, PIECE_TYPES.BISHOP, PIECE_TYPES.KNIGHT, PIECE_TYPES.ROOK
        ];

        for (let col = 0; col < 8; col++) {
            this.board[0][col] = new Piece(backRow[col], COLORS.BLACK, [0, col]);
            this.board[1][col] = new Piece(PIECE_TYPES.PAWN, COLORS.BLACK, [1, col]);
            this.board[6][col] = new Piece(PIECE_TYPES.PAWN, COLORS.WHITE, [6, col]);
            this.board[7][col] = new Piece(backRow[col], COLORS.WHITE, [7, col]);
        }
    }

    getPieceAt(row, col) {
        if (!this.isValidPosition(row, col)) return null;
        return this.board[row][col];
    }

    setPieceAt(row, col, piece) {
        if (!this.isValidPosition(row, col)) return;
        this.board[row][col] = piece;
        if (piece) {
            piece.position = [row, col];
        }
    }

    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    movePiece(fromRow, fromCol, toRow, toCol, promotionType = null) {
        const piece = this.getPieceAt(fromRow, fromCol);
        if (!piece || piece.color !== this.currentTurn) return false;

        const validMoves = piece.getPossibleMoves(this);
        const isValidMove = validMoves.some(([r, c]) => r === toRow && c === toCol);
        if (!isValidMove) return false;

        const moveInfo = {
            from: [fromRow, fromCol],
            to: [toRow, toCol],
            piece: piece,
            capturedPiece: null,
            isEnPassant: false,
            isCastling: false,
            promotion: null
        };

        const targetPiece = this.getPieceAt(toRow, toCol);
        if (targetPiece) {
            moveInfo.capturedPiece = targetPiece;
            this.capturedPieces[targetPiece.color].push(targetPiece);
        }

        if (piece.type === PIECE_TYPES.PAWN && this.enPassantTarget) {
            const [epRow, epCol] = this.enPassantTarget;
            if (toRow === epRow && toCol === epCol) {
                const capturedPawnRow = piece.color === COLORS.WHITE ? epRow + 1 : epRow - 1;
                const capturedPawn = this.getPieceAt(capturedPawnRow, epCol);
                if (capturedPawn) {
                    moveInfo.capturedPiece = capturedPawn;
                    moveInfo.isEnPassant = true;
                    this.capturedPieces[capturedPawn.color].push(capturedPawn);
                    this.setPieceAt(capturedPawnRow, epCol, null);
                }
            }
        }

        if (piece.type === PIECE_TYPES.KING && Math.abs(toCol - fromCol) === 2) {
            moveInfo.isCastling = true;
            const isKingSide = toCol > fromCol;
            const rookFromCol = isKingSide ? 7 : 0;
            const rookToCol = isKingSide ? 5 : 3;
            const rook = this.getPieceAt(fromRow, rookFromCol);
            this.setPieceAt(fromRow, rookFromCol, null);
            this.setPieceAt(fromRow, rookToCol, rook);
            rook.hasMoved = true;
        }

        this.setPieceAt(fromRow, fromCol, null);
        this.setPieceAt(toRow, toCol, piece);
        piece.hasMoved = true;

        this.enPassantTarget = null;
        if (piece.type === PIECE_TYPES.PAWN && Math.abs(toRow - fromRow) === 2) {
            const enPassantRow = piece.color === COLORS.WHITE ? toRow + 1 : toRow - 1;
            this.enPassantTarget = [enPassantRow, toCol];
        }

        if (piece.type === PIECE_TYPES.PAWN && 
            ((piece.color === COLORS.WHITE && toRow === 0) || 
             (piece.color === COLORS.BLACK && toRow === 7))) {
            if (promotionType) {
                const promotedPiece = new Piece(promotionType, piece.color, [toRow, toCol]);
                promotedPiece.hasMoved = true;
                this.setPieceAt(toRow, toCol, promotedPiece);
                moveInfo.promotion = promotionType;
            } else {
                return 'promotion_required';
            }
        }

        this.moveHistory.push(moveInfo);
        this.currentTurn = this.currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;

        return true;
    }

    undoMove() {
        if (this.moveHistory.length === 0) return false;

        const lastMove = this.moveHistory.pop();
        const { from, to, piece, capturedPiece, isEnPassant, isCastling } = lastMove;

        this.setPieceAt(from[0], from[1], piece);
        this.setPieceAt(to[0], to[1], capturedPiece);

        if (this.moveHistory.length === 0 || 
            !this.moveHistory.some(m => m.piece === piece && (m.from[0] !== from[0] || m.from[1] !== from[1]))) {
            piece.hasMoved = false;
        }

        if (isEnPassant) {
            const capturedPawnRow = piece.color === COLORS.WHITE ? to[0] + 1 : to[0] - 1;
            this.setPieceAt(capturedPawnRow, to[1], capturedPiece);
            this.capturedPieces[capturedPiece.color].pop();
        } else if (capturedPiece) {
            this.capturedPieces[capturedPiece.color].pop();
        }

        if (isCastling) {
            const isKingSide = to[1] > from[1];
            const rookFromCol = isKingSide ? 5 : 3;
            const rookToCol = isKingSide ? 7 : 0;
            const rook = this.getPieceAt(from[0], rookFromCol);
            this.setPieceAt(from[0], rookFromCol, null);
            this.setPieceAt(from[0], rookToCol, rook);
            rook.hasMoved = false;
        }

        this.currentTurn = this.currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;

        this.enPassantTarget = null;
        if (this.moveHistory.length > 0) {
            const prevMove = this.moveHistory[this.moveHistory.length - 1];
            if (prevMove.piece.type === PIECE_TYPES.PAWN && 
                Math.abs(prevMove.to[0] - prevMove.from[0]) === 2) {
                const enPassantRow = prevMove.piece.color === COLORS.WHITE ? 
                    prevMove.to[0] + 1 : prevMove.to[0] - 1;
                this.enPassantTarget = [enPassantRow, prevMove.to[1]];
            }
        }

        return true;
    }

    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPieceAt(row, col);
                if (piece && piece.type === PIECE_TYPES.KING && piece.color === color) {
                    return [row, col];
                }
            }
        }
        return null;
    }

    isInCheck(color) {
        const kingPos = this.findKing(color);
        if (!kingPos) return false;

        const opponentColor = color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPieceAt(row, col);
                if (piece && piece.color === opponentColor) {
                    const moves = piece.getPossibleMoves(this);
                    if (moves.some(([r, c]) => r === kingPos[0] && c === kingPos[1])) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    wouldBeInCheck(color, fromPos, toPos) {
        const piece = this.getPieceAt(fromPos[0], fromPos[1]);
        const targetPiece = this.getPieceAt(toPos[0], toPos[1]);

        this.setPieceAt(fromPos[0], fromPos[1], null);
        this.setPieceAt(toPos[0], toPos[1], piece);

        const inCheck = this.isInCheck(color);

        this.setPieceAt(fromPos[0], fromPos[1], piece);
        this.setPieceAt(toPos[0], toPos[1], targetPiece);

        return inCheck;
    }

    isCheckmate(color) {
        if (!this.isInCheck(color)) return false;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPieceAt(row, col);
                if (piece && piece.color === color) {
                    const moves = piece.getPossibleMoves(this);
                    if (moves.length > 0) return false;
                }
            }
        }
        return true;
    }

    isStalemate(color) {
        if (this.isInCheck(color)) return false;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.getPieceAt(row, col);
                if (piece && piece.color === color) {
                    const moves = piece.getPossibleMoves(this);
                    if (moves.length > 0) return false;
                }
            }
        }
        return true;
    }

    getGameStatus() {
        if (this.isCheckmate(this.currentTurn)) {
            const winner = this.currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
            return { status: 'checkmate', winner };
        }
        if (this.isStalemate(this.currentTurn)) {
            return { status: 'stalemate' };
        }
        if (this.isInCheck(this.currentTurn)) {
            return { status: 'check' };
        }
        return { status: 'ongoing' };
    }
}