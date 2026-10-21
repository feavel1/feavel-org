import type { MutationCtx, QueryCtx } from '../../_generated/server';
import type { Doc, Id } from '../../_generated/dataModel';
import { type PaginationOptions, type PaginationResult } from 'convex/server';

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
		content: null,
		authorId: args.authorId,
		visibility: 'private',
		orgId: args.orgId,
		createdAt: now,
		updatedAt: now
	});
};

/** List distinct tags across all public posts. */
export const listDistinctTags = async (ctx: QueryCtx): Promise<string[]> => {
	const posts = await ctx.db.query('posts').collect();
	const tags = new Set<string>();
	for (const p of posts) {
		if (p.tags) for (const t of p.tags) tags.add(t);
	}
	return [...tags].sort();
};

/** Update a post's title, description, content, visibility, tags, category, and image. */
export const updatePost = async (
	ctx: MutationCtx,
	args: {
		postId: Id<'posts'>;
		title: string;
		description?: string;
		content: unknown;
		visibility: Doc<'posts'>['visibility'];
		tags?: string[];
		category?: string;
	}
): Promise<void> => {
	const patch: Partial<Doc<'posts'>> = {
		title: args.title,
		content: args.content,
		visibility: args.visibility,
		updatedAt: Date.now()
	};

	if (args.description !== undefined) patch.description = args.description;
	if (args.tags !== undefined) patch.tags = args.tags;
	if (args.category !== undefined) patch.category = args.category;

	await ctx.db.patch(args.postId, patch);
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

/** Delete a post by ID. */
export const deletePost = async (
	ctx: MutationCtx,
	args: { postId: Id<'posts'> }
): Promise<void> => {
	await ctx.db.delete(args.postId);
};

/** Fetch a single post by ID. */
export const getPost = async (
	ctx: QueryCtx,
	args: { postId: Id<'posts'> }
): Promise<Doc<'posts'> | null> => {
	return await ctx.db.get(args.postId);
};

/** List all posts visible to members of an org, newest first. */
export const listOrgPosts = async (
	ctx: QueryCtx,
	args: { orgId: string }
): Promise<Doc<'posts'>[]> => {
	return await ctx.db
		.query('posts')
		.withIndex('orgId', (q) => q.eq('orgId', args.orgId))
		.order('desc')
		.collect();
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

/** List all public posts, newest first. Optionally filter by tags and category. */
export const listPublicPosts = async (
	ctx: QueryCtx,
	args?: { tags?: string[]; category?: string }
): Promise<Doc<'posts'>[]> => {
	let posts = await ctx.db
		.query('posts')
		.withIndex('visibility', (q) => q.eq('visibility', 'public'))
		.order('desc')
		.collect();

	if (args?.tags && args.tags.length > 0) {
		posts = posts.filter((p) => args.tags!.every((t) => p.tags?.includes(t)));
	}
	if (args?.category) {
		posts = posts.filter((p) => p.category === args.category);
	}
	return posts;
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
