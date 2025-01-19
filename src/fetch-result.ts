import type { Selectable } from 'kysely';
import type { ModelCollection } from './model-collection';

/**
 * A {@link FetchResult} is a result of a fetch operation. It can be one of
 * three types:
 * - {@link FetchOneResult} - A result of a fetch operation that is expected to
 *   return up to one row,
 * - {@link FetchOneXResult} - A result of a fetch operation that is expected to
 *   return exactly one row,
 * - {@link FetchSomeResult} - A result of a fetch operation that is expected to
 *   return any number of rows.
 */
export type FetchResult<DB, T extends keyof DB & string, R extends Partial<Selectable<DB[T]>>> =
	| FetchOneResult<DB, T, R>
	| FetchOneXResult<DB, T, R>
	| FetchSomeResult<DB, T, R>;

/**
 * A {@link FetchOneResult} is a result of a fetch operation that is expected to
 * return up to one row.
 */
export type FetchOneResult<
	DB,
	T extends keyof DB & string,
	R extends Partial<Selectable<DB[T]>> | undefined
> = {
	fetchType: 'fetchOne';
	table: T;
	result: R | undefined;
	models?: ModelCollection<DB>;
	/**
	 * Returns this result as a {@link FetchOneXResult}.
	 *
	 * @throws If the result is null or undefined.
	 */
	asFetchOneX(): FetchOneXResult<DB, T, R & {}>;
};

/**
 * A {@link FetchOneXResult} is a result of a fetch operation that is expected
 * to return exactly one row.
 */
export type FetchOneXResult<
	DB,
	T extends keyof DB & string,
	R extends Partial<Selectable<DB[T]>>
> = {
	fetchType: 'fetchOne';
	table: T;
	result: R;
	models?: ModelCollection<DB>;
	/**
	 * Returns self. This is a no-op, but it's here to make it possible to
	 * cast this object back to a {@link FetchOneXResult}.
	 */
	asFetchOneX(): FetchOneXResult<DB, T, R>;
};

/**
 * A {@link FetchSomeResult} is a result of a fetch operation that is expected
 * to return any number of rows.
 */
export type FetchSomeResult<
	DB,
	T extends keyof DB & string,
	R extends Partial<Selectable<DB[T]>>
> = {
	fetchType: 'fetchSome';
	table: T;
	result: R[];
	models?: ModelCollection<DB>;
};

/**
 * Used to type juggle between {@link FetchResult} and its subtypes.
 */
export type AsFetchOneResult<T extends FetchResult<any, string, Selectable<any>>> =
	T extends FetchResult<infer DB, infer T, infer R> ? FetchOneResult<DB, T, R> : never;

/**
 * Used to type juggle between {@link FetchResult} and its subtypes.
 */
export type AsFetchOneXResult<T extends FetchResult<any, string, Selectable<any>>> =
	T extends FetchResult<infer DB, infer T, infer R> ? FetchOneXResult<DB, T, R> : never;

/**
 * Used to type juggle between {@link FetchResult} and its subtypes.
 */
export type AsFetchSomeResult<T extends FetchResult<any, string, Selectable<any>>> =
	T extends FetchResult<infer DB, infer T, infer R> ? FetchSomeResult<DB, T, R> : never;

/**
 * Creates a new {@link FetchOneResult} instance.
 */
export function newFetchOneResult<
	DB,
	T extends keyof DB & string,
	R extends Partial<Selectable<DB[T]>>
>(table: T, result: R | undefined, models?: ModelCollection<DB>) {
	const ref = { value: null as any as FetchOneXResult<DB, T, R> };

	const me: FetchOneResult<DB, T, R> = {
		fetchType: 'fetchOne' as const,
		table,
		result,
		models,
		asFetchOneX() {
			if (!me.result) {
				throw new Error('Expected a fetchOneX result');
			}

			return ref.value;
		}
	};

	ref.value = me as FetchOneXResult<DB, T, R>;

	return me;
}

/**
 * Creates a new {@link FetchOneXResult} instance.
 *
 * Note: it may be counterintuitive, but this function accepts `undefined` as
 * input. I found it is way more convenient to assert the type once in this
 * funciton rather than in every caller.
 */
export function newFetchOneXResult<
	DB,
	T extends keyof DB & string,
	R extends Partial<Selectable<DB[T]>>
>(table: T, result: R | undefined, models?: ModelCollection<DB>) {
	if (!result) {
		throw new Error('Expected a fetchOneX result');
	}

	const ref = { value: null as any as FetchOneXResult<DB, T, R> };

	const me: FetchOneXResult<DB, T, R> = {
		fetchType: 'fetchOne' as const,
		table,
		result,
		models,
		asFetchOneX() {
			return ref.value;
		}
	};

	ref.value = me;

	return me;
}

/**
 * Creates a new {@link FetchSomeResult} instance.
 */
export function newFetchSomeResult<
	DB,
	T extends keyof DB & string,
	R extends Partial<Selectable<DB[T]>>
>(table: T, result: R[], models?: ModelCollection<DB>) {
	return {
		fetchType: 'fetchSome' as const,
		table,
		result,
		models
	} as FetchSomeResult<DB, T, R>;
}

export function isFetchResult(result: unknown): result is FetchResult<any, any, any> {
	return (
		!!result &&
		typeof result === 'object' &&
		'fetchType' in result &&
		!!result.fetchType &&
		typeof result.fetchType === 'string' &&
		'table' in result &&
		!!result.table &&
		typeof result.table === 'string' &&
		'result' in result &&
		(result.result === undefined ||
			typeof result.result === 'object' ||
			(Array.isArray(result.result) && result.result.every((r) => !!r && typeof r === 'object')))
	);
}

/**
 * Checks if `value` is a {@link FetchOneResult}.
 */
export function isFetchOneResult<
	DB,
	T extends keyof DB & string,
	R extends Partial<Selectable<DB[T]>>
>(value: FetchOneResult<DB, T, R> | FetchOneXResult<DB, T, R>): value is typeof value;
export function isFetchOneResult(
	value: unknown
): value is FetchOneResult<any, string, Selectable<any>>;
export function isFetchOneResult(
	value: unknown
): value is FetchOneResult<any, string, Selectable<any>> {
	return isFetchResult(value) && value.fetchType === 'fetchOne' && !Array.isArray(value.result);
}

/**
 * Checks if `value` is a {@link FetchOneXResult}.
 */
export function isFetchOneXResult<
	DB,
	T extends keyof DB & string,
	R extends Partial<Selectable<DB[T]>>
>(value: FetchOneResult<DB, T, R>): value is FetchOneXResult<DB, T, R>;
export function isFetchOneXResult<
	DB,
	T extends keyof DB & string,
	R extends Partial<Selectable<DB[T]>>
>(value: FetchOneXResult<DB, T, R>): value is typeof value;
export function isFetchOneXResult(
	value: unknown
): value is FetchOneXResult<any, string, Selectable<any>>;
export function isFetchOneXResult(
	value: unknown
): value is FetchOneXResult<any, string, Selectable<any>> {
	return (
		isFetchResult(value) &&
		value.fetchType === 'fetchOne' &&
		!Array.isArray(value.result) &&
		!!value.result
	);
}

/**
 * Checks if `value` is a {@link FetchSomeResult}.
 */
export function isFetchSomeResult<
	DB,
	T extends keyof DB & string,
	R extends Partial<Selectable<DB[T]>>
>(value: FetchSomeResult<DB, T, R>): value is typeof value;
export function isFetchSomeResult(
	value: unknown
): value is FetchSomeResult<any, string, Selectable<any>>;
export function isFetchSomeResult(
	value: unknown
): value is FetchSomeResult<any, string, Selectable<any>> {
	return isFetchResult(value) && value.fetchType === 'fetchSome' && Array.isArray(value.result);
}

/**
 * Asserts that `value` is a {@link FetchOneResult}.
 */
export function assertIsFetchOneResult(
	value: unknown
): asserts value is FetchOneResult<any, string, Selectable<any>> {
	if (!isFetchOneResult(value)) {
		throw new Error('Expected a fetchOne result');
	}
}

/**
 * Asserts that `value` is a {@link FetchOneXResult}.
 */
export function assertIsFetchOneXResult(
	value: unknown
): asserts value is FetchOneXResult<any, string, Selectable<any>> {
	if (!isFetchOneXResult(value)) {
		throw new Error('Expected a fetchOne result with a non-null, non undefined result');
	}
}

/**
 * Asserts that `value` is a {@link FetchSomeResult}.
 */
export function assertIsFetchSomeResult(
	value: unknown
): asserts value is FetchSomeResult<any, string, Selectable<any>> {
	if (!isFetchSomeResult(value)) {
		throw new Error('Expected a fetchSome result');
	}
}
