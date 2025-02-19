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
	ModelFkInstance,
	NoNullGatherOpts,
	ValidFkDepth
} from './fks.js';
import { newKyselyRizzolverBuilder } from './kysely-rizzolver-builder.js';
import {
	type ModelCollection,
	newModelCollection as kyNewModelCollection
} from './model-collection.js';
import { type QueryBuilder, newQueryBuilder as kyNewQueryBuilder } from './query-builder.js';
import { type Selector, newSelector as kyNewSelector } from './selector.js';
import { WithMandatory } from './type-helpers.js';

export interface KyselyRizzolverBase<
	DB,
	T extends Record<keyof DB & string, readonly string[]>,
	FKDefs extends KyselyRizzolverFKs<DB>
> {
	readonly _types: Readonly<{
		fields: T;
		fkDefs: FKDefs;
		dbfk: DBWithFk<DB, FKDefs>;
	}>;
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
export class KyselyRizzolver<
	DB,
	T extends Record<keyof DB & string, readonly string[]>,
	FKDefs extends KyselyRizzolverFKs<DB>,
	DefaultGatherDepth extends ValidFkDepth = typeof MAX_FK_GATHER_DEPTH
> implements KyselyRizzolverBase<DB, T, FKDefs>
{
	public readonly _types: KyselyRizzolverBase<DB, T, FKDefs>['_types'];

	public readonly fetchObjs: FetchResultFactory<DB>;
	public readonly gatherObjs: FkGatherResultFactory<DB, FKDefs>;
	public readonly defaultGatherDepth: DefaultGatherDepth;

	constructor(fields: T, fks: FKDefs, defaultGatherDepth?: DefaultGatherDepth) {
		this._types = Object.freeze({
			fields,
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

	async gatherOne<
		Table extends keyof DB & string,
		Opts extends WithMandatory<GatherOpts<DB, ValidFkDepth>, 'depth'>
	>(
		db: Kysely<DB>,
		table: Table,
		where: GatherWhereExpression<DB, Table>,
		opts: Opts
	): Promise<ReturnType<typeof this.gatherObjs.newGatherOne<Table, Opts['depth']>>>;
	async gatherOne<Table extends keyof DB & string>(
		db: Kysely<DB>,
		table: Table,
		where: GatherWhereExpression<DB, Table>,
		opts?: Omit<GatherOpts<DB, any>, 'depth'>
	): Promise<ReturnType<typeof this.gatherObjs.newGatherOne<Table, DefaultGatherDepth>>>;
	async gatherOne<Table extends keyof DB & string>(
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
		Table extends keyof DB & string,
		Opts extends WithMandatory<GatherOpts<DB, ValidFkDepth>, 'depth'>
	>(
		db: Kysely<DB>,
		table: Table,
		where: GatherWhereExpression<DB, Table>,
		opts: Opts
	): Promise<ReturnType<typeof this.gatherObjs.newGatherOneX<Table, Opts['depth']>>>;
	async gatherOneX<Table extends keyof DB & string>(
		db: Kysely<DB>,
		table: Table,
		where: GatherWhereExpression<DB, Table>,
		opts?: Omit<GatherOpts<DB, any>, 'depth'>
	): Promise<ReturnType<typeof this.gatherObjs.newGatherOneX<Table, DefaultGatherDepth>>>;
	async gatherOneX<Table extends keyof DB & string>(
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
		Table extends keyof DB & string,
		Opts extends WithMandatory<NoNullGatherOpts<DB, ValidFkDepth>, 'depth'>
	>(
		db: Kysely<DB>,
		table: Table,
		where: GatherWhereExpression<DB, Table>,
		opts: Opts
	): Promise<ReturnType<typeof this.gatherObjs.newGatherSome<Table, Opts['depth']>>>;
	async gatherSome<Table extends keyof DB & string>(
		db: Kysely<DB>,
		table: Table,
		where: GatherWhereExpression<DB, Table>,
		opts?: Omit<NoNullGatherOpts<DB, any>, 'depth'>
	): Promise<ReturnType<typeof this.gatherObjs.newGatherSome<Table, DefaultGatherDepth>>>;
	async gatherSome<Table extends keyof DB & string>(
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
	[table in keyof DB & string]?: {
		[fkName: string]: {
			myField: string;
			otherTable: keyof DB & string;
			otherField: string;
			isNullable: boolean;
		};
	};
};

/**
 * Extracts the `DB` type from a {@link KyselyRizzolverBase}.
 */
export type KyDB<KY extends KyselyRizzolverBase<any, any, any>> = KY extends KyselyRizzolverBase<
	infer DB,
	any,
	any
>
	? DB
	: never;

/**
 * Variant of {@link TableName} that takes a {@link KyselyRizzolverBase} instead
 * of a `DB` type.
 */
export type KyTableName<T extends KyselyRizzolverBase<any, any, any>> = keyof KyDB<T> & string;

/**
 * Variant of {@link AnyTableField} that takes a {@link KyselyRizzolverBase}
 * instead of a `DB` type.
 */
export type KyAnyTableField<
	KY extends KyselyRizzolverBase<any, any, any>,
	Table extends KyTableName<KY>
> = keyof KyDB<KY>[Table] & string;

/**
 * Variant of {@link AllTableFields} that takes a {@link KyselyRizzolverBase}
 * instead of a `DB` type.
 */
export type KyAllTableFields<
	KY extends KyselyRizzolverBase<any, any, any>,
	Table extends KyTableName<KY>
> = KY extends KyselyRizzolverBase<any, infer T, any>
	? T[Table] extends infer U
		? U extends readonly KyAnyTableField<KY, Table>[]
			? U
			: never
		: never
	: never;

/**
 * A union of all the known table names of a database.
 */
export type TableName<DB> = keyof DB & string;

/**
 * A union of all the known fields of a table.
 */
export type AnyTableField<DB, Table extends TableName<DB>> = keyof DB[Table] & string;

/**
 * An array of all the known fields of a table, in a type that is compatible
 * with that table's ${@link Selectable} type.
 */
export type AllTableFields<DB, Table extends TableName<DB>> = AnyTableField<DB, Table>[];
