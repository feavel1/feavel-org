import { ConvexError } from 'convex/values';
import { authComponent, createAuth } from '../../auth';

// Types
import type { MutationCtx, QueryCtx } from '../../_generated/server';
import { APIError } from 'better-auth/api';
import { components } from '../../_generated/api';

type AuthApi = ReturnType<typeof createAuth>['api'];
type CreatedOrganization = Awaited<ReturnType<AuthApi['createOrganization']>>;

/**
 * Ensure the organization slug is unique by appending an incrementing postfix
 * ("-2", "-3", ...). If the base slug does not exist, it is returned unchanged.
 */
export const getUniqueOrganizationSlug = async (
	ctx: QueryCtx | MutationCtx,
	baseSlug: string
): Promise<string> => {
	const auth = createAuth(ctx);
	let candidate: string = baseSlug;
	let counter = 2;

	const isSlugTaken = async (slug: string) => {
		try {
			await auth.api.checkOrganizationSlug({ body: { slug } });
			return false;
		} catch {
			return true;
		}
	};

	while ((await isSlugTaken(candidate)) === true) {
		candidate = `${baseSlug}-${counter}`;
		counter++;
	}
	return candidate;
};

/**
 * Create a new organization. Logo URL is stored directly in Better Auth (R2).
 */
export const createOrganizationModel = async (
	ctx: MutationCtx,
	args: {
		userId: string;
		name: string;
		slug: string;
		logoUrl?: string;
		skipActiveOrganization?: boolean;
	}
) => {
	const { name, slug, logoUrl, skipActiveOrganization } = args;
	const uniqueSlug: string = await getUniqueOrganizationSlug(ctx, slug);

	const auth = createAuth(ctx);
	let org: CreatedOrganization | null;

	try {
		org = await auth.api.createOrganization({
			body: {
				userId: args.userId,
				name,
				slug: uniqueSlug,
				logo: logoUrl
			}
		});

		await ctx.runMutation(components.betterAuth.user.updateUser, {
			userId: args.userId,
			data: { activeOrganizationId: org!.id }
		});
	} catch (error) {
		console.error('Unexpected error creating organization:', error);
		if (error instanceof APIError) {
			throw new ConvexError(`${error.statusCode} ${error.status} ${error.message}`);
		}
		throw new ConvexError('An unexpected error occurred while creating the organization');
	}

	if (!org) {
		throw new ConvexError('Organization creation failed - no organization data returned');
	}

	if (!skipActiveOrganization) {
		try {
			await auth.api.setActiveOrganization({
				body: { organizationId: org.id },
				headers: await authComponent.getHeaders(ctx)
			});
		} catch (error) {
			if (error instanceof APIError) {
				throw new ConvexError(`${error.statusCode} ${error.status} ${error.message}`);
			}
			console.error('Unexpected error setting active organization:', error);
			throw new ConvexError(
				'An unexpected error occurred while setting the organization as active'
			);
		}
	}

	return org.id;
};

/**
 * Updates an organization's profile (name, slug, logo). Logo URL is R2.
 */
export const updateOrganizationProfileModel = async (
	ctx: MutationCtx,
	args: {
		organizationId: string;
		name?: string;
		slug?: string;
		logoUrl?: string | null;
	}
): Promise<void> => {
	const { organizationId, name, slug, logoUrl } = args;
	const auth = createAuth(ctx);

	if (name !== undefined && (!name || name.trim().length === 0)) {
		throw new ConvexError('Organization name cannot be empty');
	}
	if (slug !== undefined && (!slug || slug.trim().length === 0 || !/^[a-z0-9-]+$/.test(slug))) {
		throw new ConvexError('Slug must contain only lowercase letters, numbers, and hyphens');
	}

	if (slug) {
		const currentOrganization = await auth.api.getFullOrganization({
			headers: await authComponent.getHeaders(ctx)
		});
		if (!currentOrganization) {
			throw new ConvexError('Organization not found');
		}
		if (currentOrganization.slug !== slug) {
			try {
				await auth.api.checkOrganizationSlug({ body: { slug } });
			} catch {
				throw new ConvexError('Slug already taken');
			}
		}
	}

	// Handle logo via R2 URL
	if (logoUrl !== undefined) {
		const data: { logo?: string } = {};
		if (logoUrl !== null) data.logo = logoUrl;
		await auth.api.updateOrganization({
			body: { data, organizationId },
			headers: await authComponent.getHeaders(ctx)
		});
	}

	const betterAuthUpdateData: {
		name?: string;
		slug?: string;
	} = {};
	if (name !== undefined) betterAuthUpdateData.name = name.trim();
	if (slug !== undefined) betterAuthUpdateData.slug = slug.trim();

	if (Object.keys(betterAuthUpdateData).length > 0) {
		try {
			await auth.api.updateOrganization({
				body: { data: betterAuthUpdateData, organizationId },
				headers: await authComponent.getHeaders(ctx)
			});
		} catch (error) {
			throw new ConvexError(`Failed to update organization in Better Auth: ${error}`);
		}
	}
};
