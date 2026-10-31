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
	},
	PUBLIC_X402_NETWORK: {
		public: true,
		description:
			'CAIP-2 chain id for x402 payments, e.g. solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1 (devnet) or solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp (mainnet)'
	},
	PUBLIC_X402_TOKEN_MINT: {
		public: true,
		description:
			'Solana token mint used for x402 pricing, e.g. 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU (devnet USDC)'
	}
});
