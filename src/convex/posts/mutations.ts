import { ConvexError, v } from 'convex/values';
import { mutation } from '../_generated/server';
import { authComponent } from '../auth';
import {
	createPost as createPostModel,
	updatePost as updatePostModel,
	publishPost as publishPostModel,
	deletePost as deletePostModel
} from '../model/posts';
import { AUTH_CONSTANTS } from '../auth.constants';

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
 * Update a post's title, description, content, and visibility.
 * Only the author can update.
 */
export const updatePost = mutation({
	args: {
		postId: v.id('posts'),
		title: v.string(),
		description: v.optional(v.string()),
		content: v.any(),
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

		await updatePostModel(ctx, {
			postId: args.postId,
			title: args.title,
			description: args.description,
			content: args.content,
			visibility: args.visibility,
			tags: args.tags,
			category: args.category
		});
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
