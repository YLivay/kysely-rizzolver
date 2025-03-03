import type { Selectable } from 'kysely';
import type {
	AnyTableColumn,
	KyselyRizzolverBase,
	KyselyRizzolver,
	TableName
} from './kysely-rizzolver.js';
import type { QueryContext } from './query-context.js';

/**
 * A {@link Selector} makes it easier to build select expressions for a
 * table in a type-safe way. It can process the results of queries into
 * Kysely's {@link Selectable} instances.
 *
 * {@link Selector} is a low level utility that is used by
 * {@link QueryContext} to work with multiple selectors.
 */
export interface Selector<
	KY extends KyselyRizzolverBase<any, any, any>,
	Table extends KyselyRizzolver.TableName<KY>,
	Alias extends string,
	Columns extends readonly KyselyRizzolver.AnyTableColumn<
		KY,
		Table
	>[] = KyselyRizzolver.AllTableColumns<KY, Table>
> extends SelectorData<KyselyRizzolver.ExtractDB<KY>, Table, Alias, Columns> {
	/**
	 * Parses the results of a query into the model defined by this selector for each row.
	 *
	 * Example:
	 * ```
	 * const selector = newSelector(rizzolver, 'user', 'u');
	 * const data = await db.selectFrom(selector.table.asAlias).selectAll().execute();
	 * const parsed = selector.parse(data);
	 *  // => type would be { row: Row, model: Selectable<User> | undefined }[]
	 * ```
	 */
	parse<Row extends Record<string, unknown>>(rows: Row[]): SelectorResult<KY, Row, Table, Columns>;
}

interface SelectorData<
	DB,
	Table extends TableName<DB>,
	Alias extends string,
	Columns extends readonly AnyTableColumn<DB, Table>[]
> {
	table: {
		/**
		 * The table name that's being selected from.
		 */
		name: Table;

		/**
		 * The alias for the table.
		 */
		alias: Alias;

		/**
		 * A `"table as alias"` expression for using in select expressions.
		 */
		asAlias: TableAliasExpression<DB, Table, Alias>;

		/**
		 * A utility method that allows you to reference the table from a different table alias.
		 *
		 * Example:
		 *
		 * ```
		 * newSelector(rizzolver, 'user', 'u').aliasOn('a');
		 * // => 'a.u'
		 * ```
		 */
		aliasOn<A extends string>(alias: A): `${A}.${Alias}`;
	};

	cols: {
		/**
		 * An array of the column names.
		 */
		names: Columns;

		/**
		 * An array of the column aliases.
		 */
		aliases: ColumnAliases<Alias, Columns>;

		/**
		 * An array of `"table.column as alias"` expressions for using in select expressions.
		 *
		 * Example:
		 *
		 * ```
		 * const selector = newSelector(rizzolver, 'user', 'u', ['username', 'email'] as const);
		 * selector.cols.asAliases;
		 * // => ['u.username as _u_username', 'u.email as _u_email']
		 * ```
		 */
		asAliases: ColumnAliasExpressions<Alias, Columns>;

		/**
		 * A utility method that allows you to reference the column from a different table alias.
		 *
		 * Example:
		 *
		 * ```
		 * const selector = newSelector(rizzolver, 'user', 'u', ['username', 'email'] as const);
		 * selector.cols.aliasesOn('a');
		 * // => ['a._u_username', 'a._u_email']
		 * ```
		 */
		aliasesOn<A extends string>(alias: A): ColumnAliasesOn<Alias, ColumnAliases<Alias, Columns>, A>;
	};

	col<Column extends Columns[number]>(column: Column): SelectorColumnData<Alias, Column>;
}

export type SelectorColumnData<Alias extends string, Column extends string> = {
	name: Column;
	alias: ColumnAlias<Alias, Column>;
	asAlias: ColumnAliasExpression<Alias, Column>;
	aliasOn<A extends string>(alias: A): `${A}.${ColumnAlias<Alias, Column>}`;
};

export function newSelector<
	KY extends KyselyRizzolverBase<any, any, any>,
	Table extends KyselyRizzolver.TableName<KY>,
	Alias extends string
>(
	rizzolver: KY,
	tableName: Table,
	alias: Alias
): Selector<KY, Table, Alias, KyselyRizzolver.AllTableColumns<KY, Table>>;
export function newSelector<
	KY extends KyselyRizzolverBase<any, any, any>,
	Table extends KyselyRizzolver.TableName<KY>,
	Alias extends string,
	Columns extends readonly KyselyRizzolver.AnyTableColumn<KY, Table>[]
>(
	rizzolver: KY,
	tableName: Table,
	alias: Alias,
	keys?: Columns
): Selector<KY, Table, Alias, Columns>;
export function newSelector<
	KY extends KyselyRizzolverBase<any, any, any>,
	Table extends KyselyRizzolver.TableName<KY>,
	Alias extends string,
	Columns extends readonly KyselyRizzolver.AnyTableColumn<
		KY,
		Table
	>[] = KyselyRizzolver.AllTableColumns<KY, Table>
>(rizzolver: KY, tableName: Table, tableAlias: Alias, columns?: Columns) {
	const columnNames = (columns ?? rizzolver._types.tableToColumns[tableName]) as Columns;
	type MySelectable = Selectable<Pick<KyselyRizzolver.ExtractDB<KY>[Table], Columns[number]>>;

	const tableAsAlias = `${tableName} as ${tableAlias}` as const;
	const columnAliases = columnNames.map((col) => `_${tableAlias}_${col}` as const) as ColumnAliases<
		Alias,
		Columns
	>;
	const columnsAsAliases = columnNames.map(
		(col) => `${tableAlias}.${col} as _${tableAlias}_${col}` as const
	) as ColumnAliasExpressions<Alias, Columns>;

	function _rowToModel(result: Record<string, unknown> | undefined): MySelectable | undefined {
		// TODO: this is wrong, we don't necessarily fetch the id column.
		//
		// perhaps the better way is to check if the result has only undefined
		// values?
		//
		// how would we handle a selector with only optional columns? need to
		// make sure kysely returns them as null and not undefined so we can
		// distinguish.
		if (!result || !result[`_${tableAlias}_id`]) {
			return undefined;
		}

		const model = {} as any;
		for (const col of columnNames) {
			const colAlias = `_${tableAlias}_${col}` as const;
			model[col] = result[colAlias];
		}
		return model;
	}

	const selector: Selector<KY, Table, Alias, Columns> = {
		table: {
			name: tableName,
			alias: tableAlias,
			asAlias: tableAsAlias,
			aliasOn<A extends string>(onAlias: A) {
				return `${onAlias}.${tableAlias}` as const;
			}
		},
		cols: {
			names: columnNames,
			aliases: columnAliases,
			asAliases: columnsAsAliases,
			aliasesOn<A extends string>(onAlias: A) {
				// TODO
				return columnAliases.map((columnAlias) => `${onAlias}.${columnAlias}` as const) as any;
			}
		},
		col<Column extends Columns[number]>(name: Column) {
			if (!columnNames.includes(name as any)) {
				throw new Error(`Column "${name}" does not exist or was not selected`);
			}

			const colAlias = `_${tableAlias}_${name}` as const;

			return {
				name,
				alias: colAlias,
				asAlias: `${tableAlias}.${name} as ${colAlias}`,
				aliasOn<A extends string>(alias: A) {
					return `${alias}.${colAlias}` as const;
				}
			};
		},
		parse<Row extends Record<string, unknown>>(rows: Row[]) {
			const data: { row: Row; model: MySelectable | undefined }[] = [];

			for (const row of rows) {
				const model = _rowToModel(row);
				data.push({ row, model });
			}

			return data;
		}
	} as const;

	return selector;
}

export type SelectorResult<
	KY extends KyselyRizzolverBase<any, any, any>,
	Row extends Record<string, unknown>,
	Table extends KyselyRizzolver.TableName<KY>,
	Columns extends readonly KyselyRizzolver.AnyTableColumn<
		KY,
		Table
	>[] = KyselyRizzolver.AllTableColumns<KY, Table>
> = {
	row: Row;
	model: Selectable<Pick<KyselyRizzolver.ExtractDB<KY>[Table], Columns[number]>> | undefined;
}[];

type TableAliasExpression<
	DB,
	Table extends TableName<DB>,
	Alias extends string
> = `${Table} as ${Alias}`;

type ColumnAlias<TableAlias extends string, Column extends string> = `_${TableAlias}_${Column}`;

type ColumnAliases<
	TableAlias extends string,
	Columns extends readonly string[]
> = Columns extends readonly [infer Column extends string, ...infer Tail extends string[]]
	? [ColumnAlias<TableAlias, Column>, ...ColumnAliases<TableAlias, Tail>]
	: [];

type ColumnAliasesOn<
	TableAlias extends string,
	Columns extends readonly string[],
	OnAlias extends string
> = Columns extends readonly [infer Column extends string, ...infer Tail extends string[]]
	? [`${OnAlias}.${ColumnAlias<TableAlias, Column>}`, ...ColumnAliasesOn<TableAlias, Tail, OnAlias>]
	: [];

type ColumnAliasExpression<
	TableAlias extends string,
	Column extends string
> = `${TableAlias}.${Column} as ${ColumnAlias<TableAlias, Column>}`;

type ColumnAliasExpressions<
	TableAlias extends string,
	Columns extends readonly string[]
> = Columns extends readonly [infer Column extends string, ...infer Tail extends string[]]
	? [ColumnAliasExpression<TableAlias, Column>, ...ColumnAliasExpressions<TableAlias, Tail>]
	: [];

/**
 * A type that represents a {@link Selectable}, but with the columns being
 * aliased the way a {@link Selector} expects them when parsing Kysely Rizzolver
 * query results.
 *
 * For example:
 * ```
 * // The following Selectable...
 * const user: Selectable<User> = {
 *  id: 1,
 *  name: 'Alice'
 * };
 *
 * // Would be represented as such in the raw query result rows.
 * const rawUser: ZSelectable<User, 'u'> = {
 *  _u_id: 1,
 *  _u_name: 'Alice'
 * };
 * ```
 */
export type Zelectable<T, Alias extends string> = Selectable<{
	[K in keyof T as K extends string ? `_${Alias}_${K}` : K]: T[K];
}>;
