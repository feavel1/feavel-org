<script lang="ts">
	import * as Select from '#lib/ui/select';
	import { X } from '@lucide/svelte';
	import { cn } from '#lib/utils.js';
	import { postCount } from './posts-i18n';
	import { m } from '#lib/paraglide/messages.js';

	// Presentation only: it renders the filters it is handed and reports what the
	// reader clicked. Holding its own copy of the selection is what used to fight
	// the URL and reset the category.
	let {
		category = null,
		selectedTags = [],
		tagOptions = [],
		categories = [],
		total = null,
		onCategoryChange = () => {},
		onTagToggle = () => {}
	}: {
		category?: string | null;
		selectedTags?: string[];
		tagOptions?: string[];
		categories?: string[];
		total?: number | null;
		onCategoryChange?: (category: string | null) => void;
		onTagToggle?: (tag: string) => void;
	} = $props();

	const hasActiveFilters = $derived(selectedTags.length > 0 || category !== null);

	// A fresh Set per selection change — membership is what the template asks for,
	// and reading `active` off it stays reactive (a `{const}` in the each block would
	// be evaluated once and never update).
	const selectedTagSet = $derived(new Set(selectedTags));

	// The active category stays in the menu even when it has no public posts left,
	// or the trigger would show a value its own menu cannot display.
	const categoryOptions = $derived([...new Set([...categories, ...(category ? [category] : [])])]);
</script>

<div class="filters">
	<div class="filters-row">
		<Select.Root
			type="single"
			value={category ?? ''}
			onValueChange={(value) => onCategoryChange(value || null)}
		>
			<Select.Trigger class={cn('filter-select', category !== null && 'filter-select--active')}>
				<span>{category ?? m.posts_filter_all()}</span>
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="">{m.posts_filter_all()}</Select.Item>
				{#each categoryOptions as option (option)}
					<Select.Item value={option}>{option}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

		{#if tagOptions.length > 0}
			<div class="tag-list">
				{#each tagOptions as tag (tag)}
					<button
						type="button"
						onclick={() => onTagToggle(tag)}
						aria-pressed={selectedTagSet.has(tag)}
						class="tag-chip"
						class:tag-chip--active={selectedTagSet.has(tag)}
					>
						{tag}
						{#if selectedTagSet.has(tag)}<X size={10} class="tag-x" />{/if}
					</button>
				{/each}
			</div>
		{/if}

		{#if hasActiveFilters && total !== null}
			<span class="filter-count">{postCount(total)}</span>
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
		transition:
			border-color 0.15s,
			color 0.15s,
			background-color 0.15s;
	}
	:global(.filter-select--active) {
		border-color: var(--foreground);
		background: color-mix(in oklch, var(--foreground) 8%, transparent);
		color: var(--foreground);
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
			color 0.15s,
			background-color 0.15s;
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
		background: color-mix(in oklch, var(--foreground) 8%, transparent);
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
