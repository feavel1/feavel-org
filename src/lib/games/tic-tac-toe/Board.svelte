<script lang="ts">
	import type { Board as BoardType, Cell } from './game';

	let {
		board,
		winningLine,
		onCellClick
	}: {
		board: BoardType;
		winningLine: [number, number, number] | null;
		onCellClick?: (index: number) => void;
	} = $props();

	function isWinningCell(index: number): boolean {
		if (!winningLine) return false;
		return winningLine.includes(index as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8);
	}

	function cellColor(cell: Cell): string {
		if (cell === 'X') return 'text-blue-600';
		if (cell === 'O') return 'text-red-600';
		return '';
	}
</script>

<div class="mx-auto grid w-72 grid-cols-3 gap-2" role="grid" aria-label="Tic-tac-toe board">
	{#each board as cell, i (i)}
		<button
			role="gridcell"
			onclick={() => onCellClick?.(i)}
			class="flex aspect-square items-center justify-center rounded-lg border-2 text-4xl font-bold transition-colors
				{cell ? 'cursor-default' : 'cursor-pointer hover:bg-muted'}
				{isWinningCell(i) ? 'border-green-500 bg-green-200' : 'border-border bg-card'}
				{cellColor(cell)}"
			{...{ 'data-cell': i }}
		>
			{cell ?? ''}
		</button>
	{/each}
</div>
