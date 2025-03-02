import type { Kysely, Selectable } from 'kysely';
import { type FetchResultFactory, newFetchResultFactory } from './fetch-result-factory.js';
import type { FetchResult } from './fetch-result.js';
import { FkGatherResultFactory, newFkGatherResultFactory } from './fk-gather-result-factory.js';
import {
	DBWithFk,
	gatherModelFks,
	GatherOpts,
	GatherWhereExpression,
	MAX_FK_GATHER_DEPTH,
	NoNullGatherOpts,
	ValidFkDepth
} from './fks.js';
import { newKyselyRizzolverBuilder } from './kysely-rizzolver-builder.js';
import {
	type ModelCollection,
	newModelCollection as kyNewModelCollection
} from './model-collection.js';
import { type QueryContext, newQueryContext as kyNewQueryContext } from './query-context.js';
import { type Selector, newSelector as kyNewSelector } from './selector.js';
import { WithMandatory } from './type-helpers.js';

export interface KyselyRizzolverBase<
	DB,
	TableToColumns extends Record<TableName<DB>, readonly string[]>,
	FKDefs extends KyselyRizzolverFKs<DB>
> {
	readonly _types: Readonly<{
		tableToColumns: TableToColumns;
		fkDefs: FKDefs;
		dbfk: DBWithFk<DB, FKDefs>;
	}>;
}

/**
 * A {@link KyselyRizzolver} is a class that is used to define the structure of
 * a database schema.
 *
 * It streamlines instatiating type-safe {@link QueryContext}s,
 * {@link Selector}s, {@link ModelCollection}s and {@link FetchResult}s.
 *
 * Define a new {@link KyselyRizzolver} using the
 * {@link KyselyRizzolver.builder|.builderForSchema()} or
 * {@link KyselyRizzolver.builderNoSchema|.builderNoSchema()}.
 */
export class KyselyRizzolver<
	DB,
	TableToColumns extends Record<TableName<DB>, readonly string[]>,
	FKDefs extends KyselyRizzolverFKs<DB>,
	DefaultGatherDepth extends ValidFkDepth = typeof MAX_FK_GATHER_DEPTH
> implements KyselyRizzolverBase<DB, TableToColumns, FKDefs>
{
	public readonly _types: KyselyRizzolverBase<DB, TableToColumns, FKDefs>['_types'];

	public readonly fetchObjs: FetchResultFactory<DB>;
	public readonly gatherObjs: FkGatherResultFactory<DB, FKDefs>;
	public readonly defaultGatherDepth: DefaultGatherDepth;

	constructor(
		tableToColumns: TableToColumns,
		fks: FKDefs,
		defaultGatherDepth?: DefaultGatherDepth
	) {
		this._types = Object.freeze({
			tableToColumns,
			fkDefs: fks,
			dbfk: null as any
		});

		this.fetchObjs = newFetchResultFactory<DB>();
		this.gatherObjs = newFkGatherResultFactory<DB, FKDefs>();
		this.defaultGatherDepth = defaultGatherDepth ?? (MAX_FK_GATHER_DEPTH as DefaultGatherDepth);
	}

	/**
	 * Intantiates a new {@link Selector} for the given table.
	 */
	newSelector<Table extends TableName<DB>, Alias extends string>(table: Table, alias: Alias) {
		return kyNewSelector(this, table, alias);
	}

	/**
	 * Instantiates a new {@link QueryContext}.
	 */
	newQueryContext() {
		return kyNewQueryContext(this);
	}

	/**
	 * Instantiates a new {@link ModelCollection}.
	 */
	newModelCollection() {
		return kyNewModelCollection<DB>();
	}

	async gatherOne<
		Table extends TableName<DB>,
		Opts extends WithMandatory<GatherOpts<DB, ValidFkDepth>, 'depth'>
	>(
		db: Kysely<DB>,
		table: Table,
		where: GatherWhereExpression<DB, Table>,
		opts: Opts
	): Promise<ReturnType<typeof this.gatherObjs.newGatherOne<Table, Opts['depth']>>>;
	async gatherOne<Table extends TableName<DB>>(
		db: Kysely<DB>,
		table: Table,
		where: GatherWhereExpression<DB, Table>,
		opts?: Omit<GatherOpts<DB, any>, 'depth'>
	): Promise<ReturnType<typeof this.gatherObjs.newGatherOne<Table, DefaultGatherDepth>>>;
	async gatherOne<Table extends TableName<DB>>(
		db: Kysely<DB>,
		table: Table,
		where: GatherWhereExpression<DB, Table>,
		opts?: GatherOpts<DB, ValidFkDepth>
	) {
		const depth = opts?.depth ?? this.defaultGatherDepth;
		const modelCollection = opts?.modelCollection ?? this.newModelCollection();

		const gather = await gatherModelFks(this, db, table, where, opts);
		const result = gather[0] ?? undefined;

		return this.gatherObjs.newGatherOne(table, depth, result, modelCollection);
	}

	async gatherOneX<
		Table extends TableName<DB>,
		Opts extends WithMandatory<GatherOpts<DB, ValidFkDepth>, 'depth'>
	>(
		db: Kysely<DB>,
		table: Table,
		where: GatherWhereExpression<DB, Table>,
		opts: Opts
	): Promise<ReturnType<typeof this.gatherObjs.newGatherOneX<Table, Opts['depth']>>>;
	async gatherOneX<Table extends TableName<DB>>(
		db: Kysely<DB>,
		table: Table,
		where: GatherWhereExpression<DB, Table>,
		opts?: Omit<GatherOpts<DB, any>, 'depth'>
	): Promise<ReturnType<typeof this.gatherObjs.newGatherOneX<Table, DefaultGatherDepth>>>;
	async gatherOneX<Table extends TableName<DB>>(
		db: Kysely<DB>,
		table: Table,
		where: GatherWhereExpression<DB, Table>,
		opts?: GatherOpts<DB, ValidFkDepth>
	) {
		const depth = opts?.depth ?? this.defaultGatherDepth;
		const modelCollection = opts?.modelCollection ?? this.newModelCollection();

		const gather = await gatherModelFks(this, db, table, where, opts);
		const result = gather[0] ?? undefined;

		return this.gatherObjs.newGatherOneX(table, depth, result, modelCollection);
	}

	async gatherSome<
		Table extends TableName<DB>,
		Opts extends WithMandatory<NoNullGatherOpts<DB, ValidFkDepth>, 'depth'>
	>(
		db: Kysely<DB>,
		table: Table,
		where: GatherWhereExpression<DB, Table>,
		opts: Opts
	): Promise<ReturnType<typeof this.gatherObjs.newGatherSome<Table, Opts['depth']>>>;
	async gatherSome<Table extends TableName<DB>>(
		db: Kysely<DB>,
		table: Table,
		where: GatherWhereExpression<DB, Table>,
		opts?: Omit<NoNullGatherOpts<DB, any>, 'depth'>
	): Promise<ReturnType<typeof this.gatherObjs.newGatherSome<Table, DefaultGatherDepth>>>;
	async gatherSome<Table extends TableName<DB>>(
		db: Kysely<DB>,
		table: Table,
		where: GatherWhereExpression<DB, Table>,
		opts?: NoNullGatherOpts<DB, ValidFkDepth>
	) {
		const depth = opts?.depth ?? this.defaultGatherDepth;
		const modelCollection = opts?.modelCollection ?? this.newModelCollection();

		const gather = await gatherModelFks(this, db, table, where, opts);
		const result = gather.filter((r) => !!r);
		if (result.length < gather.length) {
			throw new Error('Expected no nulls in fkGatherSome result');
		}

		return this.gatherObjs.newGatherSome(table, depth, result, modelCollection);
	}

	/**
	 * Starts building a new {@link KyselyRizzolver} using a builder pattern for
	 * a schema.
	 *
	 * Call {@link KyselyRizzolverBuilder.table|.table()} for each
	 * table that exists on the `DB` type parameter with all of their column
	 * names as a const array. After all tables have been added, call
	 * {@link KyselyRizzolverBuilder.build|.build()} to get a new
	 * {@link KyselyRizzolver} instance.
	 *
	 * Example:
	 * ```
	 * const rizzolver = KyselyRizzolver.builder<DB>()
	 *   .table('user', ['id', 'name', 'email'] as const)
	 *   .table('post', ['id', 'title', 'content', 'authorId'] as const)
	 *   .build();
	 * ```
	 *
	 * Note: The `as const` assertion is necessary for correct type inference.
	 */
	static builder<DB>() {
		return newKyselyRizzolverBuilder<DB, {}>({});
	}
}

/**
 * The shape of the foreign key definitions on a {@link KyselyRizzolverBase}.
 */
export type KyselyRizzolverFKs<DB> = {
	[table in TableName<DB>]?: {
		[fkName: string]: {
			myColumn: string;
			otherTable: TableName<DB>;
			otherColumn: string;
			isNullable: boolean;
		};
	};
};

/**
 * A union of all the known table names of a database.
 */
export type TableName<DB> = keyof DB & string;

/**
 * A union of all the known columns of a table.
 */
export type AnyTableColumn<DB, Table extends TableName<DB>> = keyof DB[Table] & string;

/**
 * An array of all the known columns of a table, in a type that is compatible
 * with that table's ${@link Selectable} type.
 */
export type AllTableColumns<DB, Table extends TableName<DB>> = AnyTableColumn<DB, Table>[];

export declare namespace KyselyRizzolver {
	/**
	 * Extracts the `DB` type from a {@link KyselyRizzolverBase}.
	 */
	export type ExtractDB<KY> = KY extends KyselyRizzolverBase<infer DB, any, any> ? DB : never;

	/**
	 * Variant of {@link TableName} that takes a {@link KyselyRizzolverBase} instead
	 * of a `DB` type.
	 */
	type KyTableName<T extends KyselyRizzolverBase<any, any, any>> = TableName<ExtractDB<T>>;

	/**
	 * Variant of {@link AnyTableColumn} that takes a {@link KyselyRizzolverBase}
	 * instead of a `DB` type.
	 */
	type KyAnyTableColumn<
		KY extends KyselyRizzolverBase<any, any, any>,
		Table extends KyTableName<KY>
	> = AnyTableColumn<ExtractDB<KY>, Table>;

	/**
	 * Variant of {@link AllTableColumns} that takes a {@link KyselyRizzolverBase}
	 * instead of a `DB` type.
	 */
	type KyAllTableColumns<
		KY extends KyselyRizzolverBase<any, any, any>,
		Table extends KyTableName<KY>
	> = KY extends KyselyRizzolverBase<any, infer TableToColumns, any>
		? TableToColumns[Table] extends infer U
			? U extends readonly KyAnyTableColumn<KY, Table>[]
				? U
				: never
			: never
		: never;

	export type {
		KyTableName as TableName,
		KyAnyTableColumn as AnyTableColumn,
		KyAllTableColumns as AllTableColumns
	};
}
