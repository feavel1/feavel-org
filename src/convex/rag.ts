import { RAG } from '@convex-dev/rag';
import { v } from 'convex/values';
import { action, internalAction, internalQuery } from './_generated/server';
import { components, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import type { EmbeddingModel } from 'ai';
import { getPostBody, type PostBodyContent } from './model/posts/bodies';
import { toPostMetadata, type PostMetadata } from './model/posts/metadata';

/** Minimal shape of a ProseMirror/Tiptap document node. */
type PmNode = { text?: string; content?: PmNode[] } | string | null | undefined;

/** Recursively extract plain text from a ProseMirror doc JSON. */
function extractTextFromDoc(node: PmNode): string {
	if (!node) return '';
	if (typeof node === 'string') return node;
	if (node.text) return node.text;
	if (Array.isArray(node.content)) return node.content.map(extractTextFromDoc).join(' ');
	return '';
}

/** Subset of the Workers AI `/ai/run` response envelope we rely on. */
type WorkersAIResponse = {
	success?: boolean;
	errors?: unknown;
	result?: {
		data?: number[][];
		usage?: { prompt_tokens?: number; total_tokens?: number };
	};
};

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(
			`Missing ${name} on the Convex deployment. Set it with: npx convex env set ${name} <value>`
		);
	}
	return value;
}

// Cloudflare Workers AI embeddings. bge-m3: 1024 dims, multilingual, 60k context.
// Override via Convex env if you switch models (dimension MUST match the model).
const EMBEDDING_MODEL_ID = process.env.CF_EMBEDDING_MODEL ?? '@cf/baai/bge-m3';
const EMBEDDING_DIMENSION = Number(process.env.CF_EMBEDDING_DIMENSION ?? 1024);
/** Workers AI accepts a bounded batch of inputs per embedding request. */
const MAX_TEXTS_PER_CALL = 100;

/**
 * Minimal AI SDK embedding model (v4 spec) backed by the Workers AI REST API.
 *
 * Workers AI's OpenAI-compatible surface only covers chat completions, so there
 * is no `/v1/embeddings` for `createOpenAI({ baseURL })` to hit. We implement
 * `doEmbed` directly against `/client/v4/accounts/:id/ai/run/:model`.
 *
 * Docs: https://developers.cloudflare.com/workers-ai/models/bge-m3/
 */
const workersAIEmbedding: EmbeddingModel = {
	specificationVersion: 'v4',
	provider: 'cloudflare-workers-ai',
	modelId: EMBEDDING_MODEL_ID,
	maxEmbeddingsPerCall: MAX_TEXTS_PER_CALL,
	supportsParallelCalls: true,
	async doEmbed({ values, abortSignal, headers }) {
		const accountId = requireEnv('CF_ACCOUNT_ID');
		const apiToken = requireEnv('CF_AI_API_TOKEN');
		const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${EMBEDDING_MODEL_ID}`;

		const res = await fetch(url, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiToken}`,
				'Content-Type': 'application/json',
				...headers
			},
			body: JSON.stringify({ text: values }),
			signal: abortSignal
		});

		const raw = await res.text();
		if (!res.ok) {
			throw new Error(
				`Workers AI embeddings failed (HTTP ${res.status}) for ${EMBEDDING_MODEL_ID}: ${raw.slice(0, 500)}`
			);
		}

		let json: WorkersAIResponse;
		try {
			json = JSON.parse(raw) as WorkersAIResponse;
		} catch {
			throw new Error(`Workers AI returned non-JSON: ${raw.slice(0, 300)}`);
		}
		if (json.success === false) {
			throw new Error(`Workers AI embeddings error: ${JSON.stringify(json.errors ?? json)}`);
		}

		const data = json.result?.data;
		if (!Array.isArray(data) || data.length !== values.length) {
			throw new Error(
				`Workers AI returned ${Array.isArray(data) ? data.length : 'no'} embeddings for ${values.length} inputs: ${raw.slice(0, 300)}`
			);
		}
		const bad = data.find(
			(vec: number[]) => !Array.isArray(vec) || vec.length !== EMBEDDING_DIMENSION
		);
		if (bad) {
			throw new Error(
				`Embedding dimension mismatch: ${EMBEDDING_MODEL_ID} returned ${
					Array.isArray(bad) ? bad.length : typeof bad
				} dims but embeddingDimension is ${EMBEDDING_DIMENSION}. Change the model or CF_EMBEDDING_DIMENSION and re-index.`
			);
		}

		const tokens = json.result?.usage?.prompt_tokens ?? json.result?.usage?.total_tokens;
		return {
			embeddings: data as number[][],
			warnings: [],
			...(typeof tokens === 'number' ? { usage: { tokens } } : {})
		};
	}
};

/** A public post and the body text it is indexed from. */
type IndexedPost = { post: PostMetadata; content: PostBodyContent };

/** Public posts with the body each one indexes, read from `postBodies`. */
export const listPublicPostsForIndex = internalQuery({
	args: {},
	handler: async (ctx): Promise<IndexedPost[]> => {
		const posts = await ctx.db
			.query('posts')
			.withIndex('visibility', (q) => q.eq('visibility', 'public'))
			.order('desc')
			.collect();

		return await Promise.all(
			posts.map(async (post) => ({
				post: toPostMetadata(post),
				content: await getPostBody(ctx, { postId: post._id })
			}))
		);
	}
});

export const getPostMeta = internalQuery({
	args: { postId: v.id('posts') },
	handler: async (ctx, args): Promise<PostMetadata | null> => {
		const post = await ctx.db.get(args.postId);
		if (!post) return null;
		return toPostMetadata(post);
	}
});

const rag = new RAG(components.rag, {
	textEmbeddingModel: workersAIEmbedding,
	embeddingDimension: EMBEDDING_DIMENSION
});

/** Title + description + tags give short posts enough signal to match. */
function buildIndexText(post: PostMetadata, content: PostBodyContent): string {
	const body = content ? extractTextFromDoc(content) : '';
	const header = [post.title, post.description, post.tags?.join(', ')].filter(Boolean).join('\n');
	return [header, body].filter(Boolean).join('\n\n');
}

/**
 * Re-index all public posts into RAG, and drop entries for posts that are no
 * longer public or no longer exist. Safe to re-run; keyed by post id.
 * Internal: it spends embedding quota, so it is not a public function.
 */
export const reindexPosts = internalAction({
	args: {},
	handler: async (ctx) => {
		const posts: IndexedPost[] = await ctx.runQuery(internal.rag.listPublicPostsForIndex, {});
		const liveKeys = new Set<string>();

		let indexed = 0;
		let skipped = 0;
		for (const { post, content } of posts) {
			const text = buildIndexText(post, content);
			if (!text.trim()) {
				skipped++;
				continue;
			}
			await rag.add(ctx, { namespace: 'posts', key: post._id, text });
			liveKeys.add(post._id);
			indexed++;
		}

		// Remove stale entries (unpublished, deleted, or left over from an old model).
		let removed = 0;
		const ns = await rag.getNamespace(ctx, { namespace: 'posts' });
		if (ns) {
			let cursor: string | null = null;
			do {
				const page = await rag.list(ctx, {
					namespaceId: ns.namespaceId,
					paginationOpts: { numItems: 50, cursor }
				});
				for (const entry of page.page) {
					if (!entry.key || liveKeys.has(entry.key)) continue;
					await rag.delete(ctx, { entryId: entry.entryId });
					removed++;
				}
				cursor = page.isDone ? null : page.continueCursor;
			} while (cursor);
		}

		return { indexed, skipped, removed, total: posts.length };
	}
});

/** Search public post content via semantic search. Returns post metadata. */
export const searchPosts = action({
	args: { query: v.string() },
	handler: async (ctx, args) => {
		const query = args.query.trim();
		if (!query) return { results: [] };

		const { entries } = await rag.search(ctx, {
			namespace: 'posts',
			query,
			limit: 10
		});
		const postIds = entries.map((e) => e.key).filter((k): k is string => !!k);
		const posts: (PostMetadata | null)[] = await Promise.all(
			postIds.map(async (rawId) => {
				const postId = rawId as Id<'posts'>;
				return await ctx.runQuery(internal.rag.getPostMeta, { postId });
			})
		);
		// Re-check visibility: a post can be unpublished after it was indexed.
		return { results: posts.filter((p): p is PostMetadata => !!p && p.visibility === 'public') };
	}
});
