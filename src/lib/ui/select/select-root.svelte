<script lang="ts">
	import type { Snippet } from 'svelte';

	/** STUB — replace with shadcn-svelte `select`. */
	let {
		children,
		open = $bindable(false),
		value = $bindable(),
		...rest
	}: {
		children?: Snippet;
		open?: boolean;
		value?: unknown;
		onValueChange?: (v: never) => void;
		onSelect?: (e: { value: never }) => void;
		[key: string]: unknown;
	} = $props();
</script>

<div {...rest} data-select-root data-open={open} data-value={value}>
	{#if open}
		{@render children?.()}
	{/if}
</div>
