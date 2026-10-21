import { Audio } from './index.js';
import { SvelteNodeViewRenderer } from '../../index.ts';
import type { Component } from 'svelte';
import type { NodeViewProps } from '@tiptap/core';

export const AudioExtended = (component: Component<NodeViewProps>) =>
	Audio.extend({
		addAttributes() {
			return {
				src: {
					default: null
				},
				title: {
					default: null
				},
				artist: {
					default: null
				}
			};
		},

		addNodeView: () => {
			return SvelteNodeViewRenderer(component);
		}
	});
