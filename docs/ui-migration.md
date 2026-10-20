# UI migration: Ark UI primitives → shadcn-svelte

The hand-rolled `src/lib/primitives/ui/` wrappers (Ark UI + svelte-toolbelt + runed) were removed.
`shadcn-svelte` replaces them. This file records what each one did so the port is mechanical.

Primitives to install from shadcn: `dialog`, `drawer`, `avatar`, `select`, `tabs`, `popover`, `dropdown-menu`, `field`, `input`, `button`.

## Direct name mapping

| Was (Ark UI wrapper)                                                | shadcn-svelte equivalent              |
| ------------------------------------------------------------------- | ------------------------------------- |
| `Dialog.Root/Trigger/Content/Header/Footer/Title/Description/Close` | `dialog/*` — same shape               |
| `Drawer.*`                                                          | `drawer/*` (vaul-svelte) — same shape |
| `Avatar.Root/Image/Fallback`                                        | `avatar/*`                            |
| `Select.Root/Trigger/Content/Item/ItemText/ItemIndicator`           | `select/*`                            |
| `Tabs.Root/List/Trigger/Content`                                    | `tabs/*`                              |
| `Popover.Root/Trigger/Content`                                      | `popover/*`                           |
| `Menu.Root/Trigger/Content/Item`                                    | `dropdown-menu/*`                     |

## Two exceptions worth reading before you swap

### Image cropper — `ImageCropper.*` (was `primitives/ui/image-cropper/`)

Not an Ark UI primitive; it was bespoke on top of **`svelte-easy-crop`**. shadcn has no cropper.
Pieces it provided:

- `Root` — owns open/tempUrl/pixelCrop state, validates MIME against
  `image/apng, avif, gif, jpeg, png, svg+xml, webp`, creates + revokes object URLs.
- `Cropper` — wraps `svelte-easy-crop`'s `<Cropper>`; stores `e.pixels` on `cropcomplete`.
- `Crop` — calls the canvas crop.
- `getCroppedImg(src, pixelCrop, rotation)` — canvas: sizes to a sqrt(2)-padded safe area,
  translates to center, rotates, `drawImage`, `getImageData`, resizes canvas to crop box,
  `putImageData` at an offset, returns `URL.createObjectURL(pngBlob)`.
- `getFileFromUrl(url, name)` — `fetch` → `blob` → `new File`.

**To reimplement:** keep `svelte-easy-crop` (or `bits-ui` + a crop lib) and port the canvas
function verbatim — it is the only non-obvious part. The consumers are
`CreateOrganization`, `GeneralSettings`, `ProfileInfo`.

### Password — `Password.*` (was `primitives/ui/password/`)

Also bespoke, built on **`@zxcvbn-ts/core`** + `runed`'s `Context`/`watch`. Provided:

- `Root` — holds value/hidden/minScore, derives zxcvbn `strength` from the value.
- `Input` — syncs `value`, sets `setCustomValidity('Password is too weak')` when
  `score < minScore`, tracks the input element, listens to form `submit` + `invalid`
  (capture) to flip `submitted`.
- `Strength` — exposes the zxcvbn result for a meter.
- `Error` — only renders after submit; maps `valueMissing` to the placeholder text,
  else falls back to `validationMessage`.
- `ToggleVisibility` / `Copy`.

**To reimplement:** zxcvbn call is 3 lines (`zxcvbnInstance.check(value)`). The subtle part is
the submit/`invalid` capture listeners gating error display — shadcn's `field` component
handles submission state for you, so most of this collapses to `Field` + a local `$derived` strength.

## Kept (not UI-library-specific)

These lived under `primitives/utils/` and were kept — they are plain helpers:

- `utils.ts` → moved to `src/lib/utils.ts`: `cn()` (clsx + tailwind-merge), plus the
  `WithElementRef` / `WithoutChild` / `WithoutChildren` type helpers shadcn-svelte expects.
- `optimizeImage.ts` — canvas-based image downscale before upload.
- `mobileState.svelte.ts` — `useMobileState()` breakpoint state.
- `focusScroll.ts` — `isEditableElement`, `scheduleScrollIntoView`.
- `routeMatcher.ts` — route matching for `hooks.server.ts`.
- `hooks/use-clipboard.svelte.ts` — clipboard helper.
