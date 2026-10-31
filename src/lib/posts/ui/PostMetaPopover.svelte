<script lang="ts">
	import { Button } from '#lib/ui/button';
	import * as Select from '#lib/ui/select';
	import * as Popover from '#lib/ui/popover';
	import * as Command from '#lib/ui/command';
	import * as Dialog from '#lib/ui/dialog';
	import { Edit, X, CheckIcon, ChevronsUpDownIcon } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { useConvexClient, useMutation, useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api';
	import type { Id, Doc } from '#convex/_generated/dataModel';

	let {
		postId,
		editor,
		askQuery,
		onDirty = () => {}
	}: {
		postId: Id<'posts'>;
		editor: import('#lib/edra/tiptap/Editor').Editor | undefined;
		askQuery: ReturnType<typeof useQuery>;
		onDirty?: () => void;
	} = $props();

	const client = useConvexClient();
	const allTagsQuery = useQuery(api.posts.queries.listTags);

	let metaOpen = $state(false);
	let deleting = $state(false);
	let titleInput = $state('');
	// ponytail: expose titleInput so parent can read it for dirty guard dialog
	export { titleInput };
	let descriptionInput = $state('');
	let visibilityInput = $state<Doc<'posts'>['visibility']>('private');
	let priceInput = $state('');
	let tagsInput = $state<string[]>([]);
	let categoryInput = $state('');
	let tagComboOpen = $state(false);
	let tagQuery = $state('');
	let showDeleteDialog = $state(false);

	const filteredTags = $derived(
		(allTagsQuery.data ?? []).filter((t) =>
			tagQuery ? t.toLowerCase().includes(tagQuery.toLowerCase()) : true
		)
	);

	export function loadData(d: NonNullable<ReturnType<typeof useQuery>['data']>) {
		titleInput = d.post.title;
		descriptionInput = d.post.description ?? '';
		visibilityInput = d.post.visibility;
		tagsInput = d.post.tags ?? [];
		categoryInput = d.post.category ?? '';
	}

	$effect(() => {
		const a = askQuery.data;
		if (a) priceInput = a.amount;
	});

	function addTag(t: string) {
		const tag = t.trim().toLowerCase();
		if (tag && !tagsInput.includes(tag)) tagsInput = [...tagsInput, tag];
		tagQuery = '';
		onDirty();
	}

	function removeTag(t: string) {
		tagsInput = tagsInput.filter((x) => x !== t);
		onDirty();
	}

	export async function doSave(ed: NonNullable<typeof editor>) {
		if (!titleInput.trim() || !postId) return;
		try {
			await client.mutation(api.posts.mutations.updatePost, {
				postId,
				title: titleInput.trim(),
				description: descriptionInput || undefined,
				content: ed.getJSON() ?? null,
				visibility: visibilityInput,
				tags: tagsInput.length > 0 ? tagsInput : undefined,
				category: categoryInput || undefined
			});
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Failed to save';
			throw new Error(msg);
		}

		try {
			const p = priceInput.trim();
			if (p && parseFloat(p) > 0) {
				await client.mutation(api.payments.mutations.upsertAsk, {
					resourceType: 'post',
					resourceId: postId,
					amount: p,
					currency: 'USD'
				});
			} else if (askQuery.data) {
				await client.mutation(api.payments.mutations.deleteAsk, {
					resourceType: 'post',
					resourceId: postId
				});
			}
		} catch (err: unknown) {
			// ponytail: price save failure is non-fatal, logged via toast in caller
			const msg = err instanceof Error ? err.message : 'Failed to save price';
			toast.error(msg);
		}
	}

	async function handleDelete() {
		if (!postId) return;
		deleting = true;
		try {
			await client.mutation(api.posts.mutations.deletePost, { postId });
			showDeleteDialog = false;
			toast.success('Post deleted');
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Failed to delete';
			toast.error(msg);
		} finally {
			deleting = false;
		}
	}
</script>

<Popover.Root bind:open={metaOpen}>
	<Popover.Trigger class="btn-meta" aria-label="Post settings">
		<Edit size={14} />
		<span>Edit meta</span>
	</Popover.Trigger>
	<Popover.Content align="start" side="top" class="meta-popover">
		<div class="field">
			<label class="field-label" for="post-title-{postId}">Title</label>
			<input
				id="post-title-{postId}"
				type="text"
				class="field-input"
				placeholder="Post title..."
				maxlength={100}
				bind:value={titleInput}
				oninput={onDirty}
			/>
			<span class="field-count">{titleInput.length}/100</span>
		</div>

		<div class="meta-rule" aria-hidden="true"></div>

		<div class="field">
			<label class="field-label" for="post-desc-{postId}">Description</label>
			<input
				id="post-desc-{postId}"
				type="text"
				class="field-input"
				placeholder="A short summary..."
				maxlength={200}
				bind:value={descriptionInput}
				oninput={onDirty}
			/>
			<span class="field-count">{descriptionInput.length}/200</span>
		</div>

		<div class="meta-rule" aria-hidden="true"></div>

		<div class="field">
			<span class="field-label">Visibility</span>
			<Select.Root type="single" bind:value={visibilityInput} onValueChange={onDirty}>
				<Select.Trigger id="post-vis-{postId}" class="field-select">
					<span class="capitalize">{visibilityInput}</span>
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="private">Private</Select.Item>
					<Select.Item value="members">Members</Select.Item>
					<Select.Item value="public">Public</Select.Item>
				</Select.Content>
			</Select.Root>
		</div>

		<div class="meta-rule" aria-hidden="true"></div>

		<div class="field">
			<label class="field-label" for="post-price-{postId}">Price (USDC)</label>
			<input
				id="post-price-{postId}"
				type="text"
				inputmode="decimal"
				class="field-input"
				placeholder="0.00"
				bind:value={priceInput}
				oninput={onDirty}
			/>
			<span class="field-hint">Free if empty. Saved with post.</span>
		</div>

		<div class="meta-rule" aria-hidden="true"></div>

		<div class="field">
			<span class="field-label">Tags</span>
			<Popover.Root bind:open={tagComboOpen}>
				<Popover.Trigger class="w-full">
					{#snippet child({ props })}
						<button
							class="field-select w-full"
							{...props}
							role="combobox"
							aria-expanded={tagComboOpen}
						>
							<span>{tagsInput.length > 0 ? `${tagsInput.length} tags` : 'Add tags...'}</span>
							<ChevronsUpDownIcon class="ml-auto size-3 opacity-30" />
						</button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="w-full p-0">
					<Command.Root>
						<Command.Input
							placeholder="Search or add tag..."
							bind:value={tagQuery}
							onkeydown={(e) => {
								if (e.key === 'Enter' && tagQuery && !allTagsQuery.data?.includes(tagQuery)) {
									addTag(tagQuery);
									tagComboOpen = false;
								}
							}}
						/>
						<Command.List>
							<Command.Empty>
								<button
									class="w-full px-2 py-1 text-left text-sm hover:bg-muted"
									onclick={() => {
										addTag(tagQuery);
										tagComboOpen = false;
									}}
								>
									Add &ldquo;{tagQuery}&rdquo;
								</button>
							</Command.Empty>
							{#if filteredTags.length > 0}
								<Command.Group>
									{#each filteredTags as tag (tag)}
										<Command.Item
											value={tag}
											onSelect={() => {
												addTag(tag);
											}}
										>
											<CheckIcon
												class="me-2 size-4 {tagsInput.includes(tag) ? '' : 'text-transparent'}"
											/>
											{tag}
										</Command.Item>
									{/each}
								</Command.Group>
							{/if}
						</Command.List>
					</Command.Root>
				</Popover.Content>
			</Popover.Root>
			{#if tagsInput.length > 0}
				<div class="tag-list">
					{#each tagsInput as tag (tag)}
						<span class="tag-chip">
							{tag}
							<button class="tag-x" onclick={() => removeTag(tag)} aria-label="Remove {tag}">
								<X size={10} />
							</button>
						</span>
					{/each}
				</div>
			{/if}
		</div>

		<div class="meta-rule" aria-hidden="true"></div>

		<div class="field">
			<span class="field-label">Category</span>
			<Select.Root type="single" bind:value={categoryInput} onValueChange={onDirty}>
				<Select.Trigger id="post-cat-{postId}" class="field-select w-full">
					<span>{categoryInput || 'None'}</span>
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="">None</Select.Item>
					<Select.Item value="tutorial">Tutorial</Select.Item>
					<Select.Item value="essay">Essay</Select.Item>
					<Select.Item value="fiction">Fiction</Select.Item>
					<Select.Item value="review">Review</Select.Item>
					<Select.Item value="news">News</Select.Item>
				</Select.Content>
			</Select.Root>
		</div>

		<div class="meta-rule" aria-hidden="true"></div>

		<div class="field">
			<button
				class="btn-primary"
				onclick={() => editor && doSave(editor)}
				disabled={!titleInput.trim() || !editor}
			>
				Save
			</button>
		</div>

		<div class="meta-rule" aria-hidden="true"></div>

		<button class="btn-danger" onclick={() => (showDeleteDialog = true)}> Delete post </button>
	</Popover.Content>
</Popover.Root>

<!-- Delete confirmation dialog -->
{#if showDeleteDialog}
	<Dialog.Root
		open={true}
		onOpenChange={(o) => {
			if (!o) showDeleteDialog = false;
		}}
	>
		<Dialog.Portal>
			<Dialog.Overlay />
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Delete post</Dialog.Title>
					<Dialog.Description>
						Delete "{titleInput || 'Untitled'}"? This cannot be undone.
					</Dialog.Description>
				</Dialog.Header>
				<Dialog.Footer class="gap-2">
					<Button onclick={() => (showDeleteDialog = false)} variant="ghost">Cancel</Button>
					<Button onclick={handleDelete} disabled={deleting} variant="destructive">
						{deleting ? 'Deleting...' : 'Delete'}
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>
{/if}

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}
	.field-label {
		font-size: 0.5625rem;
		font-weight: 400;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted-foreground);
		opacity: 0.5;
	}
	.field-input {
		font-family: var(--font-sans);
		font-size: 0.75rem;
		font-weight: 350;
		color: var(--foreground);
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--border);
		padding: 0.25rem 0;
		outline: none;
		width: 100%;
	}
	.field-input:focus {
		border-bottom-color: var(--foreground);
	}
	.field-input::placeholder {
		color: var(--muted-foreground);
		opacity: 0.3;
	}
	.field-select {
		font-family: var(--font-sans);
		font-size: 0.75rem;
		font-weight: 350;
		color: var(--foreground);
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--border);
		padding: 0.375rem 0;
		outline: none;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		cursor: pointer;
	}
	.field-select:hover {
		border-bottom-color: var(--muted-foreground);
	}
	.field-count {
		align-self: flex-end;
		font-size: 0.5rem;
		color: var(--muted-foreground);
		opacity: 0.35;
	}
	.field-hint {
		font-size: 0.5625rem;
		color: var(--muted-foreground);
		opacity: 0.4;
		line-height: 1.4;
	}
	.meta-rule {
		width: 30%;
		height: 1px;
		background: var(--border);
	}
	.meta-popover {
		max-height: 60vh;
		overflow-y: auto;
		border: 1px solid var(--border);
		background: var(--background);
		padding: 1rem;
		width: 18rem;
	}
	.tag-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}
	.tag-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.125rem 0.375rem;
		font-size: 0.5625rem;
		font-weight: 350;
		color: var(--muted-foreground);
		border: 1px solid var(--border);
	}
	.tag-x {
		display: inline-flex;
		align-items: center;
		background: none;
		border: none;
		padding: 0;
		color: var(--muted-foreground);
		cursor: pointer;
		opacity: 0.4;
	}
	.tag-x:hover {
		opacity: 0.8;
	}

	.btn-primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 2.25rem;
		padding: 0 1.25rem;
		font-size: 0.625rem;
		font-weight: 400;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--muted);
		background: var(--foreground);
		border: none;
		cursor: pointer;
		transition: opacity 0.15s;
		width: 100%;
	}
	.btn-primary:hover {
		opacity: 0.9;
	}
	.btn-primary:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
	.btn-danger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 2rem;
		padding: 0 0.75rem;
		font-size: 0.5625rem;
		font-weight: 400;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--accent-clay);
		background: transparent;
		border: 1px solid var(--accent-clay);
		cursor: pointer;
		opacity: 0.5;
		transition: opacity 0.15s;
	}
	.btn-danger:hover {
		opacity: 0.8;
	}
</style>
