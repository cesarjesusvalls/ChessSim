class LichessAPI {
    constructor() {
        this.baseURL = 'https://lichess.org/api';
    }

    async searchPlayerGames(username, options = {}) {
        const params = new URLSearchParams({
            max: options.max || 20,
            opening: options.opening || false,
            color: options.color || '',
            sort: 'dateDesc'
        });

        try {
            const response = await fetch(`${this.baseURL}/games/user/${username}?${params}`, {
                headers: {
                    'Accept': 'application/x-ndjson'
                }
            });

            if (!response.ok) {
                throw new Error(`Lichess API error: ${response.status}`);
            }

            const text = await response.text();
            const games = text.trim().split('\n').map(line => JSON.parse(line));
            
            return games.map(game => this.convertLichessGame(game));
        } catch (error) {
            console.error('Error fetching games:', error);
            return [];
        }
    }

    async getMastersDatabase(fen) {
        const params = new URLSearchParams({
            fen: fen,
            topGames: 10,
            moves: 12
        });

        try {
            const response = await fetch(`https://explorer.lichess.ovh/masters?${params}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching masters database:', error);
            return null;
        }
    }

    async getOpeningExplorer(fen, options = {}) {
        const params = new URLSearchParams({
            fen: fen,
            ratings: options.ratings || '1600,1800,2000,2200,2500',
            speeds: options.speeds || 'blitz,rapid,classical',
            moves: 12
        });

        try {
            const response = await fetch(`https://explorer.lichess.ovh/lichess?${params}`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching opening explorer:', error);
            return null;
        }
    }

    convertLichessGame(lichessGame) {
        const headers = {
            Event: lichessGame.event || 'Lichess Game',
            Site: `https://lichess.org/${lichessGame.id}`,
            Date: new Date(lichessGame.createdAt).toISOString().split('T')[0],
            Round: lichessGame.round || '?',
            White: lichessGame.players.white.user?.name || 'Anonymous',
            Black: lichessGame.players.black.user?.name || 'Anonymous',
            Result: this.getResult(lichessGame),
            WhiteElo: lichessGame.players.white.rating || '?',
            BlackElo: lichessGame.players.black.rating || '?',
            TimeControl: lichessGame.clock ? `${lichessGame.clock.initial}+${lichessGame.clock.increment}` : '?',
            Opening: lichessGame.opening?.name || '',
            ECO: lichessGame.opening?.eco || ''
        };

        const moves = lichessGame.moves ? lichessGame.moves.split(' ') : [];

        return {
            id: lichessGame.id,
            headers,
            moves,
            pgn: this.generatePGN(headers, moves)
        };
    }

    getResult(game) {
        if (game.winner === 'white') return '1-0';
        if (game.winner === 'black') return '0-1';
        if (game.status === 'draw' || game.status === 'stalemate') return '1/2-1/2';
        return '*';
    }

    generatePGN(headers, moves) {
        let pgn = '';
        
        for (const [key, value] of Object.entries(headers)) {
            pgn += `[${key} "${value}"]\n`;
        }
        
        pgn += '\n';
        
        for (let i = 0; i < moves.length; i++) {
            if (i % 2 === 0) {
                pgn += `${Math.floor(i / 2) + 1}. `;
            }
            pgn += moves[i] + ' ';
        }
        
        pgn += headers.Result;
        
        return pgn;
    }

    async getGamePGN(gameId) {
        try {
            const response = await fetch(`https://lichess.org/game/export/${gameId}`, {
                headers: {
                    'Accept': 'application/x-chess-pgn'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch game: ${response.status}`);
            }

            return await response.text();
        } catch (error) {
            console.error('Error fetching game PGN:', error);
            return null;
        }
    }
}