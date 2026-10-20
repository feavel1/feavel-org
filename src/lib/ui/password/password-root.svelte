<script lang="ts">
	import type { Snippet } from 'svelte';
	import { PasswordState, setPassword } from './password.svelte.js';

	/**
	 * STUB — no shadcn equivalent.
	 * `bind:hidden` controls visibility; `minScore` is the zxcvbn threshold (0-4).
	 */
	let {
		hidden = $bindable(true),
		minScore = 0,
		children
	}: {
		hidden?: boolean;
		minScore?: number;
		children?: Snippet;
	} = $props();

	const state = setPassword(
		new PasswordState({
			get hidden() {
				return hidden;
			},
			get minScore() {
				return minScore;
			}
		})
	);

	$effect(() => {
		hidden = state.hidden;
	});
</script>

<div data-password-root>
	{@render children?.()}
</div>
