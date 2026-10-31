import { ConvexError, v } from 'convex/values';
import { mutation } from '../_generated/server';
import { authComponent } from '../auth';
import {
	createPurchaseRecord as createPurchaseRecordModel,
	upsertAsk as upsertAskModel,
	deleteAsk as deleteAskModel
} from './model';

/**
 * Create a PurchaseRecord after successful payment.
 * Called by the API route after x402 verification.
 */
export const createPurchaseRecord = mutation({
	args: {
		resourceType: v.union(v.literal('post')),
		resourceId: v.string(),
		amount: v.string(),
		network: v.string(),
		signature: v.string()
	},
	handler: async (ctx, args) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) throw new ConvexError('Not authenticated');

		return await createPurchaseRecordModel(ctx, {
			userId: user._id,
			resourceType: args.resourceType,
			resourceId: args.resourceId,
			amount: args.amount,
			network: args.network,
			signature: args.signature
		});
	}
});

/**
 * Set or update the price (Ask) for a resource.
 * Only the author of the resource can set an Ask.
 */
export const upsertAsk = mutation({
	args: {
		resourceType: v.union(v.literal('post')),
		resourceId: v.id('posts'),
		amount: v.string(),
		currency: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) throw new ConvexError('Not authenticated');

		// Verify user owns the resource
		if (args.resourceType === 'post') {
			const post = await ctx.db.get(args.resourceId);
			if (!post) throw new ConvexError('Post not found');
			if (post.authorId !== user._id)
				throw new ConvexError('Not authorized to set price on this post');
		}

		await upsertAskModel(ctx, {
			resourceType: args.resourceType,
			resourceId: args.resourceId,
			amount: args.amount,
			currency: args.currency
		});
	}
});

/**
 * Remove the price (Ask) for a resource (make it free).
 */
export const deleteAsk = mutation({
	args: {
		resourceType: v.union(v.literal('post')),
		resourceId: v.id('posts')
	},
	handler: async (ctx, args) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) throw new ConvexError('Not authenticated');

		// Verify user owns the resource
		if (args.resourceType === 'post') {
			const post = await ctx.db.get(args.resourceId);
			if (!post) throw new ConvexError('Post not found');
			if (post.authorId !== user._id)
				throw new ConvexError('Not authorized to remove price on this post');
		}

		await deleteAskModel(ctx, {
			resourceType: args.resourceType,
			resourceId: args.resourceId
		});
	}
});
