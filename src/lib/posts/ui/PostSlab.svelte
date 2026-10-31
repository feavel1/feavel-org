<script lang="ts">
	import { EdraEditor } from '#lib/edra/shadcn/index.js';
	import { Badge } from '#lib/ui/badge';
	import { Button } from '#lib/ui/button';
	import { Separator } from '#lib/ui/separator';
	import { Skeleton } from '#lib/ui/skeleton';
	import * as EmojiPicker from '#lib/ui/emoji-picker';
	import * as Popover from '#lib/ui/popover';
	import * as Empty from '#lib/ui/empty';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api';
	import type { Id } from '#convex/_generated/dataModel';
	import { Lock, SendHorizontal, SmilePlus, MessageCircle } from '@lucide/svelte';
	import { x402 } from '#lib/wallet/x402';
	import WalletButton from '#lib/wallet/ui/WalletButton.svelte';
	import { slide } from 'svelte/transition';

	let {
		post,
		index,
		isOpen = false,
		onselect = () => {}
	}: {
		post: {
			_id: Id<'posts'>;
			title: string;
			description?: string;
			_creationTime: number;
			visibility?: string;
			authorName?: string;
			authorId: string;
			tags?: string[];
			category?: string | null;
		};
		index: number;
		isOpen?: boolean;
		onselect?: (id: string | null) => void;
	} = $props();

	const client = useConvexClient();
	const postQuery = useQuery(api.posts.queries.getPost, () =>
		isOpen ? { postId: post._id } : 'skip'
	);

	let threadId = $state<string | null>(null);
	$effect(() => {
		if (!isOpen) return;
		let cancelled = false;
		client.mutation(api.comments.index.initForPost, { entityId: post._id }).then((id) => {
			if (!cancelled) threadId = id;
		});
		return () => {
			cancelled = true;
		};
	});
	const commentsQuery = useQuery(api.comments.index.getMessages, () =>
		threadId ? { threadId } : 'skip'
	);

	let newComment = $state('');
	let paidContent = $state<any>(null);
	let paying = $state(false);

	async function handlePay() {
		paying = true;
		try {
			const res = await x402.fetch(`/api/resource/post/${post._id}`);
			const data = (await res.json()) as { content?: unknown };
			paidContent = data.content ?? data;
		} catch {
			/* handled by store */
		} finally {
			paying = false;
		}
	}

	async function addComment() {
		const body = newComment.trim();
		if (!body || !threadId) return;
		await client.mutation(api.comments.index.addComment, { threadId, body });
		newComment = '';
	}

	async function toggleReaction(msgId: string, emoji: string) {
		try {
			await client.mutation(api.comments.index.toggleReaction, { messageId: msgId, emoji });
		} catch {
			/* auth required */
		}
	}

	function timeAgo(ts: number): string {
		const sec = Math.floor((Date.now() - ts) / 1000);
		if (sec < 60) return 'just now';
		if (sec < 3600) return `${Math.floor(sec / 60)}m`;
		if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
		if (sec < 604800) return `${Math.floor(sec / 86400)}d`;
		return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<div class="slab" class:slab--open={isOpen}>
	<button class="slab-header" onclick={() => onselect(isOpen ? null : post._id)}>
		<div class="slab-main">
			<span class="slab-num">{String(index + 1).padStart(2, '0')}</span>
			<span class="slab-title">{post.title}</span>
		</div>
		<div class="slab-meta">
			<span class="slab-date">{timeAgo(post._creationTime)}</span>
			{#if post.visibility === 'members'}<Badge variant="secondary" class="text-[10px]"
					>Members</Badge
				>{/if}
		</div>
	</button>

	{#if post.description}
		<p class="slab-desc">{post.description}</p>
	{/if}

	{#if isOpen}
		<div class="slab-content" transition:slide={{ duration: 400 }}>
			{#if postQuery.isLoading}
				<div class="loading">
					<Skeleton class="h-5 w-2/5" />
					<Skeleton class="h-3 w-4/5" />
					<Skeleton class="h-3 w-3/5" />
					<Skeleton class="mt-6 h-3 w-1/2" />
					<Skeleton class="h-3 w-3/4" />
				</div>
			{:else if postQuery.data?.ask && !paidContent}
				<div class="paywall">
					<div class="paywall-icon"><Lock size={24} /></div>
					<h3 class="paywall-heading">Pay to read</h3>
					<p class="paywall-text">This post costs {postQuery.data.ask.amount} USDC</p>
					<WalletButton />
					<Button onclick={handlePay} disabled={paying} class="paywall-btn">
						{paying ? 'Processing...' : `Pay ${postQuery.data.ask.amount} USDC`}
					</Button>
					{#if $x402.error}<p class="paywall-error">{$x402.error}</p>{/if}
				</div>
			{:else if postQuery.data?.post}
				<div class="slab-body">
					<EdraEditor content={paidContent ?? postQuery.data.post.content} editable={false} />
				</div>
				<div class="slab-rule" aria-hidden="true"><Separator /></div>
				<div class="comments">
					<h4 class="comments-label">Comments</h4>
					<div class="comment-input-row">
						<input
							type="text"
							placeholder="Write a comment..."
							bind:value={newComment}
							class="comment-input"
							onkeydown={(e) =>
								e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), addComment())}
						/>
						<button
							onclick={addComment}
							disabled={!newComment.trim() || !threadId}
							class="comment-submit"
						>
							<SendHorizontal class="size-3.5" />
						</button>
					</div>
					{#if commentsQuery.isLoading}
						<Skeleton class="h-12 w-full" />
					{:else if (commentsQuery.data?.messages ?? []).length === 0}
						<Empty.Root>
							<Empty.Media variant="icon"><MessageCircle size={16} /></Empty.Media>
							<Empty.Header>
								<Empty.Title>No comments yet</Empty.Title>
							</Empty.Header>
						</Empty.Root>
					{:else}
						{#each commentsQuery.data!.messages as msg (msg.message._id)}
							{#if !msg.message.isDeleted}
								<div class="comment">
									<span class="comment-avatar"
										>{msg.message.authorId.slice(0, 2).toUpperCase()}</span
									>
									<div class="comment-body-wrap">
										<span class="comment-time">{timeAgo(msg.message.createdAt)}</span>
										<p class="comment-text">{msg.message.body}</p>
										<div class="comment-reactions">
											{#each msg.reactions ?? [] as reaction (reaction.emoji)}
												<button
													class="reaction-btn"
													class:reaction-btn--active={reaction.includesMe}
													onclick={() => toggleReaction(msg.message._id, reaction.emoji)}
												>
													{reaction.emoji}
													{reaction.count}
												</button>
											{/each}
											<EmojiPicker.Root
												disableInitialScroll
												onSelect={(s) => toggleReaction(msg.message._id, s.emoji)}
											>
												<Popover.Root>
													<Popover.Trigger class="reaction-add"
														><SmilePlus size={14} /></Popover.Trigger
													>
													<Popover.Content class="w-auto p-0">
														<EmojiPicker.Search />
														<EmojiPicker.List />
													</Popover.Content>
												</Popover.Root>
											</EmojiPicker.Root>
										</div>
									</div>
								</div>
							{/if}
						{/each}
					{/if}
				</div>
			{:else}
				<p class="slab-error">Post not found</p>
			{/if}
		</div>
	{/if}
</div>

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

	.slab-content {
		padding: 0 0 2rem 2rem;
	}

	.loading {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1.5rem 0;
		min-height: 160px;
	}
	.slab-body {
		font-size: 0.8125rem;
		line-height: 1.7;
		max-width: 42rem;
	}
	.slab-body :global(p) {
		margin: 0 0 0.75rem;
		opacity: 0.85;
	}
	.slab-rule {
		margin: 2rem 0 1.5rem;
		width: 30% !important;
	}
	.slab-error {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		opacity: 0.5;
		padding: 2rem 0;
	}

	.paywall {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 3rem 0;
	}
	.paywall-icon {
		padding: 0.75rem;
		border: 1px solid var(--border);
		color: var(--muted-foreground);
	}
	.paywall-heading {
		font-family: var(--font-heading);
		font-size: 1rem;
		font-weight: 400;
		margin: 0;
	}
	.paywall-text {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		opacity: 0.6;
		margin: 0;
	}
	.paywall-error {
		font-size: 0.6875rem;
		color: var(--destructive);
		opacity: 0.8;
	}

	.comments {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.comments-label {
		font-size: 0.625rem;
		font-weight: 400;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted-foreground);
		opacity: 0.5;
		margin: 0;
	}
	.comment-input-row {
		display: flex;
		gap: 0.5rem;
	}
	.comment-input {
		flex: 1;
		border: none;
		border-bottom: 1px solid var(--border);
		background: transparent;
		font-size: 0.75rem;
		padding: 0.375rem 0;
		color: var(--foreground);
		font-family: var(--font-sans);
	}
	.comment-input:focus {
		border-color: var(--foreground);
		outline: none;
	}
	.comment-submit {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--muted-foreground);
		padding: 0.25rem;
		flex-shrink: 0;
	}
	.comment-submit:hover:not(:disabled) {
		color: var(--foreground);
	}
	.comment-submit:disabled {
		opacity: 0.3;
		cursor: default;
	}
	.comment {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
	}
	.comment-avatar {
		width: 1.5rem;
		height: 1.5rem;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.5rem;
		font-weight: 500;
		border: 1px solid var(--border);
		color: var(--muted-foreground);
	}
	.comment-body-wrap {
		min-width: 0;
	}
	.comment-time {
		font-size: 0.5625rem;
		color: var(--muted-foreground);
		opacity: 0.35;
	}
	.comment-text {
		font-size: 0.75rem;
		line-height: 1.5;
		color: var(--foreground);
		opacity: 0.75;
		margin: 0.125rem 0 0;
	}
	.comment-reactions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin-top: 0.375rem;
	}
	.reaction-btn {
		font-size: 0.625rem;
		padding: 0.125rem 0.375rem;
		border: 1px solid var(--border);
		background: transparent;
		cursor: pointer;
		transition: border-color 0.15s;
	}
	.reaction-btn:hover {
		border-color: var(--muted-foreground);
	}
	.reaction-btn--active {
		border-color: var(--foreground);
	}
	/* ponytail: :global — .reaction-add is on Popover.Trigger (child component) */
	:global(.reaction-add) {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--muted-foreground);
		opacity: 0.4;
		padding: 0.125rem;
	}
	:global(.reaction-add:hover) {
		opacity: 0.8;
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
		.slab-body {
			font-size: 0.875rem;
			line-height: 1.75;
		}
		.slab-content {
			padding: 0 0 2rem 0;
		}
		.slab-meta {
			flex-shrink: 1;
		}
	}
</style>
