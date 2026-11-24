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
			 * Upload one or more media files and insert the result.
			 * Files are inserted in the order they were given, whatever order their
			 * uploads happen to finish in.
			 */
			uploadMedia: (files: File | File[]) => ReturnType;
		};
	}

	interface Storage {
		mediaPlaceholder: {
			onUpload?: (file: File) => Promise<string>;
		};
	}
}

type ImageMeta = { ar?: string; tint?: string };
type MediaType = 'image' | 'video' | 'audio' | 'iframe';

/** Three compressions in flight: hides the latency without runaway canvas memory. */
const UPLOAD_CONCURRENCY = 3;

const mediaTypeOf = (file: File): MediaType =>
	file.type.startsWith('audio/') ? 'audio' : file.type.startsWith('video/') ? 'video' : 'image';

/**
 * `limit` tasks in flight, results yielded in *input* order — the caller inserts each
 * one as it arrives, so an out-of-order yield would scramble the batch.
 */
async function* inOrder<T, R>(items: T[], task: (item: T) => Promise<R>, limit: number) {
	const queue: Promise<R>[] = [];
	let next = 0;
	while (next < Math.min(limit, items.length)) queue.push(task(items[next++]));

	while (queue.length) {
		const result = await queue.shift()!;
		if (next < items.length) queue.push(task(items[next++]));
		yield result;
	}
}

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
					(input: File | File[]) =>
					({ editor }) => {
						const onUpload = editor.storage.mediaPlaceholder.onUpload || this.options.onUpload;
						if (!onUpload) {
							throw new Error('onUpload is not defined');
						}

						const files = (Array.isArray(input) ? input : [input]).filter((file) => file.size > 0);
						if (!files.length) return false;

						// ponytail: a selected placeholder pins the type, but only for a single file —
						// a batch has to judge each file by its own mime type.
						const { selection } = editor.state;
						const placeholder =
							selection instanceof NodeSelection && selection.node.type.name === this.name
								? selection.node
								: null;
						const pinned: MediaType | null =
							placeholder && files.length === 1 ? placeholder.attrs.mediaType : null;

						const plan = files.map((file) => {
							const type = pinned ?? mediaTypeOf(file);
							return {
								type,
								// ponytail: measured in parallel with the upload, so the decode never
								// adds latency. Images only — decoding a video here is wasted work.
								meta: type === 'image' ? imageMeta(file) : Promise.resolve<ImageMeta>({})
							};
						});

						const uploadOne = (file: File) =>
							onUpload(file).catch((error: unknown) => {
								// one bad file must not take the rest of the batch with it
								console.error('Failed to upload media:', file.name, error);
								return null;
							});

						void (async () => {
							let focused = false;
							let index = 0;
							// ponytail: the batch is placed by position, captured once and then read back
							// after every insert. `insertContent` cannot be used here: it leaves a
							// NodeSelection on the atom it just inserted (Selection.near, bias -1), so the
							// next call *replaces* the previous image — one image per batch
							// (tiptap#3355, tiptap#6401).
							let from = selection.from;
							let to = selection.to;
							for await (const src of inOrder(files, uploadOne, UPLOAD_CONCURRENCY)) {
								const { type, meta } = plan[index++];
								if (editor.isDestroyed) return; // slab collapsed mid-batch
								if (!src) continue;
								// ponytail: focus once — per-file steals would pull the caret out of
								// whatever field the user moved on to.
								if (!focused) {
									editor.view.focus();
									focused = true;
								}
								try {
									if (type === 'audio' || type === 'video') {
										// JSON, not the HTML string setAudio builds: same node, no autoplay.
										editor.commands.insertContentAt({ from, to }, { type, attrs: { src } });
									} else {
										const { ar, tint } = await meta;
										if (editor.isDestroyed) return;
										editor.commands.insertContentAt(
											{ from, to },
											{ type: 'image', attrs: { src, ar, tint } }
										);
									}
									from = to = editor.state.selection.to;
								} catch (error) {
									// ponytail: the doc can shift under an in-flight batch (typing, deleting),
									// leaving `from` out of range. Append rather than lose the rest.
									console.error('Failed to insert media at', from, error);
									from = to = editor.state.doc.content.size;
								}
							}
						})();

						return true;
					}
			};
		}
	});
