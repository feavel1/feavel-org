<script lang="ts">
	import Board from '#lib/games/tic-tac-toe/Board.svelte';
	import { placeMark, getWinner, getWinningLine } from '#lib/games/tic-tac-toe/game';
	import {
		createSession,
		recordRound,
		playAgain as nextRound,
		newSession as resetSession,
		type SessionState
	} from '#lib/games/tic-tac-toe/session';

	let session: SessionState = $state(createSession());
	let game = $derived(session.game);
	let winner = $derived(getWinner(game));
	let winningLine = $derived(getWinningLine(game));
	let isGameOver = $derived(winner !== null);

	function handleCellClick(index: number) {
		if (isGameOver) return;
		const nextGame = placeMark(game, index);
		session = { ...session, game: nextGame };

		// Check if this move ended the game
		if (getWinner(nextGame)) {
			session = recordRound(session);
		}
	}

	function handlePlayAgain() {
		session = nextRound(session);
	}

	function handleNewSession() {
		session = resetSession();
	}
</script>

<div class="content-wide flex flex-col items-center gap-6 py-12">
	<h1 class="text-3xl font-bold">Tic-Tac-Toe</h1>

	<!-- Score bar -->
	<div class="flex items-center gap-4 text-sm font-medium text-muted-foreground">
		<span class="text-blue-600">X: {session.scores.X}</span>
		<span class="text-muted-foreground/40">—</span>
		<span class="text-red-600">O: {session.scores.O}</span>
		<span class="text-muted-foreground/40">—</span>
		<span>Draws: {session.scores.draws}</span>
		<span class="text-muted-foreground/40">·</span>
		<span>Round {session.round}</span>
	</div>

	<!-- Status / Result -->
	<p class="text-lg font-medium text-muted-foreground" role="status">
		{session.lastResult ?? (winner === null ? `${game.currentPlayer}'s turn` : '')}
	</p>

	<Board board={game.board} {winningLine} onCellClick={handleCellClick} />

	{#if isGameOver}
		<div class="flex gap-3">
			<button
				onclick={handlePlayAgain}
				class="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
			>
				Play Again
			</button>
			<button
				onclick={handleNewSession}
				class="rounded-lg border border-border px-6 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
			>
				New Session
			</button>
		</div>
	{/if}
</div>
