<script lang="ts">
	import type { Editor } from '../Editor.ts';
	import { setEditor } from './editorContext.js';
	import { untrack, type Snippet } from 'svelte';

	let { editor, children }: { editor: Editor | undefined; children?: Snippet } = $props();

	untrack(() => {
		if (editor) {
			setEditor(editor);
		}
	});
</script>

{#if editor && children}
	{@render children()}
{/if}
