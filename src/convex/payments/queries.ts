import { v } from 'convex/values';
import { query } from '../_generated/server';
import { getAsk as getAskModel } from './model';

/**
 * Get the Ask (price) for a resource.
 */
export const getAsk = query({
	args: {
		resourceType: v.union(v.literal('post')),
		resourceId: v.string()
	},
	handler: async (ctx, args) => {
		return await getAskModel(ctx, {
			resourceType: args.resourceType,
			resourceId: args.resourceId
		});
	}
});
