class PGNParser {
    constructor() {
        this.fileToRank = { 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5, 'g': 6, 'h': 7 };
        this.rankToFile = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    }

    parsePGN(pgnText) {
        const games = [];
        const gameTexts = pgnText.split(/\n\n(?=\[)/);
        
        for (const gameText of gameTexts) {
            if (gameText.trim()) {
                const game = this.parseGame(gameText);
                if (game) games.push(game);
            }
        }
        
        return games;
    }

    parseGame(gameText) {
        const lines = gameText.split('\n');
        const headers = {};
        let moveText = '';
        let inMoves = false;

        for (const line of lines) {
            if (line.startsWith('[')) {
                const match = line.match(/\[(\w+)\s+"(.*)"\]/);
                if (match) {
                    headers[match[1]] = match[2];
                }
            } else if (line.trim() && !line.startsWith('[')) {
                inMoves = true;
                moveText += line + ' ';
            }
        }

        if (!moveText.trim()) return null;

        const moves = this.parseMoves(moveText);
        
        return {
            headers,
            moves,
            moveText: moveText.trim()
        };
    }

    parseMoves(moveText) {
        moveText = moveText.replace(/\{[^}]*\}/g, '');
        moveText = moveText.replace(/\([^)]*\)/g, '');
        moveText = moveText.replace(/\d+\.\.\./g, '');
        moveText = moveText.replace(/\d+\./g, '');
        moveText = moveText.replace(/\s+/g, ' ');
        moveText = moveText.replace(/(1-0|0-1|1\/2-1\/2|\*)$/, '');

        const moveTokens = moveText.trim().split(/\s+/);
        const moves = [];

        for (const token of moveTokens) {
            if (token && !token.match(/^\d+$/)) {
                moves.push(token);
            }
        }

        return moves;
    }

    moveToCoordinates(move, board, color) {
        move = move.replace(/[+#!?]/g, '');

        if (move === 'O-O' || move === '0-0') {
            const row = color === COLORS.WHITE ? 7 : 0;
            return { from: [row, 4], to: [row, 6], castling: 'kingside' };
        }
        
        if (move === 'O-O-O' || move === '0-0-0') {
            const row = color === COLORS.WHITE ? 7 : 0;
            return { from: [row, 4], to: [row, 2], castling: 'queenside' };
        }

        let pieceType = PIECE_TYPES.PAWN;
        let fromFile = null;
        let fromRank = null;
        let toFile = null;
        let toRank = null;
        let promotion = null;
        let isCapture = false;

        let moveStr = move;

        const promotionMatch = moveStr.match(/=([QRBN])$/);
        if (promotionMatch) {
            promotion = this.charToPieceType(promotionMatch[1]);
            moveStr = moveStr.replace(/=([QRBN])$/, '');
        }

        if (moveStr[0] && moveStr[0] === moveStr[0].toUpperCase() && 'KQRBN'.includes(moveStr[0])) {
            pieceType = this.charToPieceType(moveStr[0]);
            moveStr = moveStr.substring(1);
        }

        if (moveStr.includes('x')) {
            isCapture = true;
            moveStr = moveStr.replace('x', '');
        }

        if (moveStr.length >= 2) {
            const lastTwo = moveStr.slice(-2);
            if (this.fileToRank[lastTwo[0]] !== undefined && lastTwo[1] >= '1' && lastTwo[1] <= '8') {
                toFile = this.fileToRank[lastTwo[0]];
                toRank = 8 - parseInt(lastTwo[1]);
                moveStr = moveStr.slice(0, -2);
            }
        }

        if (moveStr.length > 0) {
            if (this.fileToRank[moveStr[0]] !== undefined) {
                fromFile = this.fileToRank[moveStr[0]];
                moveStr = moveStr.substring(1);
            }
            if (moveStr.length > 0 && moveStr[0] >= '1' && moveStr[0] <= '8') {
                fromRank = 8 - parseInt(moveStr[0]);
            }
        }

        const candidates = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board.getPieceAt(row, col);
                if (piece && piece.type === pieceType && piece.color === color) {
                    if (fromFile !== null && col !== fromFile) continue;
                    if (fromRank !== null && row !== fromRank) continue;
                    
                    const moves = piece.getPossibleMoves(board);
                    if (moves.some(([r, c]) => r === toRank && c === toFile)) {
                        candidates.push({ from: [row, col], to: [toRank, toFile] });
                    }
                }
            }
        }

        if (candidates.length === 1) {
            const result = candidates[0];
            if (promotion) result.promotion = promotion;
            return result;
        }

        return null;
    }

    charToPieceType(char) {
        const mapping = {
            'K': PIECE_TYPES.KING,
            'Q': PIECE_TYPES.QUEEN,
            'R': PIECE_TYPES.ROOK,
            'B': PIECE_TYPES.BISHOP,
            'N': PIECE_TYPES.KNIGHT
        };
        return mapping[char] || PIECE_TYPES.PAWN;
    }

    coordinatesToMove(from, to, piece, isCapture, isCheck, isCheckmate, promotion) {
        const fromFile = this.rankToFile[from[1]];
        const toFile = this.rankToFile[to[1]];
        const fromRank = 8 - from[0];
        const toRank = 8 - to[0];

        if (piece.type === PIECE_TYPES.KING && Math.abs(to[1] - from[1]) === 2) {
            return to[1] > from[1] ? 'O-O' : 'O-O-O';
        }

        let notation = '';

        if (piece.type !== PIECE_TYPES.PAWN) {
            notation += this.pieceTypeToChar(piece.type);
        }

        const needsDisambiguation = this.needsDisambiguation(from, to, piece);
        if (needsDisambiguation.file) {
            notation += fromFile;
        }
        if (needsDisambiguation.rank) {
            notation += fromRank;
        }

        if (isCapture) {
            if (piece.type === PIECE_TYPES.PAWN && notation === '') {
                notation += fromFile;
            }
            notation += 'x';
        }

        notation += toFile + toRank;

        if (promotion) {
            notation += '=' + this.pieceTypeToChar(promotion);
        }

        if (isCheckmate) {
            notation += '#';
        } else if (isCheck) {
            notation += '+';
        }

        return notation;
    }

    pieceTypeToChar(type) {
        const mapping = {
            [PIECE_TYPES.KING]: 'K',
            [PIECE_TYPES.QUEEN]: 'Q',
            [PIECE_TYPES.ROOK]: 'R',
            [PIECE_TYPES.BISHOP]: 'B',
            [PIECE_TYPES.KNIGHT]: 'N'
        };
        return mapping[type] || '';
    }

    needsDisambiguation(from, to, piece) {
        return { file: false, rank: false };
    }
}