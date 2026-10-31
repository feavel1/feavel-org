import type { X402State } from './types.js';
import { writable, get } from 'svelte/store';
import { wallet } from '#lib/wallet/standard';
import { x402Client } from '@x402/core/client';
import { wrapFetchWithPayment } from '@x402/fetch';
import { ExactSvmScheme } from '@x402/svm/exact/client';
import { createSignerFromWalletAccount } from '@solana/wallet-account-signer';
import { PUBLIC_X402_NETWORK } from '$app/env/public';

// Settled from env so prod can flip chains without code. The two strings below are NOT
// interchangeable: x402 speaks CAIP-2 (`solana:<genesis-or-ref>`), wallet-standard
// accounts advertise short names (`solana:devnet`), and the signer refuses a mismatch.
// x402 types networks as CAIP-2 `${namespace}:${reference}`; env gives us a plain string.
const CAIP2 = (PUBLIC_X402_NETWORK ??
	'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1') as `${string}:${string}`;
const WALLET_CHAIN =
	CAIP2 === 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' ? 'solana:mainnet' : 'solana:devnet';

function createX402Store() {
	const { subscribe, set } = writable<X402State>({
		loading: false,
		status: null,
		error: null
	});

	return {
		subscribe,

		async fetch(url: string): Promise<Response> {
			set({ loading: true, status: 'Payment required~', error: null });

			try {
				const $wallet = get(wallet);
				if (!$wallet.connected || !$wallet.UiWallet) {
					throw new Error('Wallet not connected, connect wallet and retry');
				}
				const walletAccount = $wallet.UiWallet.accounts[0];

				// Create x402 client and register SVM scheme
				const client = new x402Client();
				// ponytail: only the devnet/mainnet short names are known; any other CAIP-2 id is
				// assumed devnet. Map new clusters explicitly when you add them.
				const svmSigner = createSignerFromWalletAccount(walletAccount, WALLET_CHAIN);

				client.register(CAIP2, new ExactSvmScheme(svmSigner));

				// Wrap fetch with payment handling
				const fetchWithPayment = wrapFetchWithPayment(fetch, client);

				// Make request - payment is handled automatically
				const newresponse = await fetchWithPayment(url);

				// ponytail: the wrapper may re-issue the request after settlement, and that
				// retry carries the payment itself — the facilitator rejects reused proofs,
				// so the retry 402s even though we paid. A 402 here means "settled, not
				// re-readable"; surface it as paid and let Convex drive the unlock.
				const typed = newresponse as Response & { x402Paid?: boolean };
				if (newresponse.status === 402) typed.x402Paid = true;

				// ponytail: the 402 retry reuses the original request, and the live post
				// handler returns a 204 for x402 clients (content is meant to come from
				// the underlying resource). 204 has no body, so only parse when there is one.
				const data =
					newresponse.status === 204 || newresponse.status === 402
						? null
						: await newresponse.clone().json();
				console.log('Response:', data);

				set({ loading: false, status: 'Success!', error: null });
				return newresponse;
			} catch (err) {
				console.log(err);
				const error = (err as Error).message;
				set({ loading: false, status: null, error });
				throw err;
			}
		},
		reset() {
			set({ loading: false, status: null, error: null });
		}
	};
}

export const x402 = createX402Store();
