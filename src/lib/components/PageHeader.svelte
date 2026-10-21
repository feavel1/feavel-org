<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';

	let {
		title,
		description,
		children,
		tags
	}: {
		title: string;
		description?: string;
		children?: Snippet;
		tags?: { label: string; href: string }[];
	} = $props();
</script>

<section class="flex flex-col gap-4">
	{#if description}
		<div class="flex flex-col gap-1">
			<div class="flex items-center gap-2">
				{#if children}
					{@render children()}
				{/if}
				<h1 class="text-3xl font-bold">{title}</h1>
			</div>
			<p class="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
		</div>
	{:else}
		<div class="flex items-center gap-2">
			{#if children}
				{@render children()}
			{/if}
			<h1 class="text-3xl font-bold">{title}</h1>
		</div>
	{/if}
	{#if tags && tags.length > 0}
		<nav class="flex flex-wrap gap-3">
			{#each tags as t (t.href)}
				<a
					href={t.href}
					class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted-foreground ring-1 ring-foreground/10 transition-all hover:text-foreground hover:ring-foreground/20"
				>
					{t.label}
				</a>
			{/each}
		</nav>
	{/if}
</section>
