<script lang="ts">
	import { resolve } from '$app/paths';
	import { Swords, Circle } from '@lucide/svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
</script>

<div class="content-wide flex flex-col items-center gap-6">
	<PageHeader title="Games" description="Pick a game to play">
		<Swords size={28} class="text-primary" />
	</PageHeader>

	<div class="flex w-full flex-col gap-3">
		<a
			href={resolve('/games/tic-tac-toe')}
			class="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
		>
			<Circle size={24} class="text-primary" />
			<div class="flex flex-col">
				<span class="text-sm font-semibold">Tic-Tac-Toe</span>
				<span class="text-xs text-muted-foreground">Two-player hot-seat. X always goes first.</span>
			</div>
		</a>

		<a
			href={resolve('/games/chess')}
			class="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
		>
			<Swords size={24} class="text-primary" />
			<div class="flex flex-col">
				<span class="text-sm font-semibold">Chess</span>
				<span class="text-xs text-muted-foreground">Two-player hot-seat with full rules.</span>
			</div>
		</a>
	</div>
</div>
