/**
 * I can't explain this.
 *
 * I badgered ChatGPT until it worked. it probably just referenced type-fest.
 */
type LastInUnion<U> = (U extends any ? () => U : never) extends infer F
	? (F extends any ? (k: F) => void : never) extends (k: infer I) => void
		? I extends () => infer R
			? R
			: never
		: never
	: never;

/**
 * Recursively converts a union type to a tuple by splitting it into its head and tail.
 */
export type UnionToTuple<U, Last = LastInUnion<U>> = [U] extends [never]
	? []
	: [...UnionToTuple<Exclude<U, Last>>, Last];
