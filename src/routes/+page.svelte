<script lang="ts">
	import { resolve } from '$app/paths';
	import RevealItem from '#lib/components/RevealItem.svelte';
	import { searchOverlay } from '#lib/components/navigation/controls.svelte.js';
	import { getDisciplines, getReadingPrompts, type DisciplineId } from '#lib/home/copy';
	import { useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api';
	import { m } from '#lib/paraglide/messages.js';

	// ── The bench ──────────────────────────────────────────────────────────
	// One authored moment: the visitor names what they came for, and the hero
	// answers in that register. Copy and hrefs live in #lib/home/copy so every
	// string is a paraglide message; this page only owns the selection state.
	let bench = $state<DisciplineId | null>(null);

	// Resolved at render time, not at module scope — switching locale must
	// re-render the labels without a page reload.
	const disciplines = $derived(getDisciplines());

	// Prompts come from the categories actually published, busiest first — never a
	// hardcoded taxonomy. Empty until the query resolves, which is fine: the
	// "everything" prompt is appended unconditionally.
	const facetsQuery = useQuery(api.posts.queries.listPostFacets);
	const prompts = $derived(getReadingPrompts(facetsQuery.data?.categories ?? []));

	// Roving focus order for the segmented control: one tab stop, arrow keys move.
	let benchButtons: HTMLButtonElement[] = [];
	function onBenchKey(e: KeyboardEvent, i: number) {
		const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
		if (!keys.includes(e.key)) return;
		e.preventDefault();
		const next =
			e.key === 'Home'
				? 0
				: e.key === 'End'
					? disciplines.length - 1
					: e.key === 'ArrowRight' || e.key === 'ArrowDown'
						? (i + 1) % disciplines.length
						: (i - 1 + disciplines.length) % disciplines.length;
		bench = disciplines[next].id;
		benchButtons[next]?.focus();
	}

	// Summon the existing ⌘K overlay. The page used to render its own search box,
	// but /posts has no free-text query — a form there would promise a search it
	// cannot run. The overlay is the one search that actually works.
	function openSearch() {
		searchOverlay.show();
	}
</script>

<svelte:head><title>{m.home_meta_title()}</title></svelte:head>

<!-- HERO -->
<section class="hero">
	<RevealItem delay={0}><h1 class="hero-name">{m.home_hero_title()}</h1></RevealItem>
	<RevealItem delay={150}><p class="hero-line">{m.plumb_monkey_forge()}</p></RevealItem>
	<RevealItem delay={250}><div class="hero-rule" aria-hidden="true"></div></RevealItem>
	<RevealItem delay={350}>
		<p class="hero-sub">{m.home_bench_hint()}</p>
	</RevealItem>
</section>

<!-- THE BENCH -->
<section class="bench" aria-labelledby="bench-label">
	<RevealItem delay={0}>
		<p class="bench-label" id="bench-label">{m.home_bench_label()}</p>
	</RevealItem>
	<RevealItem delay={80}>
		<div class="bench-seg" role="radiogroup" aria-labelledby="bench-label">
			{#each disciplines as d, i (d.id)}
				<button
					type="button"
					role="radio"
					aria-checked={bench === d.id}
					tabindex={bench === d.id || (bench === null && i === 0) ? 0 : -1}
					class="bench-opt"
					class:bench-opt--dim={bench !== null && bench !== d.id}
					bind:this={benchButtons[i]}
					onclick={() => (bench = bench === d.id ? null : d.id)}
					onkeydown={(e) => onBenchKey(e, i)}
				>
					{d.label}
				</button>
			{/each}
		</div>
	</RevealItem>

	{#each disciplines as d (d.id)}
		{#if bench === d.id}
			<article class="bench-panel">
				<p class="bench-question">{d.question}</p>
				<p class="bench-fluent">{d.fluent}</p>
				<p class="bench-proof">{d.proof}</p>
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- d.href is a resolved path plus an anchor -->
				<a href={d.href} class="bench-cta">{d.cta} <span aria-hidden="true">→</span></a>
			</article>
		{:else}
			<!-- Kept in the DOM at zero height so the row never collapses under the
			     visitor's cursor; the visible option is a stable target. -->
			<article class="bench-panel bench-panel--stowed" inert aria-hidden="true">
				<p class="bench-question">{d.question}</p>
				<p class="bench-fluent">{d.fluent}</p>
				<p class="bench-proof">{d.proof}</p>
			</article>
		{/if}
	{/each}
</section>

<!-- ASK -->
<section class="ask">
	<RevealItem delay={0}>
		<h2 class="ask-heading">{m.home_ask_title()}</h2>
	</RevealItem>
	<RevealItem delay={80}>
		<ul class="prompts">
			{#each prompts as p (p.href)}
				<li>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- p.href is a resolved path plus a query string -->
					<a href={p.href} class="prompt">
						<span class="prompt-ask">{p.ask}</span>
						<span class="prompt-hint">{p.hint}</span>
					</a>
				</li>
			{/each}
		</ul>
	</RevealItem>
	<RevealItem delay={160}>
		<button type="button" class="ask-k" onclick={openSearch}>
			<span class="ask-k-keys">⌘K</span>
			<span>{m.home_ask_k()}</span>
		</button>
	</RevealItem>
</section>

<!-- ENTRIES -->
<section class="entries">
	<RevealItem delay={0}>
		<a href={resolve('/posts')} class="entry">
			<span class="entry-label">{m.zealous_dolphin_twirl()}</span>
			<span class="entry-desc">{m.sharp_snipe_twist()}</span>
			<span class="entry-arrow">→</span>
		</a>
	</RevealItem>
	<RevealItem delay={120}>
		<a href={resolve('/games')} class="entry">
			<span class="entry-label">{m.ready_mole_swing()}</span>
			<span class="entry-desc">{m.wild_trout_dip()}</span>
			<span class="entry-arrow">→</span>
		</a>
	</RevealItem>
</section>

<!-- CLOSING -->
<section class="closing">
	<RevealItem delay={0}>
		<blockquote class="closing-text">
			{m.trim_yak_spray()}
			<span>{m.brisk_mink_mesh()}</span>
		</blockquote>
	</RevealItem>
	<RevealItem delay={200}>
		<a href={resolve('/services#contact')} class="closing-cta">{m.fierce_roo_ramp()}</a>
	</RevealItem>
</section>

<footer class="footer">
	<span class="footer-text">{m.home_footer_email()}</span>
</footer>

<style>
	/* ── HERO ── */
	.hero {
		padding: 5rem 0 3rem;
		display: flex;
		flex-direction: column;
	}
	.hero-name {
		font-family: var(--font-heading);
		font-size: clamp(1.5rem, 4vw, 1.75rem);
		font-weight: 400;
		letter-spacing: 0.3em;
		color: var(--muted-foreground);
		margin: 0;
		line-height: 1;
	}
	.hero-line {
		font-size: 0.75rem;
		font-weight: 350;
		letter-spacing: 0.05em;
		color: var(--muted-foreground);
		margin: 1.25rem 0 0;
	}
	.hero-rule {
		width: 28%;
		height: 1px;
		background: var(--border);
		margin: 2rem 0 1.5rem;
	}
	/* Static hint, full contrast. It no longer changes on selection — the
	   chosen discipline's question now leads its own panel. */
	.hero-sub {
		font-family: var(--font-heading);
		font-size: 1.0625rem;
		line-height: 1.5;
		letter-spacing: -0.01em;
		color: var(--foreground);
		max-width: 32rem;
		margin: 0;
	}

	/* ── THE BENCH ── */
	.bench {
		padding: 0 0 1rem;
	}
	.bench-label {
		font-size: 0.6875rem;
		font-weight: 400;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted-foreground);
		margin: 0 0 0.875rem;
	}
	.bench-seg {
		display: flex;
		gap: 0;
		border: 1px solid var(--border);
		width: fit-content;
		max-width: 100%;
	}
	.bench-opt {
		appearance: none;
		background: none;
		border: 0;
		border-right: 1px solid var(--border);
		padding: 0.625rem 1.125rem;
		font-family: inherit;
		font-size: 0.6875rem;
		font-weight: 400;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted-foreground);
		cursor: pointer;
		transition:
			color 0.18s,
			background-color 0.18s,
			opacity 0.18s;
	}
	.bench-opt:last-child {
		border-right: 0;
	}
	.bench-opt:hover {
		color: var(--foreground);
		background: var(--accent);
	}
	.bench-opt[aria-checked='true'] {
		color: var(--primary-foreground);
		background: var(--primary);
	}
	.bench-opt--dim {
		opacity: 0.5;
	}
	.bench-opt--dim:hover {
		opacity: 1;
	}
	.bench-opt:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: -2px;
	}

	.bench-panel {
		max-width: 34rem;
		padding: 1.5rem 0 0;
	}
	/* stowed panels keep the section height stable while switching */
	.bench-panel--stowed {
		height: 0;
		padding: 0;
		overflow: hidden;
		visibility: hidden;
	}
	/* The panel's lead. It gets the heading treatment and full contrast because
	   it is the line the visitor reads first after choosing. */
	.bench-question {
		font-family: var(--font-heading);
		font-size: 1.0625rem;
		font-weight: 400;
		letter-spacing: -0.01em;
		line-height: 1.45;
		color: var(--foreground);
		margin: 0 0 0.75rem;
	}
	.bench-fluent {
		font-size: 0.8125rem;
		line-height: 1.7;
		color: var(--foreground);
		margin: 0;
	}
	.bench-proof {
		font-size: 0.75rem;
		line-height: 1.6;
		color: var(--muted-foreground);
		margin: 0.625rem 0 0;
	}
	.bench-cta {
		display: inline-block;
		margin-top: 1rem;
		font-size: 0.625rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--foreground);
		text-decoration: none;
		border-bottom: 1px solid var(--border);
		padding-bottom: 0.125rem;
		transition:
			border-color 0.2s,
			gap 0.2s;
	}
	.bench-cta:hover {
		border-color: var(--foreground);
	}
	.bench-cta span {
		display: inline-block;
		transition: transform 0.2s;
	}
	.bench-cta:hover span {
		transform: translateX(2px);
	}

	/* ── ASK ── */
	.ask {
		padding: 3rem 0 1rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	.ask-heading {
		font-family: var(--font-heading);
		font-size: 1.25rem;
		font-weight: 400;
		letter-spacing: -0.01em;
		margin: 0;
	}
	.ask-k:focus-visible,
	.bench-cta:focus-visible,
	.prompt:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 3px;
	}

	.prompts {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: 1fr;
		gap: 0;
		border-top: 1px solid var(--border);
	}
	@media (min-width: 640px) {
		.prompts {
			grid-template-columns: 1fr 1fr;
			column-gap: 2rem;
		}
	}
	.prompt {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding: 0.875rem 0;
		border-bottom: 1px solid var(--border);
		text-decoration: none;
		color: var(--foreground);
		/* The nudge is a transform, not a padding change: padding animates layout. */
		transition: transform 0.2s ease-out;
	}
	.prompt:hover {
		transform: translateX(0.375rem);
	}
	.prompt-ask {
		font-size: 0.8125rem;
		line-height: 1.5;
		font-weight: 350;
	}
	.prompt:hover .prompt-ask {
		color: var(--foreground);
	}
	.prompt-hint {
		font-size: 0.625rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted-foreground);
	}
	.ask-k {
		appearance: none;
		background: none;
		border: 0;
		padding: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-family: inherit;
		font-size: 0.6875rem;
		color: var(--muted-foreground);
		cursor: pointer;
		width: fit-content;
		transition: color 0.2s;
	}
	.ask-k:hover {
		color: var(--foreground);
	}
	.ask-k-keys {
		border: 1px solid var(--border);
		padding: 0.125rem 0.3125rem;
		font-size: 0.625rem;
		letter-spacing: 0.04em;
	}

	/* ── ENTRIES ── */
	.entries {
		padding: 2rem 0 3rem;
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.75rem;
	}
	@media (min-width: 640px) {
		.entries {
			grid-template-columns: 1fr 1fr;
		}
	}
	.entry {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding: 1.25rem;
		text-decoration: none;
		border: 1px solid var(--border);
		transition:
			border-color 0.2s,
			transform 0.15s;
	}
	.entry:hover {
		border-color: var(--muted-foreground);
		transform: translateY(-1px);
	}
	.entry-label {
		font-size: 0.75rem;
		font-weight: 400;
		letter-spacing: -0.01em;
		color: var(--foreground);
	}
	.entry-desc {
		font-size: 0.6875rem;
		line-height: 1.5;
		color: var(--muted-foreground);
	}
	.entry-arrow {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		align-self: flex-end;
		margin-top: 0.25rem;
		transition:
			transform 0.15s,
			opacity 0.15s;
	}
	.entry:hover .entry-arrow {
		transform: translateX(2px);
	}

	/* ── CLOSING ── */
	.closing {
		padding: 4rem 0 3rem;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 2rem;
	}
	.closing-text {
		margin: 0;
		max-width: 22rem;
		font-family: var(--font-heading);
		font-size: 1rem;
		font-weight: 400;
		letter-spacing: -0.01em;
		line-height: 1.5;
		color: var(--foreground);
	}
	.closing-text span {
		display: block;
		color: var(--muted-foreground);
	}
	.closing-cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 2.25rem;
		padding: 0 1.25rem;
		font-size: 0.6875rem;
		font-weight: 400;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		text-decoration: none;
		color: var(--primary-foreground);
		background: var(--primary);
		transition: opacity 0.15s;
	}
	.closing-cta:hover {
		opacity: 0.85;
	}

	/* ── FOOTER ── */
	.footer {
		display: flex;
		justify-content: center;
		padding: 2rem 0 2rem;
	}
	.footer-text {
		font-size: 0.5625rem;
		font-weight: 350;
		letter-spacing: 0.03em;
		color: var(--muted-foreground);
	}

	@media (prefers-reduced-motion: reduce) {
		.hero-sub,
		.bench-opt,
		.prompt,
		.entry,
		.bench-cta span {
			transition: none;
		}
		.prompt:hover,
		.entry:hover,
		.bench-cta:hover span {
			transform: none;
		}
	}
</style>
