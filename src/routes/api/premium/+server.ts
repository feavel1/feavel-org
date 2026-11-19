import { json } from '@sveltejs/kit';
import { x402ResourceServer, HTTPFacilitatorClient } from '@x402/core/server';
import { ExactSvmScheme } from '@x402/svm/exact/server';
import { encodePaymentRequiredHeader } from '@x402/core/http';
import { TREASURY_ADDRESS, FACILITATOR_URL } from '$app/env/private';
import { PUBLIC_X402_NETWORK, PUBLIC_X402_TOKEN_MINT } from '$app/env/public';

if (!TREASURY_ADDRESS || !FACILITATOR_URL)
	throw new Error('Missing TREASURY_ADDRESS or FACILITATOR_URL');

const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
// ponytail: pin the mint from env, same as the post route. Without this the package's
// default money parser decides the asset and PUBLIC_X402_TOKEN_MINT is silently ignored —
// which works today only because `$1` happens to resolve to that network's USDC.
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

const paymentReq = (
	await resourceServer.buildPaymentRequirements({
		scheme: 'exact',
		price: '$1',
		network: (PUBLIC_X402_NETWORK ??
			'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1') as `${string}:${string}`,
		payTo: TREASURY_ADDRESS
	})
)[0];

if (!paymentReq) throw new Error('Failed to build payment requirements');

export async function GET({ request }) {
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
							description: 'Some premium data',
							mimeType: 'application/json'
						},
						accepts: [paymentReq]
					})
				}
			}
		);
	}

	const paymentPayload = JSON.parse(Buffer.from(rawPayment, 'base64').toString());
	const { isValid, invalidReason } = await resourceServer.verifyPayment(paymentPayload, paymentReq);
	if (!isValid) {
		return json({ error: 'Invalid Payment', reason: invalidReason }, { status: 402 });
	}

	const settleResult = await resourceServer.settlePayment(paymentPayload, paymentReq);
	if (!settleResult.success) {
		return json({ error: 'Settlement failed', reason: settleResult.errorReason }, { status: 402 });
	}

	return json(
		{ message: 'Premium content unlocked!', timestamp: new Date().toISOString() },
		{
			headers: { 'PAYMENT-RESPONSE': Buffer.from(JSON.stringify(settleResult)).toString('base64') }
		}
	);
}
