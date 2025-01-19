import type { Selectable } from 'kysely';
import {
	assertIsFetchOneResult,
	assertIsFetchOneXResult,
	assertIsFetchSomeResult,
	type FetchOneResult,
	type FetchOneXResult,
	type FetchSomeResult,
	isFetchOneResult,
	isFetchOneXResult,
	isFetchSomeResult,
	newFetchOneResult,
	newFetchOneXResult,
	newFetchSomeResult
} from './fetch-result';
import { type ModelCollection, newModelCollection } from './model-collection';

/**
 * A {@link FetchResultFactory} exposes variants of fetch-related functions, but
 * with the `DB` type parameter already set.
 *
 * This makes it less verbose to work with fetch results in a type-safe way.
 */
export type FetchResultFactory<DB> = ReturnType<typeof newFetchResultFactory<DB>>;

export function newFetchResultFactory<DB>() {
	return {
		/**
		 * Creates a new {@link FetchOneResult} instance.
		 */
		newFetchOne<K extends keyof DB & string>(
			table: K,
			result: Selectable<DB[K]> | undefined,
			models?: ModelCollection<DB>
		) {
			models ??= newModelCollection<DB>();
			if (result) {
				models.add(table, result);
			}

			return newFetchOneResult<DB, K, Selectable<DB[K]>>(table, result, models);
		},

		/**
		 * Creates a new {@link FetchOneXResult} instance.
		 *
		 * Note: it may be counterintuitive, but this function accepts `undefined` as
		 * input. I found it is way more convenient to assert the type once in this
		 * funciton rather than in every caller.
		 */
		newFetchOneX<K extends keyof DB & string>(
			table: K,
			result: Selectable<DB[K]> | undefined,
			models?: ModelCollection<DB>
		) {
			models ??= newModelCollection<DB>();
			if (result) {
				models.add(table, result);
			}

			return newFetchOneXResult<DB, K, Selectable<DB[K]>>(table, result, models);
		},

		/**
		 * Creates a new {@link FetchSomeResult} instance.
		 */
		newFetchSome<K extends keyof DB & string>(
			table: K,
			result: Selectable<DB[K]>[],
			models?: ModelCollection<DB>
		) {
			models ??= newModelCollection<DB>();
			for (const item of result) {
				models.add(table, item);
			}

			return newFetchSomeResult<DB, K, Selectable<DB[K]>>(table, result, models);
		},

		/**
		 * Checks if a {@link FetchResult} is a {@link FetchOneResult}.
		 */
		isFetchOne<K extends keyof DB & string>(
			table: K,
			result: unknown
		): result is FetchOneResult<DB, K, Selectable<DB[K]>> {
			return isFetchOneResult(result) && result.table === table;
		},

		/**
		 * Checks if a {@link FetchResult} is a {@link FetchOneXResult}.
		 */
		isFetchOneX<K extends keyof DB & string>(
			table: K,
			result: unknown
		): result is FetchOneXResult<DB, K, Selectable<DB[K]>> {
			return isFetchOneXResult(result) && result.table === table;
		},

		/**
		 * Checks if a {@link FetchResult} is a {@link FetchSomeResult}.
		 */
		isFetchSome<K extends keyof DB & string>(
			table: K,
			result: unknown
		): result is FetchSomeResult<DB, K, Selectable<DB[K]>> {
			return isFetchSomeResult(result) && result.table === table;
		},

		/**
		 * Asserts that a {@link FetchResult} is a {@link FetchOneResult}.
		 */
		assertIsFetchOne<K extends keyof DB & string>(
			table: K,
			result: unknown
		): asserts result is FetchOneResult<DB, K, Selectable<DB[K]>> {
			assertIsFetchOneResult(result);

			if (result.table !== table) {
				throw new Error(`Expected a fetchOne result for table ${table}`);
			}
		},

		/**
		 * Asserts that a {@link FetchResult} is a {@link FetchOneXResult}.
		 */
		assertIsFetchOneX<K extends keyof DB & string>(
			table: K,
			result: unknown
		): asserts result is FetchOneXResult<DB, K, Selectable<DB[K]>> {
			assertIsFetchOneXResult(result);

			if (result.table !== table) {
				throw new Error(`Expected a fetchOne result with a non-null non for table ${table}`);
			}
		},

		/**
		 * Asserts that a {@link FetchResult} is a {@link FetchSomeResult}.
		 */
		assertIsFetchSome<K extends keyof DB & string>(
			table: K,
			result: unknown
		): asserts result is FetchSomeResult<DB, K, Selectable<DB[K]>> {
			assertIsFetchSomeResult(result);

			if (result.table !== table) {
				throw new Error(`Expected a fetchSome result for table ${table}`);
			}
		}
	};
}
