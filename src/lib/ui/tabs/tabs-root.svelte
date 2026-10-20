<script lang="ts">
	import type { Snippet } from 'svelte';

	/** STUB — replace with shadcn-svelte `tabs`. */
	let {
		children,
		value = $bindable(''),
		...rest
	}: {
		children?: Snippet;
		value?: string;
		onValueChange?: (v: never) => void;
		[key: string]: unknown;
	} = $props();
</script>

<div {...rest} data-tabs-root data-value={value}>
	{@render children?.()}
</div>
