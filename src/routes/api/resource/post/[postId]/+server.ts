import { json } from '@sveltejs/kit';
import { x402ResourceServer, HTTPFacilitatorClient } from '@x402/core/server';
import { ExactSvmScheme } from '@x402/svm/exact/server';
import { encodePaymentRequiredHeader } from '@x402/core/http';
import { createConvexHttpClient } from '@mmailaender/convex-better-auth-svelte/sveltekit';
import { api } from '#convex/_generated/api';
import type { Id } from '#convex/_generated/dataModel';
import { TREASURY_ADDRESS, FACILITATOR_URL } from '$app/env/private';
import { PUBLIC_X402_TOKEN_MINT, PUBLIC_X402_NETWORK } from '$app/env/public';

if (!TREASURY_ADDRESS || !FACILITATOR_URL)
	throw new Error('Missing TREASURY_ADDRESS or FACILITATOR_URL');

const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
// ponytail: the default money parser resolves `$x` to a known-network USDC. Pin the mint from
// env instead so devnet/prod differ by config, not by code. Unset = package defaults.
// AssetAmount carries no network — the scheme supplies that from the route.
const svmScheme = new ExactSvmScheme();
if (PUBLIC_X402_TOKEN_MINT) {
	svmScheme.registerMoneyParser(async (amount) => ({
		asset: PUBLIC_X402_TOKEN_MINT,
		// 6 decimals, as USDC. Change the exponent if you ever pin a non-USDC mint.
		amount: String(Math.round(Number(amount) * 1_000_000))
	}));
}
const resourceServer = new x402ResourceServer(facilitatorClient).register('solana:*', svmScheme);
await resourceServer.initialize();

export async function GET({ params, request, locals }) {
	const { postId } = params;
	const token = locals.token;
	const convex = createConvexHttpClient({ token });

	// Get post data
	const result = await convex.query(api.posts.queries.getPost, {
		postId: postId as Id<'posts'>
	});

	if (!result) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	const { post, ask } = result;

	// Free post or already paid — return content immediately
	if (!ask || post.content) {
		return json(post);
	}

	// Build dynamic payment requirements from the Ask. Chain is deployment config, not
	// per-record state — a stored network would pin a stale testnet during a prod switch.
	const network = (PUBLIC_X402_NETWORK ??
		'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1') as `${string}:${string}`;
	const paymentReq = (
		await resourceServer.buildPaymentRequirements({
			scheme: 'exact',
			price: `$${ask.amount}`,
			network,
			payTo: TREASURY_ADDRESS
		})
	)[0];

	if (!paymentReq) {
		return json({ error: 'Failed to build payment requirements' }, { status: 500 });
	}

	// Paywalled post — check for payment signature
	const rawPayment = request.headers.get('payment-signature') || request.headers.get('x-payment');
	if (!rawPayment) {
		return json(
			{ error: 'Payment required' },
			{
				status: 402,
				headers: {
					'PAYMENT-REQUIRED': encodePaymentRequiredHeader({
						x402Version: 2,
						error: 'Payment required',
						resource: {
							url: request.url,
							description: 'Premium post content',
							mimeType: 'application/json'
						},
						accepts: [paymentReq]
					})
				}
			}
		);
	}

	// Payment signature present — verify and settle
	const paymentPayload = JSON.parse(Buffer.from(rawPayment, 'base64').toString());
	const { isValid, invalidReason } = await resourceServer.verifyPayment(paymentPayload, paymentReq);
	if (!isValid) {
		return json({ error: 'Invalid payment', reason: invalidReason }, { status: 402 });
	}

	const settleResult = await resourceServer.settlePayment(paymentPayload, paymentReq);
	if (!settleResult.success) {
		return json({ error: 'Settlement failed', reason: settleResult.errorReason }, { status: 402 });
	}

	// Write PurchaseRecord via Convex mutation
	await convex.mutation(api.payments.mutations.createPurchaseRecord, {
		resourceType: 'post',
		resourceId: postId,
		amount: ask.amount,
		network,
		signature: rawPayment
	});

	// Refetch full post content
	const paidResult = await convex.query(api.posts.queries.getPost, {
		postId: postId as Id<'posts'>
	});

	return json(paidResult?.post ?? post, {
		headers: {
			'PAYMENT-RESPONSE': Buffer.from(JSON.stringify(settleResult)).toString('base64')
		}
	});
}
