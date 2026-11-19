<script lang="ts">
	import type { PortfolioEntry } from '#lib/services/types';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';

	let { entries = [] as PortfolioEntry[] }: { entries?: PortfolioEntry[] } = $props();

	function reveal(staggerMs = 0) {
		return (el: HTMLElement) => {
			const observer = new IntersectionObserver(
				([entry]) => {
					if (entry.isIntersecting) {
						setTimeout(() => el.style.setProperty('--revealed', '1'), staggerMs);
						observer.unobserve(el);
					}
				},
				{ threshold: 0.15 }
			);
			observer.observe(el);
			return () => observer.disconnect();
		};
	}
</script>

{#if entries.length === 0}
	<p class="empty-text reveal-item" {@attach reveal(0)}>{m.svc_pf_empty()}</p>
{:else}
	<div class="track-reel">
		{#each entries as entry, i (entry.id)}
			<a
				href={resolve('/services/[entryId]', { entryId: entry.id })}
				class="track-row reveal-item"
				{@attach reveal(i * 60)}
			>
				<span class="track-num">{String(i + 1).padStart(2, '0')}</span>
				<div class="track-info">
					<h3 class="track-title">{entry.title}</h3>
					<p class="track-tagline">{entry.tagline}</p>
				</div>
				<span class="track-arrow" aria-hidden="true">→</span>
			</a>
		{/each}
	</div>
{/if}

<style>
	.track-reel {
		display: flex;
		flex-direction: column;
	}
	.track-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 0;
		text-decoration: none;
		border-bottom: 1px solid var(--border);
		transition:
			background 0.15s,
			padding-left 0.15s;
	}
	.track-row:first-child {
		border-top: 1px solid var(--border);
	}
	.track-row:hover {
		padding-left: 0.5rem;
		background: oklch(0.94 0.002 85 / 40%);
	}
	.track-num {
		font-size: 0.5625rem;
		font-weight: 400;
		color: var(--muted-foreground);
		opacity: 0.25;
		width: 1.25rem;
		flex-shrink: 0;
	}
	.track-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.track-title {
		font-size: 0.8125rem;
		font-weight: 400;
		letter-spacing: -0.01em;
		color: var(--foreground);
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	@media (min-width: 640px) {
		.track-title {
			white-space: normal;
		}
	}
	.track-tagline {
		font-size: 0.625rem;
		line-height: 1.4;
		color: var(--muted-foreground);
		opacity: 0.45;
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	@media (min-width: 640px) {
		.track-tagline {
			white-space: normal;
		}
	}
	.track-arrow {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		opacity: 0.3;
		flex-shrink: 0;
		transition:
			transform 0.15s,
			opacity 0.15s;
	}
	.track-row:hover .track-arrow {
		transform: translateX(2px);
		opacity: 0.6;
	}

	.empty-text {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		opacity: 0.5;
	}

	/* ── Reveal ── */
	.reveal-item {
		--revealed: 0;
		opacity: var(--revealed);
		transform: translateY(calc(0.5rem * (1 - var(--revealed))));
		filter: blur(calc(2px * (1 - var(--revealed))));
		transition:
			opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1),
			transform 0.5s cubic-bezier(0.16, 1, 0.3, 1),
			filter 0.35s ease;
	}
</style>
