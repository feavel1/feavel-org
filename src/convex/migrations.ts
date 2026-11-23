import { Migrations } from '@convex-dev/migrations';
import { components } from './_generated/api.js';
import { internalMutation } from './_generated/server';
import type { DataModel } from './_generated/dataModel.js';
import schema from './schema';

// Scaffold for future one-shot migrations: add one with
// `migrations.define({ table, migrateOne })` and run it through `run`.
// The `postBodies` backfill and the `posts.content` drop have both already run
// on the deployment and were deleted along with the column itself.
export const migrations = new Migrations<DataModel, typeof schema>(components.migrations, {
	internalMutation,
	schema
});
export const run = migrations.runner();
