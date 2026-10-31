<script lang="ts">
	import { EdraEditor } from '#lib/edra/shadcn/index.js';
	import { Button } from '#lib/ui/button';
	import { Skeleton } from '#lib/ui/skeleton';
	import * as Dialog from '#lib/ui/dialog';
	import { toast } from 'svelte-sonner';
	import { useMutation, useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api';
	import { slide } from 'svelte/transition';
	import { onMount } from 'svelte';
	import PostMetaPopover from './PostMetaPopover.svelte';
	import type { Editor } from '#lib/edra/tiptap/Editor';

	let { post, index, isOpen = false, onselect = () => {} } = $props();

	const postId = $derived(post._id);

	const genUploadUrl = useMutation(api.r2.genUploadUrl);
	const postQuery = useQuery(api.posts.queries.getPost, () => (isOpen ? { postId } : 'skip'));
	const askQuery = useQuery(api.payments.queries.getAsk, () =>
		isOpen ? { resourceType: 'post' as const, resourceId: postId } : 'skip'
	);

	let editor = $state<Editor>();
	let metaPopover: PostMetaPopover | undefined = $state();
	let showUnsavedDialog = $state(false);
	let dirty = $state(false);

	// Only mark dirty after initial content has been loaded into editor
	let _editorReady = $state(false);

	$effect(() => {
		const d = postQuery.data;
		if (!d) return;
		metaPopover?.loadData(d);
	});

	onMount(() => {
		function warn(e: BeforeUnloadEvent) {
			if (dirty) e.preventDefault();
		}
		window.addEventListener('beforeunload', warn);
		return () => window.removeEventListener('beforeunload', warn);
	});

	function onEditorReady(e: Editor | undefined) {
		editor = e;
		_editorReady = true;
	}

	function markDirty() {
		if (_editorReady) dirty = true;
	}

	function handleHeaderClick() {
		if (isOpen && dirty) {
			showUnsavedDialog = true;
			return;
		}
		onselect(isOpen ? null : post._id);
	}

	function discardAndClose() {
		dirty = false;
		showUnsavedDialog = false;
		onselect(null);
	}

	async function handleSave() {
		const title = metaPopover?.titleInput?.trim();
		if (!title || !editor || !postId) return;
		try {
			await metaPopover!.doSave(editor);
			dirty = false;
			toast.success('Saved');
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Failed to save';
			toast.error(msg);
		}
	}

	async function handleFileUpload(file: File): Promise<string> {
		const mime = file.type;
		const prefix = mime.startsWith('image/')
			? 'images'
			: mime.startsWith('audio/')
				? 'audio'
				: mime.startsWith('video/')
					? 'videos'
					: 'files';
		const { url, key } = await genUploadUrl({ prefix });
		const res = await fetch(url, {
			method: 'PUT',
			headers: { 'Content-Type': file.type },
			body: file
		});
		if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
		return `https://storage.feavel.com/${key}`;
	}

	function timeAgo(ts: number): string {
		const sec = Math.floor((Date.now() - ts) / 1000);
		if (sec < 60) return 'just now';
		if (sec < 3600) return `${Math.floor(sec / 60)}m`;
		if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
		if (sec < 604800) return `${Math.floor(sec / 86400)}d`;
		return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function visibilityLabel(v: string): string {
		switch (v) {
			case 'public':
				return 'Public';
			case 'members':
				return 'Members';
			case 'private':
				return 'Private';
			default:
				return v;
		}
	}
</script>

<div class="slab" class:slab--open={isOpen}>
	<button class="slab-header" onclick={handleHeaderClick}>
		<div class="slab-main">
			<span class="slab-num">{String(index + 1).padStart(2, '0')}</span>
			<span class="slab-title">{post.title}</span>
		</div>
		<div class="slab-meta">
			<span class="slab-date">{timeAgo(post._creationTime)}</span>
			<span class="slab-badge">{visibilityLabel(post.visibility ?? '')}</span>
		</div>
	</button>

	{#if post.description}
		<p class="slab-desc">{post.description}</p>
	{/if}

	{#if isOpen}
		<div class="slab-content" transition:slide={{ duration: 400 }}>
			{#if postQuery.isLoading}
				<div class="loading">
					{#each Array(5) as _, i (i)}<Skeleton class="loading-skeleton" />{/each}
				</div>
			{:else if postQuery.data?.post}
				<div class="slab-editor">
					<EdraEditor
						content={postQuery.data.post.content}
						editable={true}
						onFileUpload={handleFileUpload}
						onUpdate={markDirty}
						{onEditorReady}
					/>
				</div>
			{:else}
				<p class="slab-error">Post not found</p>
			{/if}

			<div class="editor-actions">
				<button class="btn-primary" onclick={handleSave}> Save </button>

				{#if dirty}
					<span class="dirty-indicator">● Unsaved</span>
				{/if}

				<PostMetaPopover bind:this={metaPopover} {postId} {editor} {askQuery} onDirty={markDirty} />
			</div>
		</div>
	{/if}
</div>

{#if showUnsavedDialog}
	<Dialog.Root
		open={true}
		onOpenChange={(o) => {
			if (!o) showUnsavedDialog = false;
		}}
	>
		<Dialog.Portal>
			<Dialog.Overlay />
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Unsaved changes</Dialog.Title>
					<Dialog.Description>You have unsaved changes. Discard them?</Dialog.Description>
				</Dialog.Header>
				<Dialog.Footer class="gap-2">
					<Button onclick={() => (showUnsavedDialog = false)} variant="ghost">Cancel</Button>
					<Button onclick={discardAndClose} variant="destructive">Discard</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>
{/if}

<style>
	.slab {
		border-bottom: 1px solid var(--border);
		transition: background 0.35s ease;
	}
	.slab:first-child {
		border-top: 1px solid var(--border);
	}
	.slab--open {
		background: var(--card);
	}

	.slab-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		padding: 1.25rem 0;
		width: 100%;
		cursor: pointer;
		gap: 2rem;
		background: none;
		border: none;
		color: inherit;
		font: inherit;
		text-align: left;
		transition: padding-left 0.2s ease;
	}
	.slab:hover .slab-header {
		padding-left: 0.5rem;
	}

	.slab-main {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		min-width: 0;
	}
	.slab-num {
		font-size: 0.5625rem;
		font-weight: 400;
		color: var(--muted-foreground);
		opacity: 0.25;
		flex-shrink: 0;
	}
	.slab-title {
		font-family: var(--font-heading);
		font-size: 1rem;
		font-weight: 400;
		letter-spacing: -0.01em;
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.slab-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-shrink: 0;
	}
	.slab-date {
		font-size: 0.5625rem;
		color: var(--muted-foreground);
		opacity: 0.35;
		white-space: nowrap;
	}
	.slab-desc {
		font-size: 0.6875rem;
		line-height: 1.55;
		color: var(--muted-foreground);
		opacity: 0.45;
		margin: -0.25rem 0 1rem;
		padding-left: 2rem;
		max-width: 36rem;
	}
	.slab-badge {
		font-size: 0.4375rem;
		font-weight: 400;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--muted-foreground);
		opacity: 0.4;
	}

	.slab-content {
		padding: 0 0 2rem 2rem;
	}
	.slab-editor {
		border: 1px solid var(--border);
		background: var(--muted);
		padding: 1rem;
		min-height: 16rem;
	}
	.slab-error {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		opacity: 0.5;
		padding: 2rem 0;
	}

	.loading {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1.5rem 0;
		min-height: 160px;
	}
	:global(.loading-skeleton) {
		height: 3.5rem;
		width: 100%;
	}

	.editor-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 0 0;
	}
	.dirty-indicator {
		font-size: 0.5625rem;
		color: var(--accent-clay);
		opacity: 0.7;
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
	}
	.btn-primary:hover {
		opacity: 0.9;
	}

	@media (max-width: 640px) {
		.slab-header {
			padding: 1.5rem 0;
			flex-direction: column;
			gap: 0.5rem;
		}
		.slab-title {
			font-size: 1.0625rem;
			white-space: normal;
		}
		.slab-desc {
			padding-left: 0;
		}
		.slab-content {
			padding: 0 0 2rem 0;
		}
		.slab-meta {
			flex-shrink: 1;
		}
		.editor-actions {
			flex-wrap: wrap;
		}
	}
</style>
