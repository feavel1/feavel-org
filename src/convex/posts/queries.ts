import { v } from 'convex/values';
import { query } from '../_generated/server';
import { paginationOptsValidator } from 'convex/server';
import { authComponent, createAuth } from '../auth';
import {
	getPost as getPostModel,
	listDistinctTags,
	listOrgPosts,
	listMyPosts,
	listPublicPosts as listPublicPostsModel,
	listPublicPostsPaginated as listPublicPostsPaginatedModel
} from '../model/posts';
import { hasAccess, getAsk } from '../payments/model';
import { AUTH_CONSTANTS } from '../auth.constants';

/**
 * Get a single post by ID.
 * Returns { post, ask } where post.content is stripped if the caller
 * hasn't paid for a paywalled post.
 */
export const getPost = query({
	args: { postId: v.id('posts') },
	handler: async (ctx, args) => {
		const post = await getPostModel(ctx, { postId: args.postId });
		if (!post) return null;

		// Visibility check
		let canView = post.visibility === 'public';
		if (!canView) {
			const user = await authComponent.safeGetAuthUser(ctx);
			if (user) {
				if (post.authorId === user._id) {
					canView = true;
				} else if (post.visibility === 'members' && post.orgId && AUTH_CONSTANTS.organizations) {
					const auth = createAuth(ctx);
					const orgs = await auth.api.listOrganizations({
						headers: await authComponent.getHeaders(ctx)
					});
					canView = orgs.some((org) => org.id === post.orgId);
				}
			}
		}

		if (!canView) return null;

		// Check if there's an Ask (price) and user has paid
		const ask = await getAsk(ctx, { resourceType: 'post', resourceId: post._id });

		if (ask) {
			const user = await authComponent.safeGetAuthUser(ctx);
			const paid = await hasAccess(ctx, {
				userId: user?._id,
				resourceType: 'post',
				resourceId: post._id,
				authorId: post.authorId
			});

			if (!paid) {
				// Strip content, return metadata + ask
				return {
					post: { ...post, content: null },
					ask
				};
			}
			// User has access — don't expose ask to frontend
			return { post, ask: null };
		}

		return { post, ask: null };
	}
});

/**
 * List posts for the current user — branches on activeOrganizationId.
 * When orgs are active, lists all posts in the user's active org.
 * When orgs are disabled, lists only the user's own posts.
 */
export const listUserPosts = query({
	args: {},
	handler: async (ctx) => {
		const user = await authComponent.safeGetAuthUser(ctx);
		if (!user) return [];

		if (AUTH_CONSTANTS.organizations && user.activeOrganizationId) {
			const orgPosts = await listOrgPosts(ctx, { orgId: user.activeOrganizationId });

			// Check if user is a member of the active org
			const auth = createAuth(ctx);
			const orgs = await auth.api.listOrganizations({
				headers: await authComponent.getHeaders(ctx)
			});
			const isMember = orgs.some((org) => org.id === user.activeOrganizationId);

			if (isMember) return orgPosts;

			// User is not a member of the active org — only show their own posts
			return orgPosts.filter((p) => p.authorId === user._id);
		}

		return await listMyPosts(ctx, { authorId: user._id });
	}
});

/**
 * List all public posts for the global feed. No auth required.
 * Replaces the old listPublicPosts with paginated version.
 */
export const listPublicPosts = query({
	args: {
		tags: v.optional(v.array(v.string())),
		category: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		let posts = await listPublicPostsModel(ctx, {
			tags: args.tags,
			category: args.category
		});
		return posts;
	}
});

/** List all distinct tags across public posts. */
export const listTags = query({
	args: {},
	handler: async (ctx) => {
		return await listDistinctTags(ctx);
	}
});

/**
 * Paginated list of public posts for the global feed. No auth required.
 */
export const listPublicPostsPaginated = query({
	args: {
		paginationOpts: paginationOptsValidator,
		tags: v.optional(v.array(v.string())),
		category: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		return await listPublicPostsPaginatedModel(ctx, {
			paginationOpts: args.paginationOpts,
			tags: args.tags,
			category: args.category
		});
	}
});
