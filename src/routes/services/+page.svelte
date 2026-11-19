<script lang="ts">
	import SectionHead from '#lib/components/SectionHead.svelte';
	import RevealItem from '#lib/components/RevealItem.svelte';
	import Portfolio from '#lib/services/Portfolio.svelte';
	import ContactForm from '#lib/services/ContactForm.svelte';
	import { getServices, getPortfolioEntries } from '#lib/services/catalog-i18n';
	import { m } from '#lib/paraglide/messages.js';

	// Resolved per render: the copy follows the active locale.
	const services = $derived(getServices());
	const portfolioEntries = $derived(getPortfolioEntries());
</script>

<svelte:head><title>{m.svc_meta_title()}</title></svelte:head>

<!-- HERO -->
<section class="hero">
	<RevealItem delay={0}><h1 class="hero-heading">{m.wild_super_monkey_express()}</h1></RevealItem>
	<RevealItem delay={150}>
		<p class="hero-desc">
			{m.mellow_awful_kudu_boost()}
		</p>
	</RevealItem>
	<RevealItem delay={250}><div class="hero-rule" aria-hidden="true"></div></RevealItem>
</section>

<!-- SERVICES -->
<section class="services-list">
	{#each services as s, i (s.id)}
		<RevealItem delay={i * 80}>
			<div id="session-{s.id}" class="slab">
				<span class="slab-num">{String(i + 1).padStart(2, '0')}</span>
				<div class="slab-body">
					<h2 class="slab-title">{s.title}</h2>
					<p class="slab-desc">{s.deliverable}</p>
					<div class="slab-meta">
						<div class="slab-meta-item">
							<span class="slab-meta-label">{m.svc_slab_scope()}</span><span class="slab-meta-value"
								>{s.scope}</span
							>
						</div>
						<div class="slab-meta-item">
							<span class="slab-meta-label">{m.svc_slab_timeline()}</span><span
								class="slab-meta-value">{s.timeline}</span
							>
						</div>
					</div>
				</div>
				<div class="slab-price">
					<span class="slab-price-from">{m.svc_slab_starting_at()}</span>
					<span class="slab-price-amount">{s.startingPrice}</span>
					<a href="#contact" class="slab-cta">{m.svc_slab_cta()} →</a>
				</div>
			</div>
		</RevealItem>
	{/each}
</section>

<!-- PORTFOLIO -->
<section class="section" id="portfolio">
	<RevealItem><SectionHead label={m.svc_section_work()} /></RevealItem>
	<Portfolio entries={portfolioEntries} />
</section>

<!-- ABOUT -->
<section class="section">
	<RevealItem><SectionHead label={m.svc_section_about()} /></RevealItem>
	<RevealItem delay={100}>
		<blockquote class="about-quote">
			{m.svc_about_quote()}
		</blockquote>
	</RevealItem>
	<RevealItem delay={200}>
		<div class="about-bio">
			<p>{m.svc_about_bio_1()}</p>
			<p>{m.svc_about_bio_2()}</p>
		</div>
	</RevealItem>
	<RevealItem delay={300}>
		<div class="about-facts">
			<div class="about-fact">
				<span class="about-fact-num">10+</span><span class="about-fact-label"
					>{m.svc_fact_years_music()}</span
				>
			</div>
			<div class="about-fact">
				<span class="about-fact-num">3</span><span class="about-fact-label"
					>{m.svc_fact_languages()}</span
				>
			</div>
			<div class="about-fact">
				<span class="about-fact-num">5+</span><span class="about-fact-label"
					>{m.svc_fact_years_web()}</span
				>
			</div>
		</div>
	</RevealItem>
</section>

<!-- CONTACT -->
<!-- id="contact" is the target of the in-page CTAs (.slab-cta, /#contact).
     Without it the browser finds no anchor and the click silently does nothing. -->
<section class="section" id="contact">
	<RevealItem><SectionHead label={m.fierce_roo_ramp()} /></RevealItem>
	<ContactForm />
</section>

<footer class="footer">
	<span class="footer-text">feavel@email.com</span>
</footer>

<style>
	/* ── HERO ── */
	.hero {
		padding: 4rem 0 3rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.hero-heading {
		font-family: var(--font-heading);
		font-size: clamp(1.25rem, 3vw, 1.5rem);
		font-weight: 400;
		letter-spacing: -0.01em;
		margin: 0;
	}
	.hero-desc {
		font-size: 0.75rem;
		line-height: 1.6;
		color: var(--muted-foreground);
		opacity: 0.6;
		max-width: 26rem;
		margin: 0;
	}
	.hero-rule {
		width: 20%;
		height: 1px;
		background: var(--border);
		margin-top: 1rem;
	}

	/* ── SLABS ── */
	.services-list {
		padding: 1rem 0 2rem;
	}
	.slab {
		display: grid;
		grid-template-columns: 3rem 1fr 10rem;
		gap: 2rem;
		align-items: start;
		padding: 1.75rem 0;
		border-bottom: 1px solid var(--border);
	}
	.slab:first-child {
		border-top: 1px solid var(--border);
	}
	.slab-num {
		font-size: 2rem;
		font-weight: 400;
		color: var(--muted-foreground);
		opacity: 0.2;
		line-height: 1;
	}
	.slab-title {
		font-family: var(--font-heading);
		font-size: 1.125rem;
		font-weight: 400;
		letter-spacing: -0.01em;
		margin: 0 0 0.5rem;
	}
	.slab-desc {
		font-size: 0.6875rem;
		line-height: 1.65;
		color: var(--muted-foreground);
		opacity: 0.6;
		max-width: 32rem;
		margin: 0;
	}
	.slab-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem 2rem;
		margin-top: 0.75rem;
	}
	.slab-meta-item {
		display: flex;
		gap: 0.5rem;
		align-items: baseline;
	}
	.slab-meta-label {
		font-size: 0.625rem;
		font-weight: 400;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted-foreground);
		opacity: 0.45;
	}
	.slab-meta-value {
		font-size: 0.6875rem;
		color: var(--foreground);
		opacity: 0.7;
	}
	.slab-price {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.5rem;
		text-align: right;
	}
	.slab-price-from {
		font-size: 0.5625rem;
		font-weight: 400;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted-foreground);
		opacity: 0.45;
	}
	.slab-price-amount {
		font-family: var(--font-heading);
		font-size: 1.5rem;
		font-weight: 400;
		letter-spacing: -0.01em;
		line-height: 1;
	}
	.slab-cta {
		font-size: 0.625rem;
		font-weight: 400;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		text-decoration: none;
		color: var(--accent-foreground);
		transition: opacity 0.15s;
	}
	.slab-cta:hover {
		opacity: 0.5;
	}
	@media (max-width: 640px) {
		.slab {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
		.slab-price {
			align-items: flex-start;
			text-align: left;
		}
		.slab-num {
			display: none;
		}
	}

	/* ── SECTIONS ── */
	.section {
		padding-top: 3rem;
		padding-bottom: 2rem;
	}

	/* ── ABOUT ── */
	.about-quote {
		font-family: var(--font-heading);
		font-size: 1rem;
		font-weight: 400;
		letter-spacing: -0.01em;
		line-height: 1.5;
		color: var(--foreground);
		margin: 0 0 2.5rem;
		max-width: 28rem;
	}
	.about-bio {
		font-size: 0.75rem;
		line-height: 1.7;
		color: var(--muted-foreground);
		opacity: 0.7;
		max-width: 32rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 2.5rem;
	}
	.about-bio p {
		margin: 0;
	}
	.about-facts {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.25rem;
	}
	@media (max-width: 480px) {
		.about-facts {
			grid-template-columns: 1fr;
		}
	}
	.about-fact {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.about-fact-num {
		font-family: var(--font-heading);
		font-size: 2rem;
		font-weight: 400;
		letter-spacing: -0.02em;
		line-height: 1;
		color: var(--foreground);
		opacity: 0.2;
	}
	.about-fact-label {
		font-size: 0.625rem;
		line-height: 1.35;
		color: var(--muted-foreground);
		opacity: 0.5;
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
