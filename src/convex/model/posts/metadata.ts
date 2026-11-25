import type { MutationCtx, QueryCtx } from '../../_generated/server';
import type { Doc, Id } from '../../_generated/dataModel';
import { type PaginationOptions, type PaginationResult } from 'convex/server';
import { deleteAsk } from '../../payments/model';
import { deletePostBody } from './bodies';

/** A post's metadata. `posts` carries no body — that lives in `postBodies`. */
export type PostMetadata = Doc<'posts'>;

/**
 * Fields are listed rather than spread so a field added to the schema fails to
 * compile until it is added here — a silent spread would under-report it to
 * every reader.
 */
export const toPostMetadata = (post: Doc<'posts'>): PostMetadata => ({
	_id: post._id,
	_creationTime: post._creationTime,
	title: post.title,
	description: post.description,
	authorId: post.authorId,
	visibility: post.visibility,
	orgId: post.orgId,
	tags: post.tags,
	category: post.category,
	createdAt: post.createdAt,
	updatedAt: post.updatedAt
});

/** Create a new private draft post for an author, optionally scoped to an org. */
export const createPost = async (
	ctx: MutationCtx,
	args: {
		authorId: string;
		orgId?: string;
	}
): Promise<Id<'posts'>> => {
	const now = Date.now();
	return await ctx.db.insert('posts', {
		title: '',
		authorId: args.authorId,
		visibility: 'private',
		orgId: args.orgId,
		createdAt: now,
		updatedAt: now
	});
};

/**
 * A post matches when it carries every requested tag (the chips are ANDed).
 * Tags are free-form and unwritten on some posts, so absence matches nothing.
 */
const matchesTags = (post: Doc<'posts'>, tags?: string[]): boolean =>
	!tags || tags.length === 0 || tags.every((tag) => post.tags?.includes(tag));

/**
 * Category values are free-form and written trimmed, so a comparison trims both
 * sides — an untrimmed `posts.category` would otherwise never match the trimmed
 * value the filter UI offers.
 */
const matchesCategory = (post: Doc<'posts'>, category?: string): boolean =>
	!category || (post.category ?? '').trim() === category;

/**
 * The public feed's filter vocabulary, derived from the posts themselves.
 *
 * One value rather than three queries because the three facets are three views of
 * the same documents: reading them together is one scan instead of three, they
 * cannot momentarily disagree, and — the reason this exists — a query whose
 * arguments never change cannot hit the `convex-svelte` `useQuery` bug that
 * blanks a result when new args happen to produce an equal value.
 *
 * Category and tag values are free-form strings, so the UI must never hardcode a
 * list: a taxonomy baked into a Select goes stale the moment a new one is written.
 */
export type PostFacets = {
	/** Busiest first — the home page builds its prompts in this order. */
	categories: string[];
	/** Every tag on a public post: what an unscoped picker offers. */
	tags: string[];
	/** Tags per category, so a chip can never offer a tag its category lacks. */
	tagsByCategory: Record<string, string[]>;
};

export const listPublicPostFacets = async (ctx: QueryCtx): Promise<PostFacets> => {
	const posts = await ctx.db
		.query('posts')
		.withIndex('visibility', (q) => q.eq('visibility', 'public'))
		.collect();

	const counts = new Map<string, number>();
	const allTags = new Set<string>();
	const tagsByCategory = new Map<string, Set<string>>();

	// A single pass: tags are collected for the uncategorised picker and for their
	// category in the same loop, so a post is never walked twice.
	for (const post of posts) {
		const tags = post.tags ?? [];
		for (const tag of tags) allTags.add(tag);

		const category = post.category?.trim();
		if (!category) continue;

		counts.set(category, (counts.get(category) ?? 0) + 1);
		const bucket = tagsByCategory.get(category) ?? new Set<string>();
		for (const tag of tags) bucket.add(tag);
		tagsByCategory.set(category, bucket);
	}

	const sorted = (values: Iterable<string>): string[] => [...values].sort();

	return {
		categories: [...counts.entries()]
			.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
			.map(([category]) => category),
		tags: sorted(allTags),
		tagsByCategory: Object.fromEntries(
			[...tagsByCategory.entries()].map(([category, tags]) => [category, sorted(tags)])
		)
	};
};

/** Tags arrive in editor order; a reordered list is a real edit worth writing. */
const sameTags = (current: string[] | undefined, next: string[]): boolean => {
	const a = current ?? [];
	return a.length === next.length && a.every((t, i) => t === next[i]);
};

/**
 * Patch a post's metadata, and only the fields that changed.
 *
 * Writing an identical patch still re-runs every subscriber of the post, so a
 * save with no edits must not write at all. `updatedAt` moves only when
 * something did change; body edits bump `postBodies.updatedAt` instead.
 */
export const updatePostMeta = async (
	ctx: MutationCtx,
	args: {
		postId: Id<'posts'>;
		title: string;
		description?: string;
		visibility: Doc<'posts'>['visibility'];
		tags?: string[];
		category?: string;
	}
): Promise<void> => {
	const post = await ctx.db.get(args.postId);
	if (!post) return;

	const patch: Partial<Doc<'posts'>> = {};
	if (post.title !== args.title) patch.title = args.title;
	if (post.visibility !== args.visibility) patch.visibility = args.visibility;
	if (args.description !== undefined && post.description !== args.description) {
		patch.description = args.description;
	}
	if (args.tags !== undefined && !sameTags(post.tags, args.tags)) patch.tags = args.tags;
	if (args.category !== undefined && post.category !== args.category)
		patch.category = args.category;

	if (Object.keys(patch).length === 0) return;

	await ctx.db.patch(args.postId, { ...patch, updatedAt: Date.now() });
};

/** Publish a post (set visibility to 'public'). */
export const publishPost = async (
	ctx: MutationCtx,
	args: { postId: Id<'posts'> }
): Promise<void> => {
	await ctx.db.patch(args.postId, {
		visibility: 'public',
		updatedAt: Date.now()
	});
};

/**
 * Delete a post along with its body and its price, in one transaction.
 *
 * `purchaseRecords` is a ledger: a purchase that happened stays on the record
 * even when the post it paid for is gone.
 */
export const deletePost = async (
	ctx: MutationCtx,
	args: { postId: Id<'posts'> }
): Promise<void> => {
	await deletePostBody(ctx, { postId: args.postId });
	await deleteAsk(ctx, { resourceType: 'post', resourceId: args.postId });
	await ctx.db.delete(args.postId);
};

/**
 * List the posts in an org that a member may see, newest first.
 *
 * Org membership is not authorship: another member's private draft must not
 * appear in the list, only their own.
 */
export const listOrgPosts = async (
	ctx: QueryCtx,
	args: { orgId: string; userId: string }
): Promise<Doc<'posts'>[]> => {
	const posts = await ctx.db
		.query('posts')
		.withIndex('orgId', (q) => q.eq('orgId', args.orgId))
		.order('desc')
		.collect();

	return posts.filter((p) => p.visibility !== 'private' || p.authorId === args.userId);
};

/** List all posts for a given author (orgs-off fallback), newest first. */
export const listMyPosts = async (
	ctx: QueryCtx,
	args: { authorId: string }
): Promise<Doc<'posts'>[]> => {
	return await ctx.db
		.query('posts')
		.withIndex('authorId', (q) => q.eq('authorId', args.authorId))
		.order('desc')
		.collect();
};

/**
 * Paginate the filtered feed.
 *
 * `tags` is an array and `category` a free-form string, so no index can express
 * these filters — they are applied after reading. The ordering is the whole point:
 * **filter first, then cut the page.** Paging the unfiltered index and filtering
 * each page afterwards returned a page holding only the few matches that happened
 * to be in it, with every other match hidden behind a "load more" click.
 *
 * The cursor is ours: an offset into the filtered list, because the filters cannot
 * be pushed into an index and so Convex's own index cursors cannot describe a
 * position in the result. The client treats the cursor as opaque, so
 * `usePaginatedQuery` and its "load more" bookkeeping work unchanged.
 *
 * Costs one read of every public post per page. Fine below ~1000 posts; a
 * materialised `postTags` join table (plus a `[visibility, category]` index) is
 * the move when that stops being true.
 */
export const listPublicPostsPaginated = async (
	ctx: QueryCtx,
	args: { paginationOpts: PaginationOptions; tags?: string[]; category?: string }
): Promise<PaginationResult<Doc<'posts'>>> => {
	const posts = await ctx.db
		.query('posts')
		.withIndex('visibility', (q) => q.eq('visibility', 'public'))
		.order('desc')
		.collect();

	const matches = posts.filter(
		(p) => matchesTags(p, args.tags) && matchesCategory(p, args.category)
	);
	const offset = Math.max(0, Number(args.paginationOpts.cursor) || 0);
	const page = matches.slice(offset, offset + args.paginationOpts.numItems);
	const next = offset + page.length;

	return { page, isDone: next >= matches.length, continueCursor: String(next) };
};
