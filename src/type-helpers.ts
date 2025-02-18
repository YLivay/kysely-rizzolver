import type { Generated } from 'kysely';

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

/**
 * Omit properties of `T` that are of type `never`.
 */
export type OmitNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] };

/**
 * Omit properties of `T` that are of type `ValueType`.
 */
export type OmitByValue<T, ValueType> = OmitNever<{
	[K in keyof T]: T[K] extends ValueType ? never : T[K];
}>;

export type WithMandatory<T, K extends keyof T> = T & { [P in K]-?: T[P] };

type IsNumericField<T> = T extends Generated<number>
	? true
	: number & T extends never
	? never
	: T extends number
	? true
	: never;

export type NumericFields<T> = {
	[K in keyof T]: [IsNumericField<T[K]>] extends [never] ? never : K;
}[keyof T];
