import { createApi } from '@convex-dev/better-auth';
import schema from './schema';
import { createAuthOptions } from '../auth';

// Better Auth 1.7 adds two atomic adapter operations, which the component
// implements as Convex mutations. They must be exported alongside the rest.
export const {
	create,
	findOne,
	findMany,
	updateOne,
	updateMany,
	deleteOne,
	deleteMany,
	consumeOne,
	incrementOne
} = createApi(schema, createAuthOptions);
