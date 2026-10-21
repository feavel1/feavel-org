import { describe, it, expect } from 'vitest';
import { createGame, placeMark, getWinner, getWinningLine } from './game';

describe('createGame', () => {
	it('returns a board with 9 null cells and X as the current player', () => {
		const game = createGame();
		expect(game.board).toEqual([null, null, null, null, null, null, null, null, null]);
		expect(game.currentPlayer).toBe('X');
	});
});

describe('placeMark', () => {
	it('fills the cell with the current player mark and switches turn', () => {
		const game = createGame();
		const next = placeMark(game, 4);
		expect(next.board[4]).toBe('X');
		expect(next.currentPlayer).toBe('O');
	});

	it('does not mutate the previous game state', () => {
		const game = createGame();
		const next = placeMark(game, 4);
		expect(game.board[4]).toBeNull();
		expect(next.board[4]).toBe('X');
	});

	it('does nothing when the cell is already filled', () => {
		const game = createGame();
		const first = placeMark(game, 4);
		const second = placeMark(first, 4);
		expect(second.board[4]).toBe('X');
		expect(second.currentPlayer).toBe('O');
	});

	it('switches turns correctly through multiple moves', () => {
		let game = createGame();
		game = placeMark(game, 0);
		expect(game.currentPlayer).toBe('O');
		game = placeMark(game, 1);
		expect(game.currentPlayer).toBe('X');
		game = placeMark(game, 2);
		expect(game.currentPlayer).toBe('O');
	});
});

describe('getWinner', () => {
	it('returns null when the game is in progress', () => {
		const game = createGame();
		expect(getWinner(game)).toBeNull();
	});

	it('returns null with only one move', () => {
		const game = placeMark(createGame(), 0);
		expect(getWinner(game)).toBeNull();
	});

	it('detects a row win for X', () => {
		let game = createGame();
		game = placeMark(game, 0);
		game = placeMark(game, 3);
		game = placeMark(game, 1);
		game = placeMark(game, 4);
		game = placeMark(game, 2);
		expect(getWinner(game)).toBe('X');
	});

	it('detects a column win for O', () => {
		let game = createGame();
		game = placeMark(game, 0);
		game = placeMark(game, 1);
		game = placeMark(game, 8);
		game = placeMark(game, 4);
		game = placeMark(game, 2);
		game = placeMark(game, 7);
		expect(getWinner(game)).toBe('O');
	});

	it('detects a diagonal win for X (top-left to bottom-right)', () => {
		let game = createGame();
		game = placeMark(game, 0);
		game = placeMark(game, 1);
		game = placeMark(game, 4);
		game = placeMark(game, 2);
		game = placeMark(game, 8);
		expect(getWinner(game)).toBe('X');
	});

	it('detects the other diagonal win for O', () => {
		let game = createGame();
		game = placeMark(game, 0);
		game = placeMark(game, 2);
		game = placeMark(game, 1);
		game = placeMark(game, 4);
		game = placeMark(game, 3);
		game = placeMark(game, 6);
		expect(getWinner(game)).toBe('O');
	});

	it('detects a draw', () => {
		let game = createGame();
		game = placeMark(game, 0);
		game = placeMark(game, 1);
		game = placeMark(game, 2);
		game = placeMark(game, 4);
		game = placeMark(game, 3);
		game = placeMark(game, 5);
		game = placeMark(game, 7);
		game = placeMark(game, 6);
		game = placeMark(game, 8);
		expect(getWinner(game)).toBe('draw');
	});
});

describe('getWinningLine', () => {
	it('returns null when game is in progress', () => {
		const game = createGame();
		expect(getWinningLine(game)).toBeNull();
	});

	it('returns the three indices of a row win for X', () => {
		let game = createGame();
		game = placeMark(game, 0);
		game = placeMark(game, 3);
		game = placeMark(game, 1);
		game = placeMark(game, 4);
		game = placeMark(game, 2);
		expect(getWinningLine(game)).toEqual([0, 1, 2]);
	});

	it('returns the three indices of a column win for O', () => {
		let game = createGame();
		game = placeMark(game, 0);
		game = placeMark(game, 1);
		game = placeMark(game, 8);
		game = placeMark(game, 4);
		game = placeMark(game, 2);
		game = placeMark(game, 7);
		expect(getWinningLine(game)).toEqual([1, 4, 7]);
	});

	it('returns the three indices of a diagonal win', () => {
		let game = createGame();
		game = placeMark(game, 0);
		game = placeMark(game, 1);
		game = placeMark(game, 4);
		game = placeMark(game, 2);
		game = placeMark(game, 8);
		expect(getWinningLine(game)).toEqual([0, 4, 8]);
	});

	it('returns null for a draw', () => {
		let game = createGame();
		game = placeMark(game, 0);
		game = placeMark(game, 1);
		game = placeMark(game, 2);
		game = placeMark(game, 4);
		game = placeMark(game, 3);
		game = placeMark(game, 5);
		game = placeMark(game, 7);
		game = placeMark(game, 6);
		game = placeMark(game, 8);
		expect(getWinningLine(game)).toBeNull();
	});
});
