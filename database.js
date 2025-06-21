class DatabaseViewer {
    constructor() {
        this.board = new ChessBoard();
        this.currentGame = null;
        this.currentMoveIndex = -1;
        this.games = [];
        this.lichessAPI = new LichessAPI();
        this.boardElement = document.getElementById('chess-board');
        this.isFlipped = false;
        
        this.initializeBoard();
        this.attachEventListeners();
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
        document.getElementById('search-lichess').addEventListener('click', () => {
            this.searchLichessGames();
        });

        document.getElementById('load-pgn').addEventListener('click', () => {
            document.getElementById('pgn-file-input').click();
        });

        document.getElementById('pgn-file-input').addEventListener('change', (e) => {
            this.loadPGNFile(e.target.files[0]);
        });

        document.getElementById('first-move').addEventListener('click', () => {
            this.goToMove(0);
        });

        document.getElementById('prev-move').addEventListener('click', () => {
            this.goToMove(this.currentMoveIndex - 1);
        });

        document.getElementById('next-move').addEventListener('click', () => {
            this.goToMove(this.currentMoveIndex + 1);
        });

        document.getElementById('last-move').addEventListener('click', () => {
            if (this.currentGame) {
                this.goToMove(this.currentGame.moves.length);
            }
        });

        document.getElementById('flip-board').addEventListener('click', () => {
            this.flipBoard();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.goToMove(this.currentMoveIndex - 1);
            } else if (e.key === 'ArrowRight') {
                this.goToMove(this.currentMoveIndex + 1);
            } else if (e.key === 'Home') {
                this.goToMove(0);
            } else if (e.key === 'End' && this.currentGame) {
                this.goToMove(this.currentGame.moves.length);
            }
        });
    }

    async searchLichessGames() {
        const username = document.getElementById('player-search').value.trim();
        if (!username) return;

        const gameList = document.getElementById('game-list');
        gameList.innerHTML = '<div class="loading">Loading games...</div>';

        const games = await this.lichessAPI.searchPlayerGames(username);
        this.games = games;
        this.displayGameList(games);
    }

    async loadPGNFile(file) {
        if (!file) return;

        const text = await file.text();
        const parser = new PGNParser();
        const games = parser.parsePGN(text);
        
        this.games = games;
        this.displayGameList(games);
    }

    displayGameList(games) {
        const gameList = document.getElementById('game-list');
        gameList.innerHTML = '';

        if (games.length === 0) {
            gameList.innerHTML = '<div class="no-games">No games found</div>';
            return;
        }

        games.forEach((game, index) => {
            const gameItem = document.createElement('div');
            gameItem.className = 'game-item';
            gameItem.dataset.index = index;

            const players = document.createElement('div');
            players.className = 'game-item-players';
            players.textContent = `${game.headers.White} vs ${game.headers.Black}`;

            const info = document.createElement('div');
            info.className = 'game-item-info';
            info.textContent = `${game.headers.Date} • ${game.headers.Result}`;
            
            if (game.headers.Opening) {
                info.textContent += ` • ${game.headers.Opening}`;
            }

            gameItem.appendChild(players);
            gameItem.appendChild(info);

            gameItem.addEventListener('click', () => {
                this.loadGame(index);
            });

            gameList.appendChild(gameItem);
        });
    }

    loadGame(index) {
        const game = this.games[index];
        if (!game) return;

        document.querySelectorAll('.game-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-index="${index}"]`).classList.add('active');

        this.currentGame = game;
        this.currentMoveIndex = 0;

        document.getElementById('game-title').textContent = 
            `${game.headers.White} vs ${game.headers.Black}`;
        
        const details = [];
        if (game.headers.Event) details.push(game.headers.Event);
        if (game.headers.Date) details.push(game.headers.Date);
        if (game.headers.Result) details.push(game.headers.Result);
        if (game.headers.Opening) details.push(game.headers.Opening);
        if (game.headers.ECO) details.push(`ECO: ${game.headers.ECO}`);
        
        document.getElementById('game-details').textContent = details.join(' • ');

        this.board = new ChessBoard();
        this.renderBoard();
        this.displayMoves();
    }

    goToMove(moveIndex) {
        if (!this.currentGame) return;
        
        moveIndex = Math.max(0, Math.min(moveIndex, this.currentGame.moves.length));
        
        this.board = new ChessBoard();
        
        for (let i = 0; i < moveIndex; i++) {
            const parser = new PGNParser();
            const moveCoords = parser.moveToCoordinates(
                this.currentGame.moves[i], 
                this.board, 
                this.board.currentTurn
            );
            
            if (moveCoords) {
                this.board.movePiece(
                    moveCoords.from[0], moveCoords.from[1],
                    moveCoords.to[0], moveCoords.to[1],
                    moveCoords.promotion
                );
            }
        }
        
        this.currentMoveIndex = moveIndex;
        this.renderBoard();
        this.updateMoveHighlight();
    }

    displayMoves() {
        const moveList = document.getElementById('move-list');
        moveList.innerHTML = '';

        for (let i = 0; i < this.currentGame.moves.length; i++) {
            if (i % 2 === 0) {
                const moveNumber = document.createElement('span');
                moveNumber.className = 'move-number';
                moveNumber.textContent = `${Math.floor(i / 2) + 1}.`;
                moveList.appendChild(moveNumber);
            }

            const move = document.createElement('span');
            move.className = 'move';
            move.textContent = this.currentGame.moves[i];
            move.dataset.moveIndex = i + 1;
            
            move.addEventListener('click', () => {
                this.goToMove(i + 1);
            });

            moveList.appendChild(move);

            if (i % 2 === 1 || i === this.currentGame.moves.length - 1) {
                moveList.appendChild(document.createTextNode(' '));
            }
        }
    }

    updateMoveHighlight() {
        document.querySelectorAll('.move').forEach(move => {
            move.classList.remove('active');
            if (parseInt(move.dataset.moveIndex) === this.currentMoveIndex) {
                move.classList.add('active');
            }
        });
    }

    renderBoard() {
        const squares = this.boardElement.querySelectorAll('.square');
        const lastMove = this.board.moveHistory[this.board.moveHistory.length - 1];

        squares.forEach(square => {
            let row = parseInt(square.dataset.row);
            let col = parseInt(square.dataset.col);
            
            if (this.isFlipped) {
                row = 7 - row;
                col = 7 - col;
            }

            const piece = this.board.getPieceAt(row, col);

            square.innerHTML = '';
            square.classList.remove('last-move-from', 'last-move-to');

            if (piece) {
                const pieceElement = document.createElement('div');
                pieceElement.className = 'piece';
                pieceElement.textContent = piece.getSymbol();
                square.appendChild(pieceElement);
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

    flipBoard() {
        this.isFlipped = !this.isFlipped;
        this.boardElement.classList.toggle('flipped');
        this.renderBoard();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DatabaseViewer();
});