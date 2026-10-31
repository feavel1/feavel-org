<script lang="ts">
	import { resolve } from '$app/paths';
	import RevealItem from '#lib/components/RevealItem.svelte';
	import { m } from '#lib/paraglide/messages.js';
</script>

<svelte:head><title>Feavel</title></svelte:head>

<!-- HERO -->
<section class="hero">
	<RevealItem delay={0}><h1 class="hero-name">FEAVEL</h1></RevealItem>
	<RevealItem delay={150}><p class="hero-line">{m.plumb_monkey_forge()}</p></RevealItem>
	<RevealItem delay={250}><div class="hero-rule" aria-hidden="true"></div></RevealItem>
	<RevealItem delay={350}>
		<p class="hero-sub">
			{m.mellow_awful_kudu_boost()}
		</p>
	</RevealItem>
</section>

<!-- DISCIPLINES -->
<section class="disciplines">
	{#each [{ title: 'Music', desc: 'Production, mixing, mastering. Original scores and ambient soundscapes.', href: '/services#session-music' }, { title: 'Code', desc: 'Full-stack applications, API integrations, rich-text platforms.', href: '/services#session-web' }, { title: 'Translation', desc: 'Technical docs, game localization, marketing copy. EN↔RU, EN↔ZH.', href: '/services#session-translation' }] as d, i (d.title)}
		<RevealItem delay={i * 120}>
			<article class="discipline">
				<h2 class="discipline-title">{d.title}</h2>
				<p class="discipline-desc">{d.desc}</p>
				<!-- dynamic hrefs with hashes — Kit 3's resolve() only accepts known paths -->
				<a href={d.href} class="discipline-link">
					{m.wild_super_monkey_express()}
				</a>
			</article>
		</RevealItem>
	{/each}
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
	<span class="footer-text">feavel@email.com</span>
</footer>

<style>
	/* ── HERO ── */
	.hero {
		padding: 5rem 0 4rem;
		display: flex;
		flex-direction: column;
	}
	.hero-name {
		font-family: var(--font-heading);
		font-size: clamp(1.5rem, 4vw, 1.75rem);
		font-weight: 400;
		letter-spacing: 0.3em;
		color: var(--muted-foreground);
		opacity: 0.55;
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
	.hero-sub {
		font-size: 0.8125rem;
		line-height: 1.7;
		color: var(--muted-foreground);
		opacity: 0.7;
		max-width: 28rem;
		margin: 0;
	}

	/* ── DISCIPLINES ── */
	.disciplines {
		padding: 2rem 0 2rem;
		display: grid;
		grid-template-columns: 1fr;
		gap: 2.5rem;
	}
	@media (min-width: 640px) {
		.disciplines {
			grid-template-columns: repeat(3, 1fr);
			gap: 2rem;
		}
	}
	.discipline {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.discipline-title {
		font-family: var(--font-heading);
		font-size: 1rem;
		font-weight: 400;
		letter-spacing: -0.01em;
		margin: 0;
	}
	.discipline-desc {
		font-size: 0.6875rem;
		line-height: 1.65;
		color: var(--muted-foreground);
		opacity: 0.65;
		margin: 0;
	}
	.discipline-link {
		font-size: 0.625rem;
		font-weight: 400;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		text-decoration: none;
		color: var(--accent-foreground);
		margin-top: 0.25rem;
		transition: opacity 0.15s;
	}
	.discipline-link:hover {
		opacity: 0.6;
	}

	/* ── ENTRIES ── */
	.entries {
		padding: 1rem 0 3rem;
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
		opacity: 0.55;
	}
	.entry-arrow {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		opacity: 0.4;
		align-self: flex-end;
		margin-top: 0.25rem;
		transition:
			transform 0.15s,
			opacity 0.15s;
	}
	.entry:hover .entry-arrow {
		transform: translateX(2px);
		opacity: 0.7;
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
		color: var(--muted-foreground);
		opacity: 0.55;
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
		opacity: 0.3;
	}
</style>
