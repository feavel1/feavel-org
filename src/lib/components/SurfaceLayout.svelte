<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="surface">
	<div class="dot-field" aria-hidden="true"></div>
	<div class="spine" aria-hidden="true"></div>

	<nav class="nav">
		<a href={resolve('/')} class="nav-logo">feavel</a>
		<div class="nav-links">
			<a href={resolve('/posts')} class="nav-link">Posts</a>
			<a href={resolve('/services')} class="nav-link">Services</a>
		</div>
	</nav>

	<div class="content">
		{@render children()}
	</div>
</div>

<style>
	.surface {
		position: relative;
		min-height: 100dvh;
		background: var(--background);
		color: var(--foreground);
		font-family: var(--font-sans);
		font-weight: 350;
		animation: surface-in 0.8s ease both;
	}
	@keyframes surface-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.dot-field {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		background-image: radial-gradient(circle, var(--foreground) 0.35px, transparent 0.35px);
		background-size: 12px 12px;
		opacity: 0.06;
		mask-image: linear-gradient(
			to bottom,
			var(--foreground) 5%,
			var(--foreground) 8%,
			transparent 15%,
			transparent 80%,
			var(--foreground) 88%,
			var(--foreground) 100%
		);
	}

	.spine {
		position: fixed;
		top: 0;
		left: 15%;
		bottom: 0;
		width: 1px;
		background: var(--border);
		z-index: 0;
		opacity: 0;
		animation: spine-in 1s 0.2s ease both;
	}
	@keyframes spine-in {
		to {
			opacity: 0.4;
		}
	}
	@media (max-width: 1024px) {
		.spine {
			display: none;
		}
	}

	.nav {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 0 1.25rem;
		margin: 0 auto;
		max-width: 48rem;
		animation: nav-down 0.6s 0.1s ease both;
	}
	@keyframes nav-down {
		from {
			opacity: 0;
			transform: translateY(-0.5rem);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.nav-logo {
		font-size: 0.75rem;
		font-weight: 350;
		letter-spacing: 0.05em;
		text-transform: lowercase;
		text-decoration: none;
		color: var(--muted-foreground);
	}
	.nav-links {
		display: flex;
		gap: 1.5rem;
	}
	.nav-link {
		font-size: 0.6875rem;
		font-weight: 400;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		text-decoration: none;
		color: var(--muted-foreground);
		transition: color 0.2s;
	}
	.nav-link:hover {
		color: var(--foreground);
	}

	/* content column with spine gap */
	.content {
		position: relative;
		z-index: 1;
		margin: 0 auto;
		max-width: 48rem;
		padding: 0 0 3rem;
	}
	/* on desktop the spine sits at 15%, so content needs left-padding to clear it */
	@media (min-width: 1025px) {
		.content {
			margin-left: calc(15% + 2rem);
			margin-right: auto;
		}
		.nav {
			margin-left: calc(15% + 2rem);
			margin-right: auto;
		}
	}
	@media (max-width: 1024px) {
		.content {
			padding-left: 1.25rem;
			padding-right: 1.25rem;
		}
		.nav {
			padding-left: 1.25rem;
			padding-right: 1.25rem;
		}
	}
</style>
