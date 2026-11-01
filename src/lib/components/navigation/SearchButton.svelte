<script lang="ts">
	import SearchIcon from '@lucide/svelte/icons/search';
	import { searchOverlay } from '#lib/components/navigation/controls.svelte.js';
</script>

<!-- ponytail: `nav-util` is a Tailwind utility defined in app.css, so Svelte
     cannot see it used here — see the :global note in NavControls. -->
<button
	type="button"
	class="nav-util nav-util-icon"
	onclick={() => searchOverlay.show()}
	aria-label="Search posts (⌘K)"
	title="Search posts — ⌘K"
>
	<SearchIcon class="size-3.5" />
</button>
