import type { QueryCtx } from '../../_generated/server';
import type { Doc, Id } from '../../_generated/dataModel';
import { authComponent, createAuth } from '../../auth';
import { AUTH_CONSTANTS } from '../../auth.constants';
import { getAsk, hasAccess } from '../../payments/model';

/**
 * The signed-in user, or `undefined` for an anonymous caller. Derived from the
 * auth component so the shape stays in step with its schema.
 */
type AuthUser = Awaited<ReturnType<typeof authComponent.safeGetAuthUser>>;

export type PostAccess = {
	post: Doc<'posts'>;
	/**
	 * The caller as resolved by the visibility gate. Undefined both for an anonymous
	 * caller and on the public fast path, where no session was read — so never use it
	 * to identify the viewer; resolve the viewer in the caller when identity matters.
	 */
	user: AuthUser;
	/** The post's price, or null when it is free. Only read once a grant stands. */
	ask: Doc<'asks'> | null;
	canView: boolean;
	/** True when the caller owns the post or holds a purchase record for it. */
	hasPaid: boolean;
};

/**
 * Resolve who is asking and what they may see.
 *
 * The gates run in a fixed order — post exists, public, author, members with org
 * membership, otherwise denied — so the org lookup (a cross-component call) never
 * runs for a post the caller wrote. `getAsk` and `hasAccess` run only after a
 * grant: the price and purchase state of a post the caller cannot see are not
 * theirs to read.
 *
 * Returns `null` only when the post does not exist; callers must collapse that
 * with `canView: false` into a single indistinguishable denial.
 */
export const getPostAccess = async (
	ctx: QueryCtx,
	args: { postId: Id<'posts'> }
): Promise<PostAccess | null> => {
	const post = await ctx.db.get(args.postId);
	if (!post) return null;

	// A public post is visible without a session; a paywalled one still needs the
	// session to resolve the purchase, so the read waits until it can matter.
	let user = post.visibility === 'public' ? undefined : await authComponent.safeGetAuthUser(ctx);

	let canView = post.visibility === 'public';
	if (!canView && user) {
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

	if (!canView) return { post, user, ask: null, canView: false, hasPaid: false };

	const ask = await getAsk(ctx, { resourceType: 'post', resourceId: post._id });
	if (ask && !user) user = await authComponent.safeGetAuthUser(ctx);

	const hasPaid = ask
		? await hasAccess(ctx, {
				userId: user?._id,
				resourceType: 'post',
				resourceId: post._id,
				authorId: post.authorId
			})
		: false;

	return { post, user, ask, canView: true, hasPaid };
};
