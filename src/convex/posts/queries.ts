import { v } from 'convex/values';
import { query } from '../_generated/server';
import { paginationOptsValidator } from 'convex/server';
import { authComponent, createAuth } from '../auth';
import {
	getPostAccess,
	getPostBody,
	listPublicPostFacets,
	listOrgPosts,
	listMyPosts,
	listPublicPostsPaginated as listPublicPostsPaginatedModel,
	toPostMetadata
} from '../model/posts';
import { AUTH_CONSTANTS } from '../auth.constants';

/**
 * Get a single post's metadata, plus its price when one is still owed.
 *
 * The body is not part of this payload — `getPostContent` serves it to a viewer
 * and `getPostForEdit` to the author. `ask` is null once the caller has paid it,
 * so a settled viewer cannot be charged twice, and null for a free post.
 *
 * Returns null when the post is missing *or* not visible to the caller: a denial
 * must be indistinguishable from a post that was never there.
 */
export const getPost = query({
	args: { postId: v.id('posts') },
	handler: async (ctx, args) => {
		const access = await getPostAccess(ctx, { postId: args.postId });
		if (!access?.canView) return null;

		return {
			post: toPostMetadata(access.post),
			ask: access.hasPaid ? null : access.ask
		};
	}
});

/**
 * Resolve a post body for the caller: `granted` with the content, `locked` with
 * the price, or `denied`.
 *
 * `denied` is the single answer for a post that is missing *or* not visible to the
 * caller, matching `getPost`'s rule: a denial must be indistinguishable from a post
 * that was never there.
 *
 * The purchase is settled before the body row is read, so an unpaid viewer never
 * makes us read a body we are about to withhold.
 */
export const getPostContent = query({
	args: { postId: v.id('posts') },
	handler: async (ctx, args) => {
		const access = await getPostAccess(ctx, { postId: args.postId });
		if (!access?.canView) return { status: 'denied' as const };
		if (access.ask && !access.hasPaid) return { status: 'locked' as const, ask: access.ask };

		return { status: 'granted' as const, content: await getPostBody(ctx, { postId: args.postId }) };
	}
});

/**
 * Editor payload: metadata and body in the same response.
 *
 * The editor builds its Tiptap instance once, from the first payload it gets, so
 * a body that arrives later lands in an already-mounted empty editor and the next
 * save writes that emptiness over the post. Author only.
 */
export const getPostForEdit = query({
	args: { postId: v.id('posts') },
	handler: async (ctx, args) => {
		const access = await getPostAccess(ctx, { postId: args.postId });
		// `access.user` is unset on the public fast path, which is where an author's own
		// published post lands, so the viewer is resolved here instead.
		const userId = access?.user?._id ?? (await authComponent.safeGetAuthUser(ctx))?._id;
		if (!access || access.post.authorId !== userId) return null;

		return {
			post: toPostMetadata(access.post),
			content: await getPostBody(ctx, { postId: args.postId })
		};
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
			const orgPosts = await listOrgPosts(ctx, {
				orgId: user.activeOrganizationId,
				userId: user._id
			});

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
 * The feed's filter vocabulary: categories, every public tag, and the tags of
 * each category. No arguments, so one subscription serves the whole UI — the
 * feed, the category dropdown, the tag chips, the editor's pickers.
 *
 * It used to be three queries, two of them arg-taking (`listTags({ category })`,
 * `countPublicPosts(filters)`). Those are exactly the shape `convex-svelte@0.15`
 * mis-caches: when new args produce a result equal to the previous one, the
 * watcher never re-fires and the data stays blank. Static args cannot.
 */
export const listPostFacets = query({
	args: {},
	handler: async (ctx) => {
		return await listPublicPostFacets(ctx);
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
