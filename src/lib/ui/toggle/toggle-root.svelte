<script lang="ts">
	import type { Snippet } from 'svelte';

	/** STUB — replace with shadcn-svelte `toggle`. */
	let {
		pressed = $bindable(false),
		children,
		...rest
	}: {
		pressed?: boolean;
		onPressedChange?: (p: boolean) => void;
		children?: Snippet;
		[key: string]: unknown;
	} = $props();
</script>

<button type="button" aria-pressed={pressed} onclick={() => (pressed = !pressed)} {...rest}>
	{@render children?.()}
</button>
