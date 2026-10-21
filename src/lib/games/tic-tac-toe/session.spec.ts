import { describe, it, expect } from 'vitest';
import { createSession, recordRound, playAgain, newSession } from './session';
import { placeMark } from './game';

describe('createSession', () => {
	it('starts at round 1 with zero scores and a fresh game', () => {
		const session = createSession();
		expect(session.round).toBe(1);
		expect(session.scores).toEqual({ X: 0, O: 0, draws: 0 });
		expect(session.game.currentPlayer).toBe('X');
		expect(session.lastResult).toBeNull();
	});
});

describe('recordRound', () => {
	it('does nothing if the game is not over', () => {
		const session = createSession();
		const result = recordRound(session);
		expect(result.scores).toEqual({ X: 0, O: 0, draws: 0 });
		expect(result.lastResult).toBeNull();
	});

	it('increments X score when X wins', () => {
		let session = createSession();
		// X wins row 0
		session = { ...session, game: placeMark(session.game, 0) };
		session = { ...session, game: placeMark(session.game, 3) };
		session = { ...session, game: placeMark(session.game, 1) };
		session = { ...session, game: placeMark(session.game, 4) };
		session = { ...session, game: placeMark(session.game, 2) };
		const result = recordRound(session);
		expect(result.scores.X).toBe(1);
		expect(result.scores.O).toBe(0);
		expect(result.scores.draws).toBe(0);
		expect(result.lastResult).toBe('X wins!');
	});

	it('increments O score when O wins', () => {
		let session = createSession();
		session = { ...session, game: placeMark(session.game, 0) };
		session = { ...session, game: placeMark(session.game, 1) };
		session = { ...session, game: placeMark(session.game, 8) };
		session = { ...session, game: placeMark(session.game, 4) };
		session = { ...session, game: placeMark(session.game, 2) };
		session = { ...session, game: placeMark(session.game, 7) };
		const result = recordRound(session);
		expect(result.scores.O).toBe(1);
		expect(result.lastResult).toBe('O wins!');
	});

	it('increments draws on a draw', () => {
		let session = createSession();
		session = { ...session, game: placeMark(session.game, 0) };
		session = { ...session, game: placeMark(session.game, 1) };
		session = { ...session, game: placeMark(session.game, 2) };
		session = { ...session, game: placeMark(session.game, 4) };
		session = { ...session, game: placeMark(session.game, 3) };
		session = { ...session, game: placeMark(session.game, 5) };
		session = { ...session, game: placeMark(session.game, 7) };
		session = { ...session, game: placeMark(session.game, 6) };
		session = { ...session, game: placeMark(session.game, 8) };
		const result = recordRound(session);
		expect(result.scores.draws).toBe(1);
		expect(result.lastResult).toBe("It's a draw!");
	});
});

describe('playAgain', () => {
	it('increments the round number and starts a fresh game', () => {
		let session = createSession();
		session = { ...session, round: 3 };
		const next = playAgain(session);
		expect(next.round).toBe(4);
		expect(next.game.currentPlayer).toBe('X');
		expect(next.game.board.every((c) => c === null)).toBe(true);
		expect(next.lastResult).toBeNull();
	});
});

describe('newSession', () => {
	it('resets everything to zero', () => {
		let session = createSession();
		session = { ...session, round: 5, scores: { X: 3, O: 2, draws: 1 } };
		const fresh = newSession();
		expect(fresh.round).toBe(1);
		expect(fresh.scores).toEqual({ X: 0, O: 0, draws: 0 });
	});
});
