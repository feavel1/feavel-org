import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	PUBLIC_CONVEX_URL: {
		public: true,
		description: 'Convex deployment URL (https://<deployment>.convex.cloud)'
	}
});
