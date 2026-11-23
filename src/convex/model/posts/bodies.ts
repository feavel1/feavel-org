import type { MutationCtx, QueryCtx } from '../../_generated/server';
import type { Doc, Id } from '../../_generated/dataModel';

/** Tiptap document JSON, typed by the `v.any()` column so callers keep it as-is. */
export type PostBodyContent = Doc<'postBodies'>['content'];

/** The body row for a post, if it has one yet. At most one: `by_postId` is unique. */
const getPostBodyRow = async (ctx: QueryCtx, postId: Id<'posts'>) => {
	return await ctx.db
		.query('postBodies')
		.withIndex('by_postId', (q) => q.eq('postId', postId))
		.unique();
};

/** Read a post body. `null` when the post has no body row yet. */
export const getPostBody = async (
	ctx: QueryCtx,
	args: { postId: Id<'posts'> }
): Promise<PostBodyContent> => {
	const row = await getPostBodyRow(ctx, args.postId);
	return row?.content ?? null;
};

/**
 * Write a post body, inserting the row on first save.
 *
 * Bumps `postBodies.updatedAt` only: a body edit is not a metadata edit, and
 * `posts` subscribers must not be re-run for it.
 */
export const upsertPostBody = async (
	ctx: MutationCtx,
	args: { postId: Id<'posts'>; content: PostBodyContent }
): Promise<void> => {
	const row = await getPostBodyRow(ctx, args.postId);
	const updatedAt = Date.now();

	if (row) {
		await ctx.db.patch(row._id, { content: args.content, updatedAt });
		return;
	}

	await ctx.db.insert('postBodies', { postId: args.postId, content: args.content, updatedAt });
};

/** Delete a post body. Safe when the row was never created. */
export const deletePostBody = async (
	ctx: MutationCtx,
	args: { postId: Id<'posts'> }
): Promise<void> => {
	const row = await getPostBodyRow(ctx, args.postId);
	if (row) await ctx.db.delete(row._id);
};
