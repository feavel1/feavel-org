import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';

/** Check if a user has access to a resource. */
export const hasAccess = async (
	ctx: QueryCtx,
	args: {
		userId: string | undefined;
		resourceType: 'post';
		resourceId: string;
		authorId: string | undefined;
	}
): Promise<boolean> => {
	// Author always has access
	if (args.authorId && args.userId === args.authorId) return true;

	if (!args.userId) return false;

	const userId: string = args.userId;

	// Check for PurchaseRecord
	const record = await ctx.db
		.query('purchaseRecords')
		.withIndex('by_user_resource', (q) =>
			q.eq('userId', userId).eq('resourceType', args.resourceType).eq('resourceId', args.resourceId)
		)
		.first();

	return record !== null;
};

/** Create a PurchaseRecord. */
export const createPurchaseRecord = async (
	ctx: MutationCtx,
	args: {
		userId: string;
		resourceType: 'post';
		resourceId: string;
		amount: string;
		network: string;
		signature: string;
	}
): Promise<Id<'purchaseRecords'>> => {
	return await ctx.db.insert('purchaseRecords', {
		userId: args.userId,
		resourceType: args.resourceType,
		resourceId: args.resourceId,
		amount: args.amount,
		network: args.network,
		signature: args.signature,
		createdAt: Date.now()
	});
};

/** Get an Ask record for a resource. */
export const getAsk = async (
	ctx: QueryCtx,
	args: { resourceType: 'post'; resourceId: string }
): Promise<Doc<'asks'> | null> => {
	return await ctx.db
		.query('asks')
		.withIndex('by_resource', (q) =>
			q.eq('resourceType', args.resourceType).eq('resourceId', args.resourceId)
		)
		.first();
};

/** Upsert an Ask (create or update). */
export const upsertAsk = async (
	ctx: MutationCtx,
	args: {
		resourceType: 'post';
		resourceId: string;
		amount: string;
		network: string;
		currency?: string;
	}
): Promise<void> => {
	const existing = await getAsk(ctx, {
		resourceType: args.resourceType,
		resourceId: args.resourceId
	});

	if (existing) {
		await ctx.db.patch(existing._id, {
			amount: args.amount,
			network: args.network,
			currency: args.currency
		});
	} else {
		await ctx.db.insert('asks', {
			resourceType: args.resourceType,
			resourceId: args.resourceId,
			amount: args.amount,
			network: args.network,
			currency: args.currency
		});
	}
};

/** Delete an Ask. */
export const deleteAsk = async (
	ctx: MutationCtx,
	args: { resourceType: 'post'; resourceId: string }
): Promise<void> => {
	const existing = await getAsk(ctx, {
		resourceType: args.resourceType,
		resourceId: args.resourceId
	});

	if (existing) {
		await ctx.db.delete(existing._id);
	}
};
