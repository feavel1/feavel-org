<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		delay = 0,
		children
	}: {
		delay?: number;
		children: Snippet;
	} = $props();

	function reveal(staggerMs: number) {
		return (el: HTMLElement) => {
			const observer = new IntersectionObserver(
				([entry]) => {
					if (entry.isIntersecting) {
						setTimeout(() => el.style.setProperty('--revealed', '1'), staggerMs);
						observer.unobserve(el);
					}
				},
				{ threshold: 0.12 }
			);
			observer.observe(el);
			return () => observer.disconnect();
		};
	}
</script>

<div class="reveal-item" {@attach reveal(delay)}>
	{@render children()}
</div>

<style>
	.reveal-item {
		--revealed: 0;
		opacity: var(--revealed);
		transform: translateY(calc(0.75rem * (1 - var(--revealed))));
		filter: blur(calc(2px * (1 - var(--revealed))));
		transition:
			opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
			transform 0.6s cubic-bezier(0.16, 1, 0.3, 1),
			filter 0.4s ease;
	}
</style>
