/*
	Installed from @ieedan/std
*/

/** Converts a `camelCase` string to a `PascalCase` string (makes first letter uppercase)
 *
 * @param str
 * @returns
 *
 * ## Usage
 * ```ts
 * camelToPascal('helloWorld'); // HelloWorld
 * ```
 */
export function camelToPascal(str: string): string {
	return `${str[0].toLocaleUpperCase()}${str.slice(1)}`;
}
