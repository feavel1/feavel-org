<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getPassword } from './password.svelte.js';

	/** STUB — show/hide toggle. */
	let { children }: { children?: Snippet } = $props();
	const state = getPassword();
</script>

<button
	type="button"
	data-password-toggle
	aria-label={state.hidden ? 'Show password' : 'Hide password'}
	onclick={() => (state.hidden = !state.hidden)}
>
	{@render children?.()}
</button>
