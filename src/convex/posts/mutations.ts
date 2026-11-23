import { ConvexError, v } from 'convex/values';
import { mutation } from '../_generated/server';
import { authComponent } from '../auth';
import {
	createPost as createPostModel,
	updatePostMeta,
	publishPost as publishPostModel,
	deletePost as deletePostModel,
	upsertPostBody
} from '../model/posts';
import { AUTH_CONSTANTS } from '../auth.constants';

/**
 * Convex rejects a document over 1 MiB. A body is measured as JSON text, so 900k
 * leaves headroom for the body row's own fields.
 */
const MAX_POST_BODY_LENGTH = 900_000;

/**
 * Create a new private draft post for the authenticated user.
 * orgId is automatically assigned from the user's activeOrganizationId.
 */
export const createDraft = mutation({
	args: {},
	handler: async (ctx) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) {
			throw new ConvexError('Not authenticated');
		}

		const orgId =
			AUTH_CONSTANTS.organizations && user.activeOrganizationId
				? user.activeOrganizationId
				: undefined;

		return await createPostModel(ctx, { authorId: user._id, orgId });
	}
});

/**
 * Update a post's metadata, and its body when one is sent.
 * Only the author can update.
 */
export const updatePost = mutation({
	args: {
		postId: v.id('posts'),
		title: v.string(),
		description: v.optional(v.string()),
		content: v.optional(v.any()),
		visibility: v.union(v.literal('private'), v.literal('members'), v.literal('public')),
		tags: v.optional(v.array(v.string())),
		category: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) {
			throw new ConvexError('Not authenticated');
		}

		const post = await ctx.db.get(args.postId);
		if (!post) {
			throw new ConvexError('Post not found');
		}
		if (post.authorId !== user._id) {
			throw new ConvexError('Not authorized to edit this post');
		}

		if (args.title.length > 100) {
			throw new ConvexError('Title must be 100 characters or fewer');
		}
		if (args.description && args.description.length > 200) {
			throw new ConvexError('Description must be 200 characters or fewer');
		}
		if (args.content !== undefined && JSON.stringify(args.content).length > MAX_POST_BODY_LENGTH) {
			throw new ConvexError('Post body is too large to save');
		}

		await updatePostMeta(ctx, {
			postId: args.postId,
			title: args.title,
			description: args.description,
			visibility: args.visibility,
			tags: args.tags,
			category: args.category
		});

		if (args.content === undefined) return;

		await upsertPostBody(ctx, { postId: args.postId, content: args.content });
	}
});

/**
 * Delete a post. Only the author can delete.
 */
export const deletePost = mutation({
	args: { postId: v.id('posts') },
	handler: async (ctx, args) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) {
			throw new ConvexError('Not authenticated');
		}

		const post = await ctx.db.get(args.postId);
		if (!post) {
			throw new ConvexError('Post not found');
		}
		if (post.authorId !== user._id) {
			throw new ConvexError('Not authorized to delete this post');
		}

		await deletePostModel(ctx, { postId: args.postId });
	}
});

/**
 * Publish a post (set visibility to 'public'). Only the author can publish.
 */
export const publishPost = mutation({
	args: { postId: v.id('posts') },
	handler: async (ctx, args) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) {
			throw new ConvexError('Not authenticated');
		}

		const post = await ctx.db.get(args.postId);
		if (!post) {
			throw new ConvexError('Post not found');
		}
		if (post.authorId !== user._id) {
			throw new ConvexError('Not authorized to publish this post');
		}

		await publishPostModel(ctx, { postId: args.postId });
	}
});
