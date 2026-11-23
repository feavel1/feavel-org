import type { Node, NodeViewProps } from '@tiptap/core';
import Image, { type ImageOptions } from '@tiptap/extension-image';
import { SvelteNodeViewRenderer } from '../../index.ts';
import type { Component } from 'svelte';

export const ImageExtended = (component: Component<NodeViewProps>): Node<ImageOptions, unknown> => {
	return Image.extend({
		addAttributes() {
			return {
				src: {
					default: null
				},
				alt: {
					default: null
				},
				// ponytail: measured once at insert (MediaPlaceHolder.uploadMedia). `width`
				// is editor layout (a percentage), these two describe the real file so the
				// node can reserve its box before the bytes arrive. Null on anything
				// inserted by URL or authored before this existed — see ImageExtended.svelte.
				ar: {
					default: null
				},
				tint: {
					default: null
				},
				title: {
					default: null
				},
				width: {
					default: '100%'
				},
				height: {
					default: null
				},
				align: {
					default: 'left'
				}
			};
		},
		addNodeView: () => {
			return SvelteNodeViewRenderer(component);
		}
	}).configure({
		allowBase64: false
	});
};
