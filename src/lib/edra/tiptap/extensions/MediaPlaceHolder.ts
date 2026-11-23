import { mergeAttributes, Node, type NodeViewProps } from '@tiptap/core';
import { SvelteNodeViewRenderer } from '../index.ts';
import type { Component } from 'svelte';
import { NodeSelection } from '@tiptap/pm/state';

export interface MediaPlaceholderOptions {
	HTMLAttributes: Record<string, unknown>;
	onUpload?: (file: File) => Promise<string>;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		mediaPlaceholder: {
			/**
			 * Inserts a media placeholder
			 */
			insertMediaPlaceholder: (options: {
				mediaType: 'image' | 'video' | 'audio' | 'iframe';
			}) => ReturnType;

			/**
			 * Set the upload handler
			 */
			setMediaUploadHandler: (handler: (file: File) => Promise<string>) => ReturnType;

			/**
			 * Upload a media and insert the result
			 */
			uploadMedia: (file: File) => ReturnType;
		};
	}

	interface Storage {
		mediaPlaceholder: {
			onUpload?: (file: File) => Promise<string>;
		};
	}
}

type ImageMeta = { ar?: string; tint?: string };

/**
 * Intrinsic aspect ratio ("w/h", usable as CSS `aspect-ratio`) and average
 * colour of an image file. Returns `{}` when the browser can't decode it (HEIC,
 * corrupt, ...) so the node simply falls back to the unbounded pulse.
 */
async function imageMeta(file: File): Promise<ImageMeta> {
	try {
		// ponytail: 'from-image' so the ratio matches how <img> renders rotated
		// phone photos — otherwise portrait shots get an inverted box.
		const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
		const { width, height } = bitmap;

		// 8x8 rather than 1x1: drawImage's 1x1 downscale is implementation-defined
		// and skews colour; 64 pixels is still nothing and averages honestly.
		const size = 8;
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = size;
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			bitmap.close();
			return { ar: `${width}/${height}` };
		}
		ctx.drawImage(bitmap, 0, 0, size, size);
		bitmap.close();

		// alpha-weighted, so transparent PNGs don't average towards black
		const data = ctx.getImageData(0, 0, size, size).data;
		let r = 0;
		let g = 0;
		let b = 0;
		let weight = 0;
		for (let i = 0; i < data.length; i += 4) {
			const a = data[i + 3];
			r += data[i] * a;
			g += data[i + 1] * a;
			b += data[i + 2] * a;
			weight += a;
		}
		if (weight === 0) return { ar: `${width}/${height}` };

		const hex = (v: number) =>
			Math.round(v / weight)
				.toString(16)
				.padStart(2, '0');
		return { ar: `${width}/${height}`, tint: `#${hex(r)}${hex(g)}${hex(b)}` };
	} catch {
		return {};
	}
}

export const MediaPlaceholder = (component: Component<NodeViewProps>) =>
	Node.create<MediaPlaceholderOptions>({
		name: 'mediaPlaceholder',

		addOptions() {
			return {
				HTMLAttributes: {},
				onUpload: undefined
			};
		},

		addStorage() {
			return {
				onUpload: this.options.onUpload
			};
		},

		addAttributes() {
			return {
				mediaType: {
					default: 'image',
					parseHTML: (element) => element.getAttribute('data-media-type'),
					renderHTML: (attributes) => {
						if (!attributes.mediaType) {
							return {};
						}
						return {
							'data-media-type': attributes.mediaType
						};
					}
				}
			};
		},

		parseHTML() {
			return [{ tag: `div[data-type="${this.name}"]` }];
		},

		renderHTML({ HTMLAttributes }) {
			return [
				'div',
				mergeAttributes({ 'data-type': this.name }, this.options.HTMLAttributes, HTMLAttributes)
			];
		},

		group: 'block',
		draggable: true,
		atom: true,
		content: 'inline*',
		isolating: true,

		addNodeView() {
			return SvelteNodeViewRenderer(component);
		},

		addCommands() {
			return {
				insertMediaPlaceholder:
					(options) =>
					({ commands }) => {
						return commands.insertContent({
							type: this.name,
							attrs: {
								mediaType: options.mediaType
							}
						});
					},

				setMediaUploadHandler:
					(handler) =>
					({ editor }) => {
						editor.storage.mediaPlaceholder.onUpload = handler;
						return true;
					},

				uploadMedia:
					(file: File) =>
					({ editor }) => {
						const onUpload = editor.storage.mediaPlaceholder.onUpload || this.options.onUpload;
						if (!onUpload) {
							throw new Error('onUpload is not defined');
						}

						// Detect mediaType from current selection
						let mediaType = 'image';
						const { selection } = editor.state;
						if (selection instanceof NodeSelection) {
							const selectedNode = selection.node;
							if (selectedNode.type.name === this.name) {
								mediaType = selectedNode.attrs.mediaType;
							}
						}

						// ponytail: measured in parallel with the upload, so the decode never
						// adds latency to the insert below. Images only — decoding a video here
						// would just be wasted work.
						const meta = mediaType === 'image' ? imageMeta(file) : Promise.resolve<ImageMeta>({});

						void onUpload(file)
							.then(async (src) => {
								editor.view.focus();
								if (mediaType === 'audio') {
									editor.commands.setAudio({ src });
								} else if (mediaType === 'video') {
									editor.commands.setVideo({ src });
								} else {
									// ponytail: we still hold the File here, so the real ratio and an
									// average tint are free. They let the node reserve its box before
									// the bytes arrive. Persisting them for already-stored posts is a
									// backfill — not worth it until someone complains.
									const { ar, tint } = await meta;
									editor.commands.insertContent({ type: 'image', attrs: { src, ar, tint } });
								}
							})
							.catch((error) => {
								console.error('Failed to upload media:', error);
							});

						return true;
					}
			};
		}
	});
