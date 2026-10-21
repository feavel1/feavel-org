// Key naming: {prefix}/{uuid}. Prefix tells what the file is for.
// See docs/contexts/storage/CONTEXT.md for allowed prefixes.

import { R2 } from '@convex-dev/r2';
import { components } from './_generated/api';
import { mutation } from './_generated/server';
import { authComponent } from './auth';
import { v } from 'convex/values';

export const r2 = new R2(components.r2);

export const genUploadUrl = mutation({
	args: { prefix: v.string() },
	handler: async (ctx, { prefix }) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user) throw new Error('Not authenticated');
		const key = `${prefix}/${crypto.randomUUID()}`;
		const { url } = await r2.generateUploadUrl(key);
		return { url, key };
	}
});

// ponytail: manual cleanup from Convex dashboard when file sprawl becomes a problem.
export const deleteFile = mutation({
	args: { key: v.string() },
	handler: async (ctx, { key }) => {
		await r2.deleteObject(ctx, key);
	}
});
