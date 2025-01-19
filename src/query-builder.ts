import type { Selectable } from 'kysely';
import {
	type FetchOneResult,
	type FetchOneXResult,
	type FetchSomeResult,
	newFetchOneResult,
	newFetchOneXResult,
	newFetchSomeResult
} from './fetch-result.js';
import type {
	AllTableFields,
	AnyTableField,
	KyDB,
	KyselyRizzolverBase,
	TableName
} from './kysely-rizzolver.js';
import { type Selector, newSelector, type SelectorResult } from './selector.js';
import { type ModelCollection, newModelCollection } from './model-collection.js';
import type { UnionToTuple } from './type-helpers.js';

/**
 * {@link QueryBuilder} makes it easier to work with multiple tables in a query
 * and parse the results into their respective Kysely {@link Selectable}
 * instances in a type-safe way.
 *
 * It works by adding {@link Selector}s using the {@link QueryBuilder.add}
 * method, followed by a call to {@link QueryBuilder.run} to parse the results
 * of the query using a simple builder pattern.
 */
export interface QueryBuilder<KY extends KyselyRizzolverBase<any, any>, T extends Data<KY>> {
	/**
	 * The record of {@link Selector} this query builder has, keyed by their alias.
	 */
	selectors: T;
	/**
	 * Given a {@link Selector} alias `k`, Gets a `"table as alias"` expression
	 * for that selector.
	 *
	 * This is a shorthand for `this.selectors[k].selectTable`
	 *
	 * Example:
	 * ```
	 * const qb = rizzolver
	 *     .newQueryBuilder()
	 *     .add('user', 'u');
	 *
	 * const userTable = qb.table('u'); // => 'user as u'
	 * ```
	 */
	table<K extends keyof T>(tableAlias: K): T[K]['selectTable'];
	/**
	 * Gets a const array of all the fields of all the {@link Selector}s this
	 * query builder has. The order is arbitrary and should not be relied upon.
	 */
	allFields: FieldsOf<T, keyof T>;
	/**
	 * Given one of more {@link Selector} aliases, gets an array of
	 * `"table.field as alias"` expressions for all of their fields.
	 *
	 * Example:
	 * ```
	 * const qb = rizzolver
	 *     .newQueryBuilder()
	 *     .add('user', 'u')
	 *     .add('address', 'a');
	 *
	 * const userFields = qb.fieldsOf('u');
	 *   // => ['u.id as _u_id', 'u.first_name as _u_first_name', 'u.last_name as _u_last_name']
	 * const addressFields = qb.fieldsOf('a');
	 *   // => ['a.id as _a_id', 'a.street as _a_street', 'a.city as _a_city']
	 * const allFields = qb.fieldsOf('u', 'a');
	 *   // equivalent to [...qb.fieldsOf('u'), ...qb.fieldsOf('a')]
	 *   // => ['u.id as _u_id', 'u.first_name as _u_first_name', 'u.last_name as _u_last_name', 'a.id as _a_id', 'a.street as _a_street', 'a.city as _a_city']
	 * ```
	 */
	fieldsOf<K extends keyof T>(...tableAliases: K[]): FieldsOf<T, K>;
	field<K extends keyof T & string, F extends T[K]['input']['tableFields']>(
		field: `${K}.${F}`
	): {
		value: `_${K}_${F}`;
		from<A extends string>(alias: A): `${A}._${K}_${F}`;
	};
	/**
	 * Adds a new {@link Selector} to the query builder.
	 */
	add<
		Table extends TableName<KY>,
		Alias extends string,
		Keys extends readonly AnyTableField<KY, Table>[] = AllTableFields<KY, Table>
	>(
		selector: Selector<KY, Table, Alias, Keys>
	): MoreData<KY, T, Table, Alias, Keys>;
	/**
	 * Adds a new {@link Selector} to the query builder.
	 */
	add<
		Table extends TableName<KY>,
		Alias extends string,
		Keys extends readonly AnyTableField<KY, Table>[] = AllTableFields<KY, Table>
	>(
		table: Table,
		alias: Alias,
		keys?: Keys
	): MoreData<KY, T, Table, Alias, Keys>;
	/**
	 * Parses the results of a query into the {@link Selectable} instances
	 * defined by the {@link Selector}s this query builder has.
	 *
	 * Example:
	 * ```
	 * const result = await rizzolver
	 *     .newQueryBuilder()
	 *     .add('user', 'u')
	 *     .add('address', 'a')
	 *     .run((qb) =>
	 *         db
	 *             .selectFrom(qb.table('u'))
	 *             .leftJoin(qb.table('a'), (join) => join.onRef('u.address_id', '=', 'a.id'))
	 *             .select(qb.allFields)
	 *             .execute()
	 *     );
	 *
	 * const parsedRows = result.rows;
	 *   // => [
	 *   //      {
	 *   //        row: { id: 1, first_name: 'John', last_name: 'Doe' },
	 *   //        selectors: {
	 *   //          u: { id: 1, first_name: 'John', last_name: 'Doe' },
	 *   //          a: { id: 10, street: '123 Main St', city: 'Springfield' }
	 *   //        }
	 *   //      },
	 *   //      {
	 *   //        row: { id: 2, first_name: 'Jane', last_name: 'Smith' },
	 *   //        selectors: {
	 *   //          u: { id: 2, first_name: 'Jane', last_name: 'Smith' },
	 *   //          a: undefined, // Jane has no address
	 *   //        }
	 *   //      },
	 *   //    ]
	 * ```
	 *
	 * To make it easier to consume the results, the query builder also provides
	 * methods to create {@link FetchOneResult}, {@link FetchOneXResult}, and
	 * {@link FetchSomeResult} instances for each selector by its alias:
	 * ```
	 * const result = await rizzolver
	 *     .newQueryBuilder()
	 *     .add('user', 'u')
	 *     .run(...)
	 *     .newFetchOneResult('u'); // => FetchOneResult<DB, 'user', Selectable<User>>
	 * ```
	 */
	run<Row extends Record<string, unknown>>(rows: Row[]): DeferredResult<KY, T, Row>;
	run<Row extends Record<string, unknown>>(
		callback: (qb: this) => Promise<Row[]>
	): DeferredResult<KY, T, Row>;
}

export function newQueryBuilder<KY extends KyselyRizzolverBase<any, any>>(
	rizzolver: KY
): QueryBuilder<KY, {}> {
	const selectors: Data<KY> = {};

	return {
		selectors,
		table<K extends keyof typeof selectors>(tableAlias: K) {
			return selectors[tableAlias].selectTable as any;
		},
		allFields: Object.values(selectors)
			.map((selector) => selector.selectFields)
			.flat() as any,
		fieldsOf(...tableAliases: (keyof typeof selectors)[]) {
			return tableAliases.map((alias) => selectors[alias].selectFields).flat() as any;
		},
		field(field: string) {
			const [t, f] = field.split('.');
			const alias = `_${t}_${f}` as const;
			return {
				value: alias,
				from<A extends string>(a: A) {
					return `${a}.${alias}` as const;
				}
			} as any;
		},

		add<
			Table extends TableName<KY>,
			Alias extends string,
			Keys extends readonly AnyTableField<KY, Table>[] = AllTableFields<KY, Table>
		>(selectorOrTable: Table | Selector<KY, Table, Alias, Keys>, alias?: Alias, keys?: Keys) {
			let selector: Selector<KY, Table, Alias, Keys>;
			if (typeof selectorOrTable === 'string') {
				if (!alias) {
					throw new Error('Must provide an alias when calling QueryBuilder.add with a table name');
				}
				selector = newSelector(
					rizzolver,
					selectorOrTable,
					alias,
					(keys ?? rizzolver.fields[selectorOrTable]) as Keys
				);
			} else {
				if (alias || keys) {
					throw new Error(
						'Must not provide an alias or keys when calling QueryBuilder.add with a selector'
					);
				}
				selector = selectorOrTable;
			}

			(selectors as any)[selector.input.alias] = selector;
			return this as any;
		},

		run<Row extends Record<string, unknown>>(
			rowsOrCallback: Row[] | ((qb: QueryBuilder<KY, typeof selectors>) => Promise<Row[]>)
		) {
			const promise: DeferredResult<KY, typeof selectors, Row> = (async () => {
				const rows = Array.isArray(rowsOrCallback) ? rowsOrCallback : await rowsOrCallback(this);
				const modelCollection = newModelCollection<KyDB<KY>>();

				const selectorResults = {} as any;
				for (const [alias, selector] of Object.entries(selectors)) {
					const selectorResult = selector.select(rows);

					for (const { model } of selectorResult) {
						if (!model) {
							continue;
						}
						modelCollection.add(selector.input.table, model as any);
					}

					selectorResults[alias] = selectorResult;
				}

				const result: {
					row: Row;
					selectors: Record<keyof typeof selectors, any>;
				}[] = [];

				for (let i = 0; i < rows.length; i++) {
					const row = rows[i];
					const selectedModels = {} as any;
					for (const [alias, selectorResult] of Object.entries(selectorResults)) {
						selectedModels[alias] = (selectorResult as any)[i].model;
					}
					result.push({ row, selectors: selectedModels });
				}

				return <Result<KY, typeof selectors, Row>>{
					first: result.length ? result[0] : undefined,
					rows: result,
					models: modelCollection,
					newFetchOneResult<K extends keyof typeof selectors>(selectorAlias: K) {
						return newFetchOneResult(
							selectors[selectorAlias].input.table,
							(result.length ? result[0] : undefined)?.selectors[selectorAlias],
							modelCollection
						);
					},
					newFetchOneXResult<K extends keyof typeof selectors>(selectorAlias: K) {
						return newFetchOneXResult(
							selectors[selectorAlias].input.table,
							(result.length ? result[0] : undefined)?.selectors[selectorAlias],
							modelCollection
						);
					},
					newFetchSomeResult<K extends keyof typeof selectors>(selectorAlias: K) {
						return newFetchSomeResult(
							selectors[selectorAlias].input.table,
							result.map((r) => r.selectors[selectorAlias]).filter((r) => !!r),
							modelCollection
						);
					}
				};
			})() as any;

			promise.newFetchOneResult = <K extends keyof typeof selectors>(selectorAlias: K) =>
				promise.then((result) => result.newFetchOneResult(selectorAlias));
			promise.newFetchOneXResult = <K extends keyof typeof selectors>(selectorAlias: K) =>
				promise.then((result) => result.newFetchOneXResult(selectorAlias));
			promise.newFetchSomeResult = <K extends keyof typeof selectors>(selectorAlias: K) =>
				promise.then((result) => result.newFetchSomeResult(selectorAlias));

			return promise;
		}
	};
}

type Data<KY extends KyselyRizzolverBase<any, any>> = {
	[alias: string]: Selector<KY, any, string, any>;
};

type MoreData<
	KY extends KyselyRizzolverBase<any, any>,
	T extends Data<KY>,
	Table extends TableName<KY>,
	A extends string,
	K extends readonly AnyTableField<KY, Table>[] = AllTableFields<KY, Table>
> = QueryBuilder<KY, T & { [k in A]: Selector<KY, Table, A, K> }>;

interface DeferredResult<
	KY extends KyselyRizzolverBase<any, any>,
	T extends Data<KY>,
	Row extends Record<string, unknown>
> extends Promise<Result<KY, T, Row>> {
	newFetchOneResult<K extends keyof T>(
		selectorAlias: K
	): Promise<
		FetchOneResult<
			KyDB<KY>,
			T[K]['input']['table'],
			SelectorResult<
				KY,
				any,
				T[K]['input']['table'],
				T[K]['input']['tableFields']
			>[number]['model'] & {}
		>
	>;

	newFetchOneXResult<K extends keyof T>(
		selectorAlias: K
	): Promise<
		FetchOneXResult<
			KyDB<KY>,
			T[K]['input']['table'],
			SelectorResult<
				KY,
				any,
				T[K]['input']['table'],
				T[K]['input']['tableFields']
			>[number]['model'] & {}
		>
	>;

	newFetchSomeResult<K extends keyof T>(
		selectorAlias: K
	): Promise<
		FetchSomeResult<
			KyDB<KY>,
			T[K]['input']['table'],
			SelectorResult<
				KY,
				any,
				T[K]['input']['table'],
				T[K]['input']['tableFields']
			>[number]['model'] & {}
		>
	>;
}

type Result<
	KY extends KyselyRizzolverBase<any, any>,
	T extends Data<KY>,
	Row extends Record<string, unknown>
> = {
	first:
		| {
				row: Row;
				selectors: {
					[k in keyof T]: ReturnType<T[k]['select']>[number]['model'];
				};
		  }
		| undefined;
	rows: {
		row: Row;
		selectors: { [k in keyof T]: ReturnType<T[k]['select']>[number]['model'] };
	}[];
	models: ModelCollection<KyDB<KY>>;
	newFetchOneResult<K extends keyof T>(
		selectorAlias: K
	): FetchOneResult<
		KyDB<KY>,
		T[K]['input']['table'],
		SelectorResult<
			KY,
			any,
			T[K]['input']['table'],
			T[K]['input']['tableFields']
		>[number]['model'] & {}
	>;
	newFetchOneXResult<K extends keyof T>(
		selectorAlias: K
	): FetchOneXResult<
		KyDB<KY>,
		T[K]['input']['table'],
		SelectorResult<
			KY,
			any,
			T[K]['input']['table'],
			T[K]['input']['tableFields']
		>[number]['model'] & {}
	>;
	newFetchSomeResult<K extends keyof T>(
		selectorAlias: K
	): FetchSomeResult<
		KyDB<KY>,
		T[K]['input']['table'],
		SelectorResult<
			KY,
			any,
			T[K]['input']['table'],
			T[K]['input']['tableFields']
		>[number]['model'] & {}
	>;
};

type FieldsOf<T, K extends keyof T> = UnionToTuple<
	Pick<T, K> extends infer U
		? U[keyof U] extends infer S
			? S extends Selector<infer KY, infer Table, infer Alias, infer Keys>
				? Selector<KY, Table, Alias, Keys>['selectFields'][number]
				: never
			: never
		: never
>;
