import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	PUBLIC_CONVEX_URL: {
		public: true,
		description: 'Convex deployment URL (https://<deployment>.convex.cloud)'
	},
	PUBLIC_CONVEX_SITE_URL: {
		public: true,
		description: 'Convex site URL (https://<deployment>.convex.site)'
	},
	TREASURY_ADDRESS: {
		description: 'Wallet address receiving x402 payments'
	},
	FACILITATOR_URL: {
		description: 'x402 facilitator endpoint'
	}
});
