# update packages (exept betterauth and related plugins)

# add admin plugin

## Admin (port from Convex-Better-Auth-UI) — DONE except admin bootstrap

- [x] Copy `lib/admin/**`, `convex/admin/**`, `routes/admin/+page.svelte`
- [x] Copy `convex/model/admin/{roles,index}.ts`
- [x] Copy `convex/betterAuth/{adminUsers,adminOrganizations}.ts`
- [x] Schema: admin fields (`user.role/banned/banReason/banExpires`, `session.impersonatedBy`) + search indexes
- [x] Port all admin UI from `#lib/primitives/ui/*` -> `#lib/ui/*` (our kit)
- [x] menu -> dropdown-menu, ark-ui -> bits-ui, design tokens remapped
- [x] `admin()` Better Auth plugin + impersonation guards + `adminClient()`
- [x] `AUTH_CONSTANTS.admin` flag
- [x] convex codegen, wrangler types, typecheck clean in src/
- [x] **Set `ADMIN_USER_IDS`** on dev deployment, then promote first admin
- [x] Browser-test the dashboard as a real admin

# test payments mechanism
