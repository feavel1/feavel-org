export type Player = 'X' | 'O';
export type Cell = Player | null;
export type Board = Cell[]; // flat 9-element array, index = row * 3 + col

export interface GameState {
	board: Board;
	currentPlayer: Player;
}

export function createGame(): GameState {
	return {
		board: Array(9).fill(null),
		currentPlayer: 'X'
	};
}

const WIN_LINES: [number, number, number][] = [
	[0, 1, 2],
	[3, 4, 5],
	[6, 7, 8], // rows
	[0, 3, 6],
	[1, 4, 7],
	[2, 5, 8], // cols
	[0, 4, 8],
	[2, 4, 6] // diagonals
];

export function placeMark(state: GameState, index: number): GameState {
	if (state.board[index] !== null) {
		return state;
	}
	const nextBoard = [...state.board];
	nextBoard[index] = state.currentPlayer;
	return {
		board: nextBoard,
		currentPlayer: state.currentPlayer === 'X' ? 'O' : 'X'
	};
}

export function getWinningLine(state: GameState): [number, number, number] | null {
	for (const line of WIN_LINES) {
		const [a, b, c] = line;
		if (state.board[a] && state.board[a] === state.board[b] && state.board[a] === state.board[c]) {
			return line;
		}
	}
	return null;
}

export function getWinner(state: GameState): Player | 'draw' | null {
	const line = getWinningLine(state);
	if (line) {
		return state.board[line[0]] as Player;
	}
	return state.board.every((cell) => cell !== null) ? 'draw' : null;
}
