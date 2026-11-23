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

/** List distinct tags across all public posts. */
export const listDistinctTags = async (ctx: QueryCtx): Promise<string[]> => {
	const posts = await ctx.db
		.query('posts')
		.withIndex('visibility', (q) => q.eq('visibility', 'public'))
		.collect();

	const tags = new Set<string>();
	for (const p of posts) {
		if (p.tags) for (const t of p.tags) tags.add(t);
	}
	return [...tags].sort();
};

/**
 * Distinct categories across public posts, most-used first.
 *
 * `posts.category` is a free-form string, so the UI must never hardcode a list:
 * a taxonomy baked into a Select goes stale the moment a new category is
 * written. Ordered by count so the busiest category leads the filter.
 */
export const listDistinctCategories = async (ctx: QueryCtx): Promise<string[]> => {
	const posts = await ctx.db
		.query('posts')
		.withIndex('visibility', (q) => q.eq('visibility', 'public'))
		.collect();

	const counts = new Map<string, number>();
	for (const p of posts) {
		const c = p.category?.trim();
		if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
	}

	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
		.map(([c]) => c);
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

/** List all public posts with cursor-based pagination, newest first. */
export const listPublicPostsPaginated = async (
	ctx: QueryCtx,
	args: { paginationOpts: PaginationOptions; tags?: string[]; category?: string }
): Promise<PaginationResult<Doc<'posts'>>> => {
	let result = await ctx.db
		.query('posts')
		.withIndex('visibility', (q) => q.eq('visibility', 'public'))
		.order('desc')
		.paginate(args.paginationOpts);

	// ponytail: filter in-memory after paginate. Fine for <1000 posts.
	// Add compound index on [visibility, tags] if this becomes a bottleneck.
	if (args.tags && args.tags.length > 0) {
		result = {
			...result,
			page: result.page.filter((p) => args.tags!.every((t) => p.tags?.includes(t)))
		};
	}
	if (args.category) {
		result = {
			...result,
			page: result.page.filter((p) => p.category === args.category)
		};
	}
	return result;
};
