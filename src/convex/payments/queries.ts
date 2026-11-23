import { v } from 'convex/values';
import { query } from '../_generated/server';
import { getPostAccess } from '../model/posts';

/**
 * Get the Ask (price) for a post.
 *
 * Unauthenticated, so it must not answer for a post the caller cannot see: the
 * price of a private draft would confirm the draft exists. A caller who may view
 * the post gets the price whether or not they have paid it — the editor reads it
 * to show and edit the price.
 */
export const getAsk = query({
	args: {
		resourceType: v.union(v.literal('post')),
		resourceId: v.string()
	},
	handler: async (ctx, args) => {
		const postId = ctx.db.normalizeId('posts', args.resourceId);
		if (!postId) return null;

		const access = await getPostAccess(ctx, { postId });
		if (!access?.canView) return null;

		return access.ask;
	}
});
