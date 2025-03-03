import type { Selectable } from 'kysely';
import {
	type FetchOneResult,
	type FetchOneXResult,
	type FetchSomeResult,
	newFetchOneResult,
	newFetchOneXResult,
	newFetchSomeResult
} from './fetch-result.js';
import type { KyselyRizzolverBase, KyselyRizzolver } from './kysely-rizzolver.js';
import { type ModelCollection, newModelCollection } from './model-collection.js';
import { type Selector, type SelectorResult, newSelector, SelectorColumnData } from './selector.js';
import type { UnionToTuple } from './type-helpers.js';

/**
 * {@link QueryContext} makes it easier to work with multiple tables in a query
 * and parse the results into their respective Kysely {@link Selectable}
 * instances in a type-safe way.
 *
 * It works by adding {@link Selector}s using the {@link QueryContext.add}
 * method, followed by a call to {@link QueryContext.run} to parse the results
 * of the query using a simple builder pattern.
 */
export interface QueryContext<
	KY extends KyselyRizzolverBase<any, any, any>,
	Selectors extends QueryContextSelectors<KY>
> {
	/**
	 * The record of {@link Selector} this query context has, keyed by their alias.
	 */
	selectors: Selectors;

	numSelectors: UnionToTuple<keyof Selectors>['length'];

	/**
	 * Given a table alias `k`, Gets a `"table as alias"` expression
	 * for that selector.
	 *
	 * This is a shorthand for `this.selectors[k].table.asAlias`
	 *
	 * Example:
	 * ```
	 * const qb = rizzolver
	 *     .newQueryContext()
	 *     .add('user', 'u');
	 *
	 * const userTable = qb.table('u'); // => 'user as u'
	 * ```
	 */
	table<TableAlias extends keyof Selectors>(
		tableAlias: TableAlias
	): Selectors[TableAlias]['table']['asAlias'];

	/**
	 * Gets a const array of all the "column as alias" expressions for all the
	 * {@link Selector}s this query context has.
	 *
	 * Note: The order is arbitrary and should not be relied upon.
	 */
	cols(): AllColumnsAsAliases<Selectors, keyof Selectors>;

	/**
	 * Gets a const array of all the "column as alias" expressions for the given
	 * {@link Selector}s this query context has.
	 *
	 * Example:
	 * ```
	 * const qb = rizzolver
	 *     .newQueryContext()
	 *     .add('user', 'u')
	 *     .add('address', 'a');
	 *
	 * const userCols = qb.cols('u');
	 *   // => ['u.id as _u_id', 'u.first_name as _u_first_name', 'u.last_name as _u_last_name']
	 * const addressCols = qb.cols('a');
	 *   // => ['a.id as _a_id', 'a.street as _a_street', 'a.city as _a_city']
	 * const allColls = qb.cols('u', 'a');
	 *   // equivalent to [...qb.cols('u'), ...qb.cols('a')]
	 *   // => ['u.id as _u_id', 'u.first_name as _u_first_name', 'u.last_name as _u_last_name', 'a.id as _a_id', 'a.street as _a_street', 'a.city as _a_city']
	 * ```
	 */
	cols<TableAlias extends keyof Selectors>(
		tableAlias: TableAlias,
		...tableAliases: TableAlias[]
	): AllColumnsAsAliases<Selectors, TableAlias>;

	/**
	 * Returns data that simplifies refering to a specific column in a query.
	 *
	 * This is a shorthand for `this.selectors[k].col(f)`.
	 *
	 * Example:
	 * ```
	 * const qb = rizzolver
	 *     .newQueryContext()
	 *     .add('user', 'u');
	 *
	 * const username = qb.col('u.username');
	 * const name = username.name;            // => "username"
	 * const alias = username.alias;          // => "_u_username"
	 * const asAlias = username.asAlias;      // => "u._u_username"
	 * const aliasOn = username.aliasOn('a'); // => "a._u_username"
	 * ```
	 */
	col<
		TableAlias extends keyof Selectors & string,
		Column extends Selectors[TableAlias]['cols']['names'][number]
	>(
		selectorDotColumn: `${TableAlias}.${Column}`
	): SelectorColumnData<TableAlias, Column>;

	/**
	 * Adds a new {@link Selector} to the query builder.
	 */
	add<
		Table extends KyselyRizzolver.TableName<KY>,
		Alias extends string,
		Columns extends readonly KyselyRizzolver.AnyTableColumn<
			KY,
			Table
		>[] = KyselyRizzolver.AllTableColumns<KY, Table>
	>(
		selector: Selector<KY, Table, Alias, Columns>
	): QueryContextSelectorsAdd<KY, Selectors, Table, Alias, Columns>;
	/**
	 * Adds a new {@link Selector} to the query builder.
	 */
	add<
		Table extends KyselyRizzolver.TableName<KY>,
		Alias extends string,
		Columns extends readonly KyselyRizzolver.AnyTableColumn<
			KY,
			Table
		>[] = KyselyRizzolver.AllTableColumns<KY, Table>
	>(
		table: Table,
		alias: Alias,
		keys?: Columns
	): QueryContextSelectorsAdd<KY, Selectors, Table, Alias, Columns>;
	/**
	 * Parses the results of a query into the {@link Selectable} instances
	 * defined by the {@link Selector}s this query builder has.
	 *
	 * Example:
	 * ```
	 * const result = await rizzolver
	 *     .newQueryContext()
	 *     .add('user', 'u')
	 *     .add('address', 'a')
	 *     .run((ctx) =>
	 *         db
	 *             .selectFrom(ctx.table('u'))
	 *             .leftJoin(ctx.table('a'), (join) => join.onRef('u.address_id', '=', 'a.id'))
	 *             .select(ctx.cols())
	 *             .execute()
	 *     );
	 *
	 * const parsedRows = result.rows;
	 *   // => [
	 *   //      {
	 *   //        row: { id: 1, first_name: 'John', last_name: 'Doe' },
	 *   //        selectable: {
	 *   //          u: { id: 1, first_name: 'John', last_name: 'Doe' },
	 *   //          a: { id: 10, street: '123 Main St', city: 'Springfield' }
	 *   //        }
	 *   //      },
	 *   //      {
	 *   //        row: { id: 2, first_name: 'Jane', last_name: 'Smith' },
	 *   //        selectable: {
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
	 *     .newQueryContext()
	 *     .add('user', 'u')
	 *     .run(...)
	 *     .newFetchOneResult('u'); // => FetchOneResult<DB, 'user', Selectable<User>>
	 * ```
	 */
	run<Row extends Record<string, unknown>>(
		rows: Row[] | Promise<Row[]>
	): DeferredResult<KY, Selectors, Row>;
	run<Row extends Record<string, unknown>>(
		callback: (qb: this) => Row[] | Promise<Row[]>
	): DeferredResult<KY, Selectors, Row>;
}

export type AnyQueryContext = QueryContext<
	KyselyRizzolverBase<any, any, any>,
	Record<string, Selector<KyselyRizzolverBase<any, any, any>, string, string, string[]>>
>;

export function newQueryContext<KY extends KyselyRizzolverBase<any, any, any>>(
	rizzolver: KY
): QueryContext<KY, {}> {
	const selectors: QueryContextSelectors<KY> = {};

	return {
		selectors,
		get numSelectors() {
			return Object.keys(selectors).length as any;
		},
		table<K extends keyof typeof selectors>(tableAlias: K) {
			if (!(tableAlias in selectors)) {
				throw new Error(`Table "${tableAlias}" not added to this query context`);
			}
			return selectors[tableAlias].table.asAlias as any;
		},
		cols(...tableAliases: (keyof typeof selectors)[]) {
			if (tableAliases.length === 0) {
				tableAliases = Object.keys(selectors);
			}

			return tableAliases.map((alias) => selectors[alias].cols.asAliases).flat() as any;
		},
		col(selectorDotColumn: string) {
			const [t, f] = selectorDotColumn.split('.', 2);
			if (!f) {
				throw new Error(`Invalid column specifier "${selectorDotColumn}"`);
			}
			if (!(t in selectors)) {
				throw new Error(`Table "${t}" not added to this query context`);
			}
			return selectors[t].col(f) as any;
		},

		add<
			Table extends KyselyRizzolver.TableName<KY>,
			Alias extends string,
			Keys extends readonly KyselyRizzolver.AnyTableColumn<
				KY,
				Table
			>[] = KyselyRizzolver.AllTableColumns<KY, Table>
		>(selectorOrTable: Table | Selector<KY, Table, Alias, Keys>, alias?: Alias, keys?: Keys) {
			let selector: Selector<KY, Table, Alias, Keys>;
			if (typeof selectorOrTable === 'string') {
				if (!alias) {
					throw new Error('Must provide an alias when calling QueryContext.add with a table name');
				}
				selector = newSelector(
					rizzolver,
					selectorOrTable,
					alias,
					(keys ?? rizzolver._types.tableToColumns[selectorOrTable]) as Keys
				);
			} else {
				if (alias || keys) {
					throw new Error(
						'Must not provide an alias or keys when calling QueryContext.add with a selector'
					);
				}
				selector = selectorOrTable;
			}

			if (selector.table.alias in selectors) {
				throw new Error(`Alias "${selector.table.alias}" is already in use`);
			}

			(selectors as any)[selector.table.alias] = selector;
			return this as any;
		},

		run<Row extends Record<string, unknown>>(
			rowsOrCallback:
				| Row[]
				| Promise<Row[]>
				| ((qb: QueryContext<KY, typeof selectors>) => Row[] | Promise<Row[]>)
		) {
			const promise: DeferredResult<KY, typeof selectors, Row> = (async () => {
				const rows = await (typeof rowsOrCallback === 'function'
					? rowsOrCallback(this)
					: rowsOrCallback);

				const modelCollection = newModelCollection<KyselyRizzolver.ExtractDB<KY>>();

				const selectorResults = {} as any;
				for (const [alias, selector] of Object.entries(selectors)) {
					const selectorResult = selector.parse(rows);

					for (const { model } of selectorResult) {
						if (!model) {
							continue;
						}
						modelCollection.add(selector.table.name, model as any);
					}

					selectorResults[alias] = selectorResult;
				}

				const result: {
					row: Row;
					selectable: Record<keyof typeof selectors, any>;
				}[] = [];

				for (let i = 0; i < rows.length; i++) {
					const row = rows[i];
					const selectedModels = {} as any;
					for (const [alias, selectorResult] of Object.entries(selectorResults)) {
						selectedModels[alias] = (selectorResult as any)[i].model;
					}
					result.push({ row, selectable: selectedModels });
				}

				return <Result<KY, typeof selectors, Row>>{
					first: result.length ? result[0] : undefined,
					rows: result,
					models: modelCollection,
					newFetchOneResult<K extends keyof typeof selectors>(selectorAlias: K) {
						if (!(selectorAlias in selectors)) {
							throw new Error(`Table "${selectorAlias}" not found in this query context`);
						}

						return newFetchOneResult(
							selectors[selectorAlias].table.name,
							(result.length ? result[0] : undefined)?.selectable[selectorAlias],
							modelCollection
						);
					},
					newFetchOneXResult<K extends keyof typeof selectors>(selectorAlias: K) {
						if (!(selectorAlias in selectors)) {
							throw new Error(`Table "${selectorAlias}" not found in this query context`);
						}

						return newFetchOneXResult(
							selectors[selectorAlias].table.name,
							(result.length ? result[0] : undefined)?.selectable[selectorAlias],
							modelCollection
						);
					},
					newFetchSomeResult<K extends keyof typeof selectors>(selectorAlias: K) {
						if (!(selectorAlias in selectors)) {
							throw new Error(`Table "${selectorAlias}" not found in this query context`);
						}

						return newFetchSomeResult(
							selectors[selectorAlias].table.name,
							result.map((r) => r.selectable[selectorAlias]).filter((r) => !!r),
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

type QueryContextSelectors<KY extends KyselyRizzolverBase<any, any, any>> = {
	[alias: string]: Selector<KY, any, string, any>;
};

type QueryContextSelectorsAdd<
	KY extends KyselyRizzolverBase<any, any, any>,
	T extends QueryContextSelectors<KY>,
	Table extends KyselyRizzolver.TableName<KY>,
	Alias extends string,
	Columns extends readonly KyselyRizzolver.AnyTableColumn<
		KY,
		Table
	>[] = KyselyRizzolver.AllTableColumns<KY, Table>
> = QueryContext<KY, T & { [k in Alias]: Selector<KY, Table, Alias, Columns> }>;

interface DeferredResult<
	KY extends KyselyRizzolverBase<any, any, any>,
	T extends QueryContextSelectors<KY>,
	Row extends Record<string, unknown>
> extends Promise<Result<KY, T, Row>> {
	newFetchOneResult<K extends keyof T>(
		selectorAlias: K
	): Promise<
		FetchOneResult<
			KyselyRizzolver.ExtractDB<KY>,
			T[K]['table']['name'],
			SelectorResult<KY, any, T[K]['table']['name'], T[K]['cols']['names']>[number]['model'] & {}
		>
	>;

	newFetchOneXResult<K extends keyof T>(
		selectorAlias: K
	): Promise<
		FetchOneXResult<
			KyselyRizzolver.ExtractDB<KY>,
			T[K]['table']['name'],
			SelectorResult<KY, any, T[K]['table']['name'], T[K]['cols']['names']>[number]['model'] & {}
		>
	>;

	newFetchSomeResult<K extends keyof T>(
		selectorAlias: K
	): Promise<
		FetchSomeResult<
			KyselyRizzolver.ExtractDB<KY>,
			T[K]['table']['name'],
			SelectorResult<KY, any, T[K]['table']['name'], T[K]['cols']['names']>[number]['model'] & {}
		>
	>;
}

type Result<
	KY extends KyselyRizzolverBase<any, any, any>,
	T extends QueryContextSelectors<KY>,
	Row extends Record<string, unknown>
> = {
	first:
		| {
				row: Row;
				selectable: {
					[k in keyof T]: ReturnType<T[k]['parse']>[number]['model'];
				};
		  }
		| undefined;
	rows: {
		row: Row;
		selectable: { [k in keyof T]: ReturnType<T[k]['parse']>[number]['model'] };
	}[];
	models: ModelCollection<KyselyRizzolver.ExtractDB<KY>>;
	newFetchOneResult<K extends keyof T>(
		selectorAlias: K
	): FetchOneResult<
		KyselyRizzolver.ExtractDB<KY>,
		T[K]['table']['name'],
		SelectorResult<KY, any, T[K]['table']['name'], T[K]['cols']['names']>[number]['model'] & {}
	>;
	newFetchOneXResult<K extends keyof T>(
		selectorAlias: K
	): FetchOneXResult<
		KyselyRizzolver.ExtractDB<KY>,
		T[K]['table']['name'],
		SelectorResult<KY, any, T[K]['table']['name'], T[K]['cols']['names']>[number]['model'] & {}
	>;
	newFetchSomeResult<K extends keyof T>(
		selectorAlias: K
	): FetchSomeResult<
		KyselyRizzolver.ExtractDB<KY>,
		T[K]['table']['name'],
		SelectorResult<KY, any, T[K]['table']['name'], T[K]['cols']['names']>[number]['model'] & {}
	>;
};

type AllColumnsAsAliases<T, K extends keyof T> = UnionToTuple<
	Pick<T, K> extends infer U
		? U[keyof U] extends infer S
			? S extends Selector<infer KY, infer Table, infer Alias, infer Keys>
				? Selector<KY, Table, Alias, Keys>['cols']['asAliases'][number]
				: never
			: never
		: never
>;
