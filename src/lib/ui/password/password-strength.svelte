<script lang="ts">
	import { getPassword } from './password.svelte.js';

	/** STUB — renders zxcvbn score (0-4). */
	const state = getPassword();
	const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
</script>

<p data-password-strength class="text-xs">
	{labels[state.strength.score] ?? '—'}
</p>
