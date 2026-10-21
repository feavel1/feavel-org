import { v } from 'convex/values';
import { mutation } from '../_generated/server';
import { sendContactInquiryAutoReply, sendContactInquiryNotification } from '../email';

const CONTACT_EMAIL = process.env.CONTACT_EMAIL;

export const submitContactInquiry = mutation({
	args: {
		name: v.string(),
		email: v.string(),
		category: v.string(),
		message: v.string()
	},
	handler: async (ctx, args) => {
		if (!CONTACT_EMAIL) {
			throw new Error('CONTACT_EMAIL environment variable is not set');
		}

		await ctx.db.insert('contactInquiries', {
			name: args.name,
			email: args.email,
			category: args.category,
			message: args.message,
			createdAt: Date.now()
		});

		await sendContactInquiryNotification(ctx, {
			to: CONTACT_EMAIL,
			name: args.name,
			email: args.email,
			category: args.category,
			message: args.message
		});

		await sendContactInquiryAutoReply(ctx, {
			to: args.email,
			name: args.name
		});
	}
});
