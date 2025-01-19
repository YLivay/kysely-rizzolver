import type { Selectable } from 'kysely';
import { type FetchResultFactory, newFetchResultFactory } from './fetch-result-factory';
import { type QueryBuilder, newQueryBuilder as kyNewQueryBuilder } from './query-builder';
import { type Selector, newSelector as kyNewSelector } from './selector';
import {
	type ModelCollection,
	newModelCollection as kyNewModelCollection
} from './model-collection';
import type { FetchResult } from './fetch-result';

export interface KyselyRizzolverBase<DB, T extends Record<keyof DB & string, readonly string[]>> {
	readonly fields: T;
	readonly fetches: FetchResultFactory<DB>;
}

/**
 * A {@link KyselyRizzolver} is a class that is used to define the structure of
 * a database schema.
 *
 * It streamlines instatiating type-safe {@link QueryBuilder}s,
 * {@link Selector}s, {@link ModelCollection}s and {@link FetchResult}s.
 *
 * Define a new {@link KyselyRizzolver} using the
 * {@link KyselyRizzolver.builder|.builderForSchema()} or
 * {@link KyselyRizzolver.builderNoSchema|.builderNoSchema()}.
 */
export class KyselyRizzolver<DB, T extends Record<keyof DB & string, readonly string[]>>
	implements KyselyRizzolverBase<DB, T>
{
	public readonly fields: T;
	public readonly fetches: FetchResultFactory<DB>;

	constructor(fields: T) {
		this.fields = fields;
		this.fetches = newFetchResultFactory<DB>();
	}

	/**
	 * Intantiates a new {@link Selector} for the given table.
	 */
	newSelector<Table extends keyof DB & string, Alias extends string>(table: Table, alias: Alias) {
		return kyNewSelector(this, table, alias);
	}

	/**
	 * Instantiates a new {@link QueryBuilder}.
	 */
	newQueryBuilder() {
		return kyNewQueryBuilder(this);
	}

	/**
	 * Instantiates a new {@link ModelCollection}.
	 */
	newModelCollection() {
		return kyNewModelCollection<DB>();
	}

	/**
	 * Starts building a new {@link KyselyRizzolver} using a builder pattern for
	 * a schema.
	 *
	 * Call {@link KyselyRizzolverBuilderForSchema.table|.table()} for each
	 * table that exists on the `DB` type parameter with all of their column
	 * names as a const array. After all tables have been added, call
	 * {@link KyselyRizzolverBuilderForSchema.build|.build()} to get a new
	 * {@link KyselyRizzolver} instance.
	 *
	 * Example:
	 * ```
	 * const rizzolver = KyselyRizzolver.builderForSchema<DB>()
	 *   .table('user', ['id', 'name', 'email'] as const)
	 *   .table('post', ['id', 'title', 'content', 'authorId'] as const)
	 *   .build();
	 * ```
	 *
	 * Note: The `as const` assertion is necessary for correct type inference.
	 */
	static builderForSchema<DB>() {
		return _newKyselyRizzolverBuilderForSchema<DB, {}>({});
	}

	/**
	 * Starts building a new {@link KyselyRizzolver} using a builder pattern
	 * without a schema.
	 *
	 * Call {@link KyselyRizzolverBuilderNoSchema.table|.table()} for each
	 * table with all of their column names as a const array.
	 *
	 * Example:
	 * ```
	 * const rizzolver = KyselyRizzolver.builder()
	 *     .table('user', ['id', 'name', 'email'] as const) // note `as const` is necessary
	 *     .table('post', ['id', 'title', 'content', 'authorId'] as const)
	 *     .build();
	 * ```
	 *
	 * Since this version of builder is schemaless, it cannot infer the value
	 * types for the columns. The `user` type will be `{ id: unknown, name:
	 * unknown, email: unknown }`.
	 *
	 * You may call
	 * {@link KyselyRizzolverBuilderNoSchema.asModel|.asModel\<M\>()}
	 * immediately after the .table() call to provide the types, where `M` is an
	 * type like `{ column1: type1, column2: type2, ... }`.
	 *
	 * Example:
	 * ```
	 * const rizzolver = KyselyRizzolver.builder()
	 *     .table('user', ['id', 'name', 'email'] as const)
	 *     .asModel<{id: number, name: string, email: string}>()
	 *     .table('post', ['id', 'title', 'content', 'authorId'] as const)
	 *     .asModel<{id: number, title: string, content: string, authorId: number}>()
	 *     .build();
	 * ```
	 *
	 * p.s. if your .table() and .asModel() columns differ, it will let you know
	 * at compile time ;)
	 *
	 * Once all tables have been added, call
	 * {@link KyselyRizzolverBuilderNoSchema.build|.build()} to get a new
	 * {@link KyselyRizzolver} instance.
	 */
	static builderNoSchema() {
		return _newKyselyRizzolverBuilderNoSchema({}, null);
	}
}

export type KyselyRizzolverBuilderForSchema<
	DB,
	T extends Partial<Record<keyof DB & string, readonly string[]>>
> = {
	table<K extends Exclude<keyof DB & string, keyof T>, U extends readonly (keyof DB[K])[]>(
		name: K,
		fields: U &
			([keyof DB[K]] extends [U[number]]
				? unknown
				: `Missing key: ${Exclude<keyof DB[K] & string, U[number]>}`)
	): KyselyRizzolverBuilderForSchema<DB, T & { [key in K]: U }>;
	build(): T extends Record<keyof DB & string, readonly string[]> ? KyselyRizzolver<DB, T> : never;
};

export type KyselyRizzolverBuilderNoSchema<
	T extends Record<string, { model: any; columns: readonly string[] }>,
	Last extends keyof T | null
> = {
	table<K extends string, U extends readonly string[]>(
		name: K,
		fields: U
	): KyselyRizzolverBuilderNoSchema<
		T & { [k in K]: { model: Record<U[number], unknown>; columns: U } },
		K
	>;
	asModel<M>(): Last extends keyof T
		? keyof M extends T[Last]['columns'][number]
			? T[Last]['columns'][number] extends keyof M
				? KyselyRizzolverBuilderNoSchema<
						T & { [k in Last]: { model: M; columns: T[k]['columns'] } },
						never
					>
				: `column '${Exclude<T[Last]['columns'][number], keyof M & string>}' defined in table() but missing from asModel()`
			: `column '${Exclude<keyof M & string, T[Last]['columns'][number]>}' defined in asModel() but missing from table()`
		: `asModel() must be called after table()`;
	build(): KyselyRizzolver<{ [k in keyof T]: T[k]['model'] }, { [k in keyof T]: T[k]['columns'] }>;
};

function _newKyselyRizzolverBuilderForSchema<
	DB,
	T extends Partial<Record<keyof DB & string, readonly string[]>>
>(fields: T) {
	return {
		table<K extends keyof DB & string, U extends readonly (keyof DB[K])[]>(
			tableName: K,
			tableFields: U &
				([keyof DB[K]] extends [U[number]]
					? unknown
					: `Missing key: ${Exclude<keyof DB[K] & string, U[number]>}`)
		) {
			return _newKyselyRizzolverBuilderForSchema<DB, T & { [key in K]: typeof tableFields }>({
				...fields,
				[tableName]: tableFields
			}) as any;
		},
		build() {
			return new KyselyRizzolver(fields);
		}
	} as unknown as KyselyRizzolverBuilderForSchema<DB, T>;
}

function _newKyselyRizzolverBuilderNoSchema<
	T extends Record<string, { model: any; columns: readonly string[] }>,
	Last extends keyof T | null
>(fields: T, last: Last) {
	return {
		table<K extends string, U extends readonly string[]>(tableName: K, tableFields: U) {
			return _newKyselyRizzolverBuilderNoSchema<
				T & { [k in K]: { model: Record<U[number], unknown>; columns: U } },
				K
			>(
				{
					...fields,
					[tableName]: {
						model: null as any as Record<U[number], unknown>,
						columns: tableFields
					}
				},
				tableName
			);
		},
		asModel<M>() {
			if (!last) {
				throw new Error('asModel() must be called after table()');
			}

			return _newKyselyRizzolverBuilderNoSchema<
				T & { [k in typeof last]: { model: M; columns: T[typeof last]['columns'] } },
				null
			>(fields, null);
		},
		build() {
			return new KyselyRizzolver(
				Object.fromEntries(Object.entries(fields).map((entry) => [entry[0], entry[1].columns]))
			);
		}
	} as unknown as KyselyRizzolverBuilderNoSchema<T, Last>;
}

export type KyDB<KY extends KyselyRizzolverBase<any, any>> =
	KY extends KyselyRizzolverBase<infer DB, any> ? DB : never;

export type TableName<T extends KyselyRizzolverBase<any, any>> = keyof KyDB<T> & string;

/**
 * A union of all the known fields of a table.
 */
export type AnyTableField<
	KY extends KyselyRizzolverBase<any, any>,
	Table extends TableName<KY>
> = keyof KyDB<KY>[Table] & string;

/**
 * An array of all the known fields of a table, in a type that is compatible
 * with that table's ${@link Selectable} type.
 */
export type AllTableFields<KY extends KyselyRizzolverBase<any, any>, Table extends TableName<KY>> =
	KY extends KyselyRizzolverBase<any, infer T>
		? T[Table] extends infer U
			? U extends readonly AnyTableField<KY, Table>[]
				? U
				: never
			: never
		: never;
