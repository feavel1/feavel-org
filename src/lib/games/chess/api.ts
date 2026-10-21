import { Chess as ChessJS, SQUARES } from 'chess.js';
import type { Square, PieceSymbol, Color } from 'chess.js';
import type { Api as CgApi } from 'chessground/api';
import type { Key } from 'chessground/types';

export type { Square, PieceSymbol, Color };

export type Move = {
	from: string;
	to: string;
	color: 'w' | 'b';
	piece: string;
	captured?: string;
	promotion?: string;
	flags: string;
	san: string;
	lan: string;
	before: string;
	after: string;
	check: boolean;
	checkmate: boolean;
};

export type GameOver = {
	reason: 'checkmate' | 'stalemate' | 'repetition' | 'insufficient material' | 'fifty-move rule';
	result: 1 | 0 | 0.5;
};

export function colorToCgColor(chessjsColor: Color): 'white' | 'black' {
	return chessjsColor === 'w' ? 'white' : 'black';
}

function cjsMoveToMove(cjsMove: Record<string, unknown>): Move {
	const lastSanChar = (cjsMove.san as string).slice(-1);
	const checkmate = lastSanChar === '#';
	const check = lastSanChar === '+' || checkmate;
	return {
		from: cjsMove.from as string,
		to: cjsMove.to as string,
		color: cjsMove.color as 'w' | 'b',
		piece: cjsMove.piece as string,
		captured: cjsMove.captured as string | undefined,
		promotion: cjsMove.promotion as string | undefined,
		flags: cjsMove.flags as string,
		san: cjsMove.san as string,
		lan: cjsMove.lan as string,
		before: cjsMove.before as string,
		after: cjsMove.after as string,
		check,
		checkmate
	};
}

export type ChessCallbacks = {
	onStateChange: (api: ChessApi) => void;
	onMove: (move: Move) => void;
	onGameOver: (gameOver: GameOver) => void;
	onPromotion: (square: Square) => Promise<PieceSymbol>;
};

export class ChessApi {
	private chessJS: ChessJS;
	private gameIsOver = false;
	private initialised = false;
	private cg: CgApi;

	constructor(
		cg: CgApi,
		callbacks: ChessCallbacks,
		fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
		private _orientation: Color = 'w'
	) {
		this.cg = cg;
		this.chessJS = new ChessJS(fen);
		this.callbacks = callbacks;
		this.init();
	}

	private callbacks: ChessCallbacks;

	private async init() {
		this.load(this.chessJS.fen());
		this.initialised = true;
	}

	load(fen: string) {
		this.chessJS.load(fen);
		this._checkForGameOver();
		const cgColor = colorToCgColor(this.chessJS.turn());
		this.cg.set({
			fen,
			turnColor: cgColor,
			check: this.chessJS.inCheck(),
			lastMove: undefined,
			selected: undefined,
			movable: {
				free: false,
				color: cgColor,
				dests: this.possibleMovesDests(),
				events: {
					after: (orig, dest) => {
						this._chessgroundMoveCallback(orig as Square, dest as Square);
					}
				}
			}
		});
		this.callbacks.onStateChange(this);
	}

	private async _chessgroundMoveCallback(orig: Square, dest: Square) {
		let cjsMove: Record<string, unknown>;
		if (this._moveIsPromotion(orig, dest)) {
			const promotion = await this.callbacks.onPromotion(dest);
			cjsMove = this.chessJS.move({ from: orig, to: dest, promotion }) as unknown as Record<
				string,
				unknown
			>;
		} else {
			cjsMove = this.chessJS.move({ from: orig, to: dest }) as unknown as Record<string, unknown>;
		}
		const move = cjsMoveToMove(cjsMove);
		this._postMoveAdmin(move);
	}

	private _moveIsPromotion(orig: Square, dest: Square): boolean {
		return (
			this.chessJS.get(orig)!.type === 'p' && (dest.charAt(1) === '1' || dest.charAt(1) === '8')
		);
	}

	move(moveSanOrObj: string | { from: string; to: string; promotion?: string }) {
		if (!this.initialised) throw new Error('Called move before initialisation finished.');
		if (this.gameIsOver) throw new Error('Invalid move: Game is over.');
		const cjsMove = this.chessJS.move(moveSanOrObj) as unknown as Record<string, unknown>;
		const move = cjsMoveToMove(cjsMove);
		this.cg.move(move.from as Key, move.to as Key);
		this.cg.set({ turnColor: colorToCgColor(this.chessJS.turn()) });
		this._postMoveAdmin(move);
	}

	private _postMoveAdmin(move: Move) {
		if (move.flags.includes('e') || move.flags.includes('p')) {
			this.cg.set({ fen: this.chessJS.fen() });
		}
		if (move.check) {
			this.cg.set({ check: true });
		}
		this.callbacks.onMove(move);
		this._checkForGameOver();
		this._updateChessgroundWithPossibleMoves();
		this.callbacks.onStateChange(this);
	}

	private _updateChessgroundWithPossibleMoves() {
		const cgColor = colorToCgColor(this.chessJS.turn());
		this.cg.set({
			turnColor: cgColor,
			movable: {
				color: cgColor,
				dests: this.possibleMovesDests()
			}
		});
	}

	private _checkForGameOver() {
		if (this.chessJS.isCheckmate()) {
			const result = this.chessJS.turn() === 'w' ? 0 : 1;
			this.callbacks.onGameOver({ reason: 'checkmate', result });
			this.gameIsOver = true;
		} else if (this.chessJS.isStalemate()) {
			this.callbacks.onGameOver({ reason: 'stalemate', result: 0.5 });
			this.gameIsOver = true;
		} else if (this.chessJS.isInsufficientMaterial()) {
			this.callbacks.onGameOver({ reason: 'insufficient material', result: 0.5 });
			this.gameIsOver = true;
		} else if (this.chessJS.isThreefoldRepetition()) {
			this.callbacks.onGameOver({ reason: 'repetition', result: 0.5 });
			this.gameIsOver = true;
		} else if (this.chessJS.isDraw()) {
			this.callbacks.onGameOver({ reason: 'fifty-move rule', result: 0.5 });
			this.gameIsOver = true;
		} else {
			this.gameIsOver = false;
		}
	}

	possibleMovesDests(): Map<Key, Key[]> {
		const dests = new Map<Key, Key[]>();
		if (!this.gameIsOver) {
			SQUARES.forEach((s) => {
				const ms = this.chessJS.moves({ square: s, verbose: true });
				if (ms.length)
					dests.set(
						s as Key,
						ms.map((m) => m.to as Key)
					);
			});
		}
		return dests;
	}

	reset(): void {
		this.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
	}

	undo() {
		const cjsMove = this.chessJS.undo() as unknown as Record<string, unknown> | null;
		if (!cjsMove) return null;
		const move = cjsMoveToMove(cjsMove);
		const turnColor = colorToCgColor(this.chessJS.turn());
		this.cg.set({
			fen: this.chessJS.fen(),
			check: this.chessJS.inCheck() ? turnColor : undefined,
			turnColor,
			lastMove: undefined
		});
		this.gameIsOver = false;
		this._updateChessgroundWithPossibleMoves();
		this.callbacks.onStateChange(this);
		return move;
	}

	fen(): string {
		return this.chessJS.fen();
	}
	turn(): Color {
		return this.chessJS.turn();
	}
	moveNumber(): number {
		return this.chessJS.moveNumber();
	}
	inCheck(): boolean {
		return this.chessJS.inCheck();
	}
	history(): string[] {
		return this.chessJS.history({ verbose: false });
	}
	isGameOver(): boolean {
		return this.gameIsOver;
	}
}
