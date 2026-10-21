import { createGame, getWinner, type GameState } from './game';

export interface Scores {
	X: number;
	O: number;
	draws: number;
}

export interface SessionState {
	round: number;
	scores: Scores;
	game: GameState;
	lastResult: string | null; // e.g. "X wins!", "O wins!", "Draw!"
}

export function createSession(): SessionState {
	return {
		round: 1,
		scores: { X: 0, O: 0, draws: 0 },
		game: createGame(),
		lastResult: null
	};
}

export function recordRound(session: SessionState): SessionState {
	const winner = getWinner(session.game);
	if (!winner) return session;

	const nextScores = { ...session.scores };
	let lastResult: string;

	if (winner === 'draw') {
		nextScores.draws += 1;
		lastResult = "It's a draw!";
	} else {
		nextScores[winner] += 1;
		lastResult = `${winner} wins!`;
	}

	return {
		...session,
		scores: nextScores,
		lastResult
	};
}

export function playAgain(session: SessionState): SessionState {
	return {
		...session,
		round: session.round + 1,
		game: createGame(),
		lastResult: null
	};
}

export function newSession(): SessionState {
	return createSession();
}
