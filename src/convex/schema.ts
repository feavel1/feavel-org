import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

const schema = defineSchema({
	posts: defineTable({
		title: v.string(),
		description: v.optional(v.string()),
		content: v.optional(v.any()),
		authorId: v.string(),
		visibility: v.union(v.literal('private'), v.literal('members'), v.literal('public')),
		orgId: v.optional(v.string()),
		tags: v.optional(v.array(v.string())),
		category: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number()
	})
		.index('authorId', ['authorId'])
		.index('visibility', ['visibility'])
		.index('orgId', ['orgId'])
		.index('createdAt', ['createdAt']),

	purchaseRecords: defineTable({
		userId: v.string(),
		resourceType: v.union(v.literal('post')),
		resourceId: v.string(),
		amount: v.string(),
		network: v.string(),
		signature: v.string(),
		createdAt: v.number(),
		expiresAt: v.optional(v.number())
	})
		.index('by_user_resource', ['userId', 'resourceType', 'resourceId'])
		.index('by_resource', ['resourceType', 'resourceId']),

	asks: defineTable({
		resourceType: v.union(v.literal('post')),
		resourceId: v.string(),
		amount: v.string(),
		network: v.string(),
		currency: v.optional(v.string())
	}).index('by_resource', ['resourceType', 'resourceId']),

	contactInquiries: defineTable({
		name: v.string(),
		email: v.string(),
		category: v.string(),
		message: v.string(),
		createdAt: v.number()
	})
});

export default schema;
