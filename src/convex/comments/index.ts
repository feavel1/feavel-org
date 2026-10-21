import { Comments } from '@hamzasaleemorg/convex-comments';
import { v } from 'convex/values';
import { mutation, query } from '../_generated/server';
import { components } from '../_generated/api';
import { authComponent } from '../auth';

const comments = new Comments(components.comments);

/**
 * Initialize zone + thread for a post.
 * Creates zone if needed, then creates or returns the general thread.
 */
export const initForPost = mutation({
	args: { entityId: v.string() },
	returns: v.string(),
	handler: async (ctx, args) => {
		const zoneId = await comments.getOrCreateZone(ctx, { entityId: args.entityId });
		const threadId = await comments.getOrCreateThread(ctx, { zoneId });
		return threadId;
	}
});

/**
 * Add a comment to a thread. Requires authentication.
 */
export const addComment = mutation({
	args: { threadId: v.string(), body: v.string() },
	returns: v.any(),
	handler: async (ctx, args) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) throw new Error('Authentication required');

		return await comments.addComment(ctx, {
			threadId: args.threadId,
			authorId: user._id,
			body: args.body
		});
	}
});

/**
 * Toggle an emoji reaction on a message. Requires authentication.
 */
export const toggleReaction = mutation({
	args: { messageId: v.string(), emoji: v.string() },
	returns: v.any(),
	handler: async (ctx, args) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) throw new Error('Authentication required');

		return await comments.toggleReaction(ctx, {
			messageId: args.messageId,
			userId: user._id,
			emoji: args.emoji
		});
	}
});

/**
 * Get messages for a thread. Public — no auth required.
 */
export const getMessages = query({
	args: {
		threadId: v.string(),
		limit: v.optional(v.number()),
		cursor: v.optional(v.string()),
		order: v.optional(v.union(v.literal('asc'), v.literal('desc')))
	},
	handler: async (ctx, args) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		return await comments.getMessages(ctx, {
			threadId: args.threadId,
			limit: args.limit ?? 50,
			order: args.order ?? 'asc',
			cursor: args.cursor,
			currentUserId: user?._id
		});
	}
});
