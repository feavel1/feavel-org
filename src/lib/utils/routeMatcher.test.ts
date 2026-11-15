import { describe, expect, it } from 'vitest';
import { createRouteMatcher } from './routeMatcher.js';

/**
 * These tests guard the route matcher used by `hooks.server.ts` to decide which
 * paths bypass authentication. A silent behaviour change here is a security bug,
 * so the public-route patterns are pinned exactly as the app configures them.
 */
describe('createRouteMatcher', () => {
	// Mirrors the `isPublic` matcher in src/hooks.server.ts.
	const isPublic = createRouteMatcher([
		'/',
		'/signin',
		'/create',
		'/services{/*rest}',
		'/api/auth{/*rest}',
		'/api{/*rest}',
		'/posts{/*rest}',
		'/docs{/*rest}',
		'/demo{/*rest}'
	]);

	it('matches exact paths', () => {
		expect(isPublic('/')).toBe(true);
		expect(isPublic('/signin')).toBe(true);
		expect(isPublic('/create')).toBe(true);
	});

	it('matches optional-wildcard segments at the index and below', () => {
		expect(isPublic('/services')).toBe(true);
		expect(isPublic('/services/123')).toBe(true);
		expect(isPublic('/posts/a/b')).toBe(true);
		expect(isPublic('/docs/intro')).toBe(true);
		expect(isPublic('/demo/x')).toBe(true);
	});

	it('matches nested api routes', () => {
		expect(isPublic('/api/auth/signin')).toBe(true);
		expect(isPublic('/api/x')).toBe(true);
	});

	it('does NOT match protected routes', () => {
		expect(isPublic('/private')).toBe(false);
		expect(isPublic('/admin')).toBe(false);
		expect(isPublic('/signin/extra')).toBe(false);
		expect(isPublic('/servicing')).toBe(false);
	});

	it('does not match a protected child of a public segment', () => {
		// `/services{/*rest}` is public, but a sibling like `/service` must not be.
		expect(isPublic('/service')).toBe(false);
	});

	it('supports a top-level RegExp pattern', () => {
		const matcher = createRouteMatcher(/^\/regex\/\d+$/);
		expect(matcher('/regex/42')).toBe(true);
		expect(matcher('/regex/abc')).toBe(false);
	});

	it('accepts a single pattern as well as an array', () => {
		expect(createRouteMatcher('/solo')('/solo')).toBe(true);
		expect(createRouteMatcher('/solo')('/other')).toBe(false);
	});

	it('throws a helpful error for invalid patterns', () => {
		// Patterns are compiled eagerly, so a bad pattern fails at construction
		// time rather than silently allowing or blocking traffic later.
		expect(() => createRouteMatcher('/(unclosed')).toThrow(/Invalid path/);
	});
});
