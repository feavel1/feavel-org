<script lang="ts">
	import { untrack } from 'svelte';
	import { createEditor, Edra } from './index.ts';
	import type { Content } from '@tiptap/core';

	let {
		editor = $bindable(),
		content,
		editable = true,
		onFileUpload,
		onUpdate,
		callAI,
		onEditorReady
	}: {
		editor?: ReturnType<typeof createEditor>;
		content?: Content;
		editable?: boolean;
		onFileUpload?: (file: File) => Promise<string>;
		onUpdate?: () => void;
		callAI?: (
			prompt: string,
			onChunk: (chunk: string) => void,
			onError: (error: Error) => void
		) => Promise<void>;
		onEditorReady?: (editor: ReturnType<typeof createEditor>) => void;
	} = $props();

	const _ed = untrack(() =>
		createEditor({
			editable,
			onFileUpload,
			onUpdate,
			callAI,
			content
		})
	);
	editor = _ed;
	untrack(() => onEditorReady?.(editor));
</script>

<Edra editor={_ed}>
	<Edra.UseAI />
	<Edra.ToC />
	<Edra.BubbleMenu />
	<Edra.Content />
	<Edra.DragHandle type="extended" />
</Edra>
