<script lang="ts">
	import SearchIcon from '@lucide/svelte/icons/search';
	import { searchOverlay } from '#lib/components/navigation/controls.svelte.js';
</script>

<button
	type="button"
	class="nav-util-trigger"
	onclick={() => searchOverlay.show()}
	aria-label="Search posts (⌘K)"
	title="Search posts — ⌘K"
>
	<SearchIcon class="size-3.5" />
</button>

<style>
	.nav-util-trigger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
		color: var(--muted-foreground);
		opacity: 0.45;
		transition:
			opacity 0.2s,
			color 0.2s;
	}
	.nav-util-trigger:hover {
		opacity: 1;
		color: var(--foreground);
	}
	.nav-util-trigger:focus-visible {
		outline: 1px solid var(--ring);
		outline-offset: 4px;
	}
</style>
