/**
 * STUB — replaces Ark UI's `createListCollection`.
 * shadcn-svelte's `select` takes a plain items array; this keeps the old shape.
 */
export interface ListCollectionItem {
	label: string;
	value: string;
	disabled?: boolean;
}

export function createListCollection<T extends ListCollectionItem>(opts: { items: T[] }) {
	return {
		items: opts.items,
		get size() {
			return opts.items.length;
		},
		has: (value: string) => opts.items.some((i) => i.value === value),
		getItem: (value: string) => opts.items.find((i) => i.value === value)
	};
}
