<script lang="ts">
	import * as Select from '#lib/ui/select';
	import { X } from '@lucide/svelte';
	import { useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api';

	let {
		filterCategory = $bindable(null as string | null),
		filterTags = $bindable([] as string[]),
		tags = [] as string[],
		totalPosts = 0
	}: {
		filterCategory?: string | null;
		filterTags?: string[];
		tags?: string[];
		totalPosts?: number;
	} = $props();

	// Categories come from the posts themselves. A hardcoded list here went stale
	// the moment a new category was written, and silently filtered to nothing.
	const categoriesQuery = useQuery(api.posts.queries.listCategories);
	const categories = $derived(categoriesQuery.data ?? []);

	let _filterCategory = $derived(filterCategory ?? undefined);
	$effect(() => {
		filterCategory = _filterCategory ?? null;
	});

	const hasActiveFilters = $derived(filterTags.length > 0 || filterCategory !== null);
</script>

<div class="filters">
	<div class="filters-row">
		<Select.Root type="single" bind:value={_filterCategory}>
			<Select.Trigger class="filter-select">
				<span>{_filterCategory || 'All'}</span>
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="">All</Select.Item>
				<!-- The active filter stays selectable even if its category no longer
				     has any public posts — otherwise the trigger shows a value the
				     menu cannot display. -->
				{#each [...new Set( [...categories, ...(_filterCategory ? [_filterCategory] : [])] )] as c (c)}
					<Select.Item value={c}>{c}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

		{#if tags.length > 0}
			<div class="tag-list">
				{#each tags as tag (tag)}
					<button
						onclick={() =>
							(filterTags = filterTags.includes(tag)
								? filterTags.filter((t) => t !== tag)
								: [...filterTags, tag])}
						class="tag-chip"
						class:tag-chip--active={filterTags.includes(tag)}
					>
						{tag}
						{#if filterTags.includes(tag)}<X size={10} class="tag-x" />{/if}
					</button>
				{/each}
			</div>
		{/if}

		{#if hasActiveFilters}
			<span class="filter-count">{totalPosts} post{totalPosts !== 1 ? 's' : ''}</span>
		{/if}
	</div>
</div>

<style>
	.filters {
		padding: 0 0 1.5rem;
	}
	.filters-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}
	/* ponytail: :global — .filter-select is on Select.Trigger (child component) */
	:global(.filter-select) {
		font-size: 0.625rem;
		padding: 0.125rem 0.625rem;
		height: auto;
		border: 1px solid var(--border);
		border-radius: 0;
		background: transparent;
		color: var(--muted-foreground);
		cursor: pointer;
	}
	.tag-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}
	.tag-chip {
		font-size: 0.625rem;
		padding: 0.125rem 0.5rem;
		border: 1px solid var(--border);
		background: transparent;
		color: var(--muted-foreground);
		cursor: pointer;
		transition:
			border-color 0.15s,
			color 0.15s;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}
	.tag-chip:hover {
		border-color: var(--muted-foreground);
		color: var(--foreground);
	}
	.tag-chip--active {
		border-color: var(--foreground);
		color: var(--foreground);
	}
	/* ponytail: :global — .tag-x is on lucide X icon */
	:global(.tag-x) {
		opacity: 0.5;
	}
	.filter-count {
		font-size: 0.5625rem;
		color: var(--muted-foreground);
		opacity: 0.4;
	}
	@media (max-width: 640px) {
		.filters-row {
			gap: 0.375rem;
		}
	}
</style>
