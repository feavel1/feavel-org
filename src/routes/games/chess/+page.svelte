<script lang="ts">
	import { Chessground } from 'svelte5-chessground';
	import 'svelte5-chessground/style.css';
	import type { Api as CgApi } from 'chessground/api';
	import type { Square } from 'chess.js';
	import { Button } from '#lib/ui/button';
	import {
		ChessApi,
		colorToCgColor,
		type Move,
		type GameOver,
		type PieceSymbol
	} from '#lib/games/chess/api';
	import { RotateCcw, RefreshCw } from '@lucide/svelte';

	let cgApi = $state<CgApi>();
	let chessApi = $state<ChessApi>();
	let fen = $state('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
	let turn = $state<'w' | 'b'>('w');
	let inCheck = $state(false);
	let history: string[] = $state([]);
	let isGameOver = $state(false);

	// Session state
	let scores = $state({ white: 0, black: 0, draws: 0 });
	let round = $state(1);
	let lastGameOver = $state<GameOver | null>(null);

	// Init ChessApi once cgApi is bound
	$effect(() => {
		if (!cgApi || chessApi) return;

		chessApi = new ChessApi(cgApi, {
			onStateChange: (api) => {
				fen = api.fen();
				turn = api.turn();
				inCheck = api.inCheck();
				history = api.history();
				isGameOver = api.isGameOver();
			},
			onMove: (_move: Move) => {
				lastGameOver = null;
			},
			onGameOver: (go: GameOver) => {
				lastGameOver = go;
				if (go.result === 1) scores = { ...scores, white: scores.white + 1 };
				else if (go.result === 0) scores = { ...scores, black: scores.black + 1 };
				else scores = { ...scores, draws: scores.draws + 1 };
			},
			onPromotion: async (_square: Square): Promise<PieceSymbol> => {
				return 'q';
			}
		});
	});

	function handleNewGame() {
		if (!chessApi || !isGameOver) return;
		chessApi.reset();
		round++;
		lastGameOver = null;
	}

	function handleResetSession() {
		if (!chessApi) return;
		scores = { white: 0, black: 0, draws: 0 };
		round = 1;
		lastGameOver = null;
		chessApi.reset();
	}

	const turnLabel = $derived(turn === 'w' ? 'White' : 'Black');
</script>

<div class="content-wide mx-auto flex w-full flex-col items-center gap-4 px-4 py-6">
	<h1 class="text-xl font-bold">Chess</h1>

	<div class="flex items-center gap-3 text-sm">
		<span class="rounded-md border border-border px-2 py-1 font-medium">Round {round}</span>
		<span class="text-muted-foreground">
			{isGameOver ? 'Game over' : `${turnLabel}'s turn${inCheck ? ' — check!' : ''}`}
		</span>
	</div>

	<div class="w-full rounded-lg border border-border bg-card p-2 shadow-sm">
		<Chessground bind:api={cgApi} {fen} orientation="white" />
	</div>

	{#if lastGameOver}
		<p class="text-sm font-semibold">
			{lastGameOver.reason === 'checkmate'
				? `${lastGameOver.result === 1 ? 'White' : 'Black'} wins by checkmate!`
				: `Draw — ${lastGameOver.reason}`}
		</p>
	{/if}

	<div class="flex items-center gap-4 text-sm">
		<span>White: <strong>{scores.white}</strong></span>
		<span class="text-muted-foreground">|</span>
		<span>Black: <strong>{scores.black}</strong></span>
		<span class="text-muted-foreground">|</span>
		<span>Draws: <strong>{scores.draws}</strong></span>
	</div>

	<div class="flex gap-2">
		<Button onclick={handleNewGame} disabled={!isGameOver} size="sm">
			<RefreshCw />
			New game
		</Button>
		<Button onclick={handleResetSession} variant="outline" size="sm">
			<RotateCcw />
			Reset session
		</Button>
	</div>

	{#if history.length > 0}
		<div class="w-full max-w-sm">
			<p class="mb-1 text-xs text-muted-foreground">Moves</p>
			<div
				class="flex flex-wrap gap-1 rounded-md border border-border bg-card p-2 font-mono text-xs"
			>
				{#each history as move, i}
					<span class={i % 2 === 0 ? 'text-foreground' : 'text-muted-foreground'}>
						{i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ''}{move}
					</span>
				{/each}
			</div>
		</div>
	{/if}
</div>
