# `src/lib/ui` — shadcn-svelte slots

These are **stubs** left after removing the Ark UI primitives. Each module matches the
export shape of the corresponding `shadcn-svelte` component so call sites keep compiling.

Replace them by running the shadcn CLI (`npx shadcn-svelte@latest add dialog drawer avatar
select tabs popover dropdown-menu sonner`) and deleting the stub files it overwrites.

See `docs/ui-migration.md` for the two bespoke cases (`image-cropper`, `password`)
that shadcn does not provide.
