import { RAG } from '@convex-dev/rag';
import { v } from 'convex/values';
import { action, internalQuery } from './_generated/server';
import { components } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { createOpenAI } from '@ai-sdk/openai';

type PostMeta = Pick<
	Doc<'posts'>,
	| '_id'
	| '_creationTime'
	| 'title'
	| 'description'
	| 'visibility'
	| 'tags'
	| 'category'
	| 'authorId'
	| 'createdAt'
	| 'updatedAt'
>;

/** Recursively extract plain text from a ProseMirror doc JSON. */
function extractTextFromDoc(node: any): string {
	if (!node) return '';
	if (typeof node === 'string') return node;
	if (node.text) return node.text;
	if (node.content) return node.content.map(extractTextFromDoc).join(' ');
	return '';
}

export const listPublicPostIds = internalQuery({
	args: {},
	handler: async (ctx) => {
		return await ctx.db
			.query('posts')
			.withIndex('visibility', (q) => q.eq('visibility', 'public'))
			.order('desc')
			.collect();
	}
});

export const getPostMeta = internalQuery({
	args: { postId: v.id('posts') },
	handler: async (ctx, args): Promise<PostMeta | null> => {
		const post = await ctx.db.get(args.postId);
		if (!post) return null;
		const { content: _, ...meta } = post;
		return meta;
	}
});

const rag = new RAG(components.rag, {
	textEmbeddingModel: createOpenAI({
		baseURL: 'https://api-inference.modelscope.cn/v1',
		apiKey: process.env.MODELSCOPE_API_TOKEN ?? ''
	}).embedding('Qwen/Qwen3-Embedding-8B'),
	embeddingDimension: 4096
});

/** Re-index all public posts into RAG. Call after deploy or when posts change. */
export const reindexPosts = action({
	args: {},
	handler: async (ctx) => {
		const posts: Doc<'posts'>[] = await ctx.runQuery('rag:listPublicPostIds' as any, {});
		for (const p of posts) {
			const text = p.content ? extractTextFromDoc(p.content) : '';
			if (!text) continue;
			await rag.add(ctx, {
				namespace: 'posts',
				key: p._id,
				text
			});
		}
	}
});

/** Search public post content via semantic search. Returns post metadata. */
export const searchPosts = action({
	args: { query: v.string() },
	handler: async (ctx, args) => {
		const { entries } = await rag.search(ctx, {
			namespace: 'posts',
			query: args.query,
			limit: 10
		});
		const postIds = entries.map((e) => e.key).filter((k): k is string => !!k);
		const posts: (PostMeta | null)[] = await Promise.all(
			postIds.map((id) =>
				ctx.runQuery('rag:getPostMeta' as any, {
					postId: id as Id<'posts'>
				})
			)
		);
		return { results: posts.filter((p): p is PostMeta => !!p) };
	}
});
