import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';

/**
 * Files dragged in from the OS, or pasted as screenshots, become editor media. The
 * upload stays in `MediaPlaceholder.uploadMedia`; this only catches the event, moves
 * the caret to the pointer, and hands over the files.
 *
 * ponytail: a ProseMirror plugin, not listeners on `view.dom` — every editor gets it,
 * and `handleDrop` already knows the drop position.
 */
const pluginKey = new PluginKey('fileDrop');

const filesOf = (transfer: DataTransfer | null | undefined): File[] =>
	transfer ? Array.from(transfer.files).filter((file) => file.size > 0) : [];

export const FileDrop = () =>
	Extension.create({
		name: 'fileDrop',

		addProseMirrorPlugins() {
			return [
				new Plugin({
					key: pluginKey,
					props: {
						// `moved` is an internal node drag; those carry no files, but leaving them
						// alone is cheaper than merging the two behaviours later.
						handleDrop: (view, event, _slice, moved) => {
							if (moved) return false;
							const files = filesOf(event.dataTransfer);
							if (!files.length) return false;

							// Land where dropped, not at the old caret. insertContent advances the
							// selection after each insert, so the rest stack up underneath.
							const at = view.posAtCoords({ left: event.clientX, top: event.clientY });
							if (at) {
								const { doc, tr } = view.state;
								view.dispatch(tr.setSelection(TextSelection.near(doc.resolve(at.pos))));
							}

							this.editor.commands.uploadMedia(files);
							return true; // ProseMirror calls preventDefault() once we return true
						},

						handlePaste: (_view, event) => {
							const files = filesOf(event.clipboardData);
							if (!files.length) return false;

							this.editor.commands.uploadMedia(files); // screenshots land at the caret
							return true;
						}
					}
				})
			];
		}
	});
