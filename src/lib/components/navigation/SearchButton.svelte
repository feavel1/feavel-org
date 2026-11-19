<script lang="ts">
	import SearchIcon from '@lucide/svelte/icons/search';
	import { searchOverlay } from '#lib/components/navigation/controls.svelte.js';
	import { m } from '#lib/paraglide/messages.js';
</script>

<!-- ponytail: `nav-util` is a Tailwind utility defined in app.css, so Svelte
     cannot see it used here — see the :global note in NavControls. -->
<button
	type="button"
	class="nav-util nav-util-icon"
	onclick={() => searchOverlay.show()}
	aria-label={m.nav_search_posts()}
	title="{m.nav_search_posts()} — ⌘K"
>
	<SearchIcon class="size-3.5" />
</button>
