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
} from './fetch-result.js';
import { type ModelCollection, newModelCollection } from './model-collection.js';
import type { TableName } from './kysely-rizzolver.js';

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
		newFetchOne<Table extends TableName<DB>>(
			table: Table,
			result: Selectable<DB[Table]> | undefined,
			models?: ModelCollection<DB>
		) {
			models ??= newModelCollection<DB>();
			if (result) {
				models.add(table, result);
			}

			return newFetchOneResult<DB, Table, Selectable<DB[Table]>>(table, result, models);
		},

		/**
		 * Creates a new {@link FetchOneXResult} instance.
		 *
		 * Note: it may be counterintuitive, but this function accepts `undefined` as
		 * input. I found it is way more convenient to assert the type once in this
		 * funciton rather than in every caller.
		 */
		newFetchOneX<Table extends TableName<DB>>(
			table: Table,
			result: Selectable<DB[Table]> | undefined,
			models?: ModelCollection<DB>
		) {
			models ??= newModelCollection<DB>();
			if (result) {
				models.add(table, result);
			}

			return newFetchOneXResult<DB, Table, Selectable<DB[Table]>>(table, result, models);
		},

		/**
		 * Creates a new {@link FetchSomeResult} instance.
		 */
		newFetchSome<Table extends TableName<DB>>(
			table: Table,
			result: Selectable<DB[Table]>[],
			models?: ModelCollection<DB>
		) {
			models ??= newModelCollection<DB>();
			for (const item of result) {
				models.add(table, item);
			}

			return newFetchSomeResult<DB, Table, Selectable<DB[Table]>>(table, result, models);
		},

		/**
		 * Checks if a {@link FetchResult} is a {@link FetchOneResult}.
		 */
		isFetchOne<Table extends TableName<DB>>(
			table: Table,
			result: unknown
		): result is FetchOneResult<DB, Table, Selectable<DB[Table]>> {
			return isFetchOneResult(result) && result.table === table;
		},

		/**
		 * Checks if a {@link FetchResult} is a {@link FetchOneXResult}.
		 */
		isFetchOneX<Table extends TableName<DB>>(
			table: Table,
			result: unknown
		): result is FetchOneXResult<DB, Table, Selectable<DB[Table]>> {
			return isFetchOneXResult(result) && result.table === table;
		},

		/**
		 * Checks if a {@link FetchResult} is a {@link FetchSomeResult}.
		 */
		isFetchSome<Table extends TableName<DB>>(
			table: Table,
			result: unknown
		): result is FetchSomeResult<DB, Table, Selectable<DB[Table]>> {
			return isFetchSomeResult(result) && result.table === table;
		},

		/**
		 * Asserts that a {@link FetchResult} is a {@link FetchOneResult}.
		 */
		assertIsFetchOne<Table extends TableName<DB>>(
			table: Table,
			result: unknown
		): asserts result is FetchOneResult<DB, Table, Selectable<DB[Table]>> {
			assertIsFetchOneResult(result);

			if (result.table !== table) {
				throw new Error(`Expected a fetchOne result for table ${table}`);
			}
		},

		/**
		 * Asserts that a {@link FetchResult} is a {@link FetchOneXResult}.
		 */
		assertIsFetchOneX<Table extends TableName<DB>>(
			table: Table,
			result: unknown
		): asserts result is FetchOneXResult<DB, Table, Selectable<DB[Table]>> {
			assertIsFetchOneXResult(result);

			if (result.table !== table) {
				throw new Error(`Expected a fetchOne result with a non-null non for table ${table}`);
			}
		},

		/**
		 * Asserts that a {@link FetchResult} is a {@link FetchSomeResult}.
		 */
		assertIsFetchSome<Table extends TableName<DB>>(
			table: Table,
			result: unknown
		): asserts result is FetchSomeResult<DB, Table, Selectable<DB[Table]>> {
			assertIsFetchSomeResult(result);

			if (result.table !== table) {
				throw new Error(`Expected a fetchSome result for table ${table}`);
			}
		}
	};
}
