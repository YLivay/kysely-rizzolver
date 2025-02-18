import type { Selectable } from 'kysely';
import type {
	AllTableFields,
	AnyTableField,
	KyAllTableFields,
	KyAnyTableField,
	KyDB,
	KyselyRizzolverBase,
	KyTableName,
	TableName
} from './kysely-rizzolver.js';
import type { QueryBuilder } from './query-builder.js';

/**
 * A {@link Selector} makes it easier to build select expressions for a
 * table in a type-safe way. It can process the results of queries into
 * Kysely's {@link Selectable} instances.
 *
 * {@link Selector} is a low level utility that is used by
 * {@link QueryBuilder} to work with multiple selectors.
 */
export type AnySelector<
	DB,
	Table extends TableName<DB>,
	Alias extends string,
	TableFields extends AnyTableField<DB, Table>[] = AllTableFields<DB, Table>
> = {
	input: {
		/**
		 * The table name that's being selected from.
		 */
		table: Table;
		/**
		 * The alias for the table.
		 */
		alias: Alias;
		/**
		 * An array of the fields to be selected from the table.
		 *
		 * This can be omitted, in which case it will default to all the fields of
		 * the table.
		 */
		tableFields: TableFields;
	};
	/**
	 * A `"table as alias"` expression for using in select expressions.
	 */
	selectTable: TableAlias<DB, Table, Alias>;
	/**
	 * An array of `"table.field as alias"` expressions for using in select expressions.
	 */
	selectFields: FieldsAsAliases<Alias, TableFields>;
	/**
	 * A utility method that allows you to reference a specific field.
	 */
	field<Field extends TableFields[number]>(
		field: Field
	): {
		str: `_${Alias}_${Field}`;
		/**
		 * A utility method that allows you to reference the field from a different table alias.
		 *
		 * This is useful if you need to reference the field from a subquery for example.
		 */
		from<A extends string>(alias: A): `${A}.${FieldAlias<Alias, Field>}`;
	};
	/**
	 * Parses the results of a query into the model defined by this selector for each row.
	 *
	 * Example:
	 * ```
	 * const selector = newSelector('user', 'u');
	 * const data = await db.selectFrom(selector.tableAlias).selectAll().execute();
	 * const parsed = selector.select(data);
	 *   // => type would be { row: Row, model: Selectable<User> | undefined }[]
	 * ```
	 */
	select<Row extends Record<string, unknown>>(
		rows: Row[]
	): AnySelectorResult<DB, Row, Table, TableFields>;
};

/**
 * A {@link Selector} makes it easier to build select expressions for a
 * table in a type-safe way. It can process the results of queries into
 * Kysely's {@link Selectable} instances.
 *
 * {@link Selector} is a low level utility that is used by
 * {@link QueryBuilder} to work with multiple selectors.
 */
export type Selector<
	KY extends KyselyRizzolverBase<any, any, any>,
	Table extends KyTableName<KY>,
	Alias extends string,
	TableFields extends readonly KyAnyTableField<KY, Table>[] = KyAllTableFields<KY, Table>
> = {
	input: {
		/**
		 * The table name that's being selected from.
		 */
		table: Table;
		/**
		 * The alias for the table.
		 */
		alias: Alias;
		/**
		 * An array of the fields to be selected from the table.
		 *
		 * This can be omitted, in which case it will default to all the fields of
		 * the table.
		 */
		tableFields: TableFields;
	};
	/**
	 * A `"table as alias"` expression for using in select expressions.
	 */
	selectTable: KyTableAlias<KY, Table, Alias>;
	/**
	 * An array of `"table.field as alias"` expressions for using in select expressions.
	 */
	selectFields: FieldsAsAliases<Alias, TableFields>;
	/**
	 * A utility method that allows you to reference a specific field.
	 */
	field<Field extends TableFields[number]>(
		field: Field
	): {
		str: `_${Alias}_${Field}`;
		/**
		 * A utility method that allows you to reference the field from a different table alias.
		 *
		 * This is useful if you need to reference the field from a subquery for example.
		 */
		from<A extends string>(alias: A): `${A}.${FieldAlias<Alias, Field>}`;
	};
	/**
	 * Parses the results of a query into the model defined by this selector for each row.
	 *
	 * Example:
	 * ```
	 * const selector = newSelector('user', 'u');
	 * const data = await db.selectFrom(selector.tableAlias).selectAll().execute();
	 * const parsed = selector.select(data);
	 *   // => type would be { row: Row, model: Selectable<User> | undefined }[]
	 * ```
	 */
	select<Row extends Record<string, unknown>>(
		rows: Row[]
	): SelectorResult<KY, Row, Table, TableFields>;
};

export function newSelector<
	KY extends KyselyRizzolverBase<any, any, any>,
	Table extends KyTableName<KY>,
	Alias extends string
>(
	rizzolver: KY,
	tableName: Table,
	alias: Alias
): Selector<KY, Table, Alias, KyAllTableFields<KY, Table>>;
export function newSelector<
	KY extends KyselyRizzolverBase<any, any, any>,
	Table extends KyTableName<KY>,
	Alias extends string,
	Keys extends readonly KyAnyTableField<KY, Table>[]
>(rizzolver: KY, tableName: Table, alias: Alias, keys?: Keys): Selector<KY, Table, Alias, Keys>;
export function newSelector<
	KY extends KyselyRizzolverBase<any, any, any>,
	Table extends KyTableName<KY>,
	Alias extends string,
	Keys extends readonly KyAnyTableField<KY, Table>[] = KyAllTableFields<KY, Table>
>(rizzolver: KY, tableName: Table, alias: Alias, keys?: Keys) {
	const effectiveKeys = (keys ?? rizzolver._types.fields[tableName]) as Keys;
	type MySelectable = Selectable<Pick<KyDB<KY>[Table], Keys[number]>>;

	const tableAlias = `${tableName} as ${alias}` as const;
	const fields = effectiveKeys.map(
		(field) => `${alias}.${field} as _${alias}_${field}` as const
	) as FieldsAsAliases<Alias, Keys>;

	function _rowToModel(result: Record<string, unknown> | undefined): MySelectable | undefined {
		if (!result || !result[`_${alias}_id`]) {
			return undefined;
		}

		const model = {} as any;
		for (const field of effectiveKeys) {
			const aliasedField = `_${alias}_${field}` as const;
			model[field] = result[aliasedField] ?? undefined;
		}
		return model;
	}

	const selector: Selector<KY, Table, Alias, Keys> = {
		input: {
			table: tableName,
			alias,
			tableFields: effectiveKeys
		},
		selectTable: tableAlias,
		selectFields: fields,
		field<Field extends Keys[number]>(field: Field) {
			return {
				str: `_${alias}_${field}`,
				from<A extends string>(table: A) {
					return `${table}._${alias}_${field}`;
				}
			} as const;
		},

		select<Row extends Record<string, unknown>>(rows: Row[]) {
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
	Table extends KyTableName<KY>,
	TableFields extends readonly KyAnyTableField<KY, Table>[] = KyAllTableFields<KY, Table>
> = {
	row: Row;
	model: Selectable<Pick<KyDB<KY>[Table], TableFields[number]>> | undefined;
}[];

export type AnySelectorResult<
	DB,
	Row extends Record<string, unknown>,
	Table extends TableName<DB>,
	TableFields extends readonly AnyTableField<DB, Table>[] = AllTableFields<DB, Table>
> = {
	row: Row;
	model: Selectable<Pick<DB[Table], TableFields[number]>> | undefined;
}[];

type KyTableAlias<
	KY extends KyselyRizzolverBase<any, any, any>,
	Table extends KyTableName<KY>,
	Alias extends string
> = `${Table} as ${Alias}`;

type TableAlias<DB, Table extends TableName<DB>, Alias extends string> = `${Table} as ${Alias}`;

type FieldAlias<
	TableAlias extends string,
	TableField extends string
> = `_${TableAlias}_${TableField}`;

type FieldAsAlias<
	TableAlias extends string,
	TableField extends string
> = `${TableAlias}.${TableField} as ${FieldAlias<TableAlias, TableField>}`;

type FieldsAsAliases<
	TableAlias extends string,
	TableFields extends readonly string[]
> = TableFields extends readonly [infer TableField extends string, ...infer Tail extends string[]]
	? [FieldAsAlias<TableAlias, TableField>, ...FieldsAsAliases<TableAlias, Tail>]
	: [];
