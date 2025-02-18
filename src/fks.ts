import type { JoinCallbackExpression, Kysely, Selectable, SelectType } from 'kysely';
import type { FKDefsEntry } from './kysely-rizzolver-fk-builder.js';
import {
	KyselyRizzolver,
	type KyselyRizzolverBase,
	type KyselyRizzolverFKs
} from './kysely-rizzolver.js';
import type { ModelCollection } from './model-collection.js';
import type { AnyQueryBuilder } from './query-builder.js';
import type { OmitByValue } from './type-helpers.js';

/**
 * The maximum depth to gather FKs in a single gather operation.
 *
 * If you change this, you must also change {@link NextDepth}.
 */
export const MAX_FK_GATHER_DEPTH = 3;

/**
 * For each supported gather depth, assigns the value depth - 1. This is used to recursively construct the types for {@link ModelFkInstance}.
 *
 * If you change this, you must also change {@link MAX_FK_GATHER_DEPTH}.
 */
type NextDepth = {
	3: 2;
	2: 1;
	1: 0;
};

/**
 * The depth at which FKs can be gathered.
 *
 * A depth of 0 = bare model only. This is equivalent to a fetch without gathers.
 */
export type ValidFkDepth = (keyof NextDepth & number) | 0;

type Fk<
	DB,
	Referencing extends keyof DB & string,
	Referenced extends keyof DB & string,
	IsNullable extends boolean
> = {
	myTable: Referencing;
	myField: string;
	otherTable: Referenced;
	otherField: string;
	isNullable: IsNullable;
};

/**
 * Omit FK properties from `T`.
 */
export type OmitFks<T> = OmitByValue<T, Fk<any, any, any, any>>;

export class ModelFkGatherError extends Error {
	constructor(table: string, id: number, reason: string) {
		super(`Failed to gather model (table: '${table}', id: ${id}): ${reason}`);
	}
}

/**
 * A model whose FK fields have not been gathered.
 */
export type ModelFkBare<DBFk, Table extends keyof DBFk & string> =
	// new line :D
	{ __fkDepth: 0 } & Selectable<OmitFks<DBFk[Table]>>;

/**
 * A model whose FKs fields have been gathered up to a specific depth.
 */
export type ModelFkGathered<
	DBFk,
	Table extends keyof DBFk & string,
	Depth extends Exclude<ValidFkDepth, 0>
> =
	// new line :D
	{ __fkDepth: Depth } & {
		[k in keyof DBFk[Table]]: DBFk[Table][k] extends infer U
			? U extends Fk<any, any, infer UU, infer NN>
				? MaybeNullable<ModelFkInstance<DBFk, UU & keyof DBFk, NextDepth[Depth]>, NN>
				: SelectType<U>
			: never;
	};

export type ModelFkInstance<
	DBFk,
	Table extends keyof DBFk & string,
	Depth extends ValidFkDepth
> = Depth extends 0
	? ModelFkBare<DBFk, Table>
	: Depth extends Exclude<ValidFkDepth, 0>
	? ModelFkGathered<DBFk, Table, Depth>
	: never;

type MaybeNullable<T, Nullable extends boolean> = Nullable extends true ? T | null : T;

/**
 * A database schema `DB` with FK fields populated according to `FKDefs`.
 *
 * `FKDefs` is of type {@link KyselyRizzolverFKs}.
 */
export type DBWithFk<DB, FKDefs extends KyselyRizzolverFKs<DB>> = {
	[K in keyof DB & string]: DB[K] & {
		[F in keyof FKDefs[K] & string]: FKDefs[K][F] extends infer U
			? U extends FKDefsEntry<DB, any, any, any, any>
				? Fk<DB, K, U['otherTable'], U['isNullable']>
				: never
			: never;
	};
};

/**
 * Given a database schema with FKs `DBFK`, returns a database schema without
 * FKs.
 */
export type DBWithoutFk<DBFK> = { [k in keyof DBFK & string]: OmitFks<DBFK[k]> };

export type GatherOpts<DB, Depth extends ValidFkDepth> = {
	/**
	 * The depth to gather FKs to. Default: {@link MAX_FK_GATHER_DEPTH}.
	 */
	depth?: Depth;
	/**
	 * When an invalid model is found, the gather function can either:
	 * - `throw` - throws a {@link ModelFkGatherError}.
	 * - `omit` - omits the model from the result array.
	 * - `null` - puts `null` values in the result array. This is useful if you
	 *   want to match the input array to the output array by index while still
	 *   indicating that a model is invalid.
	 * - `keep` - keeps the invalid model in the result array.
	 *
	 * An invalid model is a model that has an FK field that is unexpectedly
	 * missing.
	 *
	 * For example, if the model has a `user_id` field whose value is 3 but
	 * there is no user with ID 3 in the database, the model is invalid.
	 *
	 * Default: `omit`
	 */
	onInvalidModel?: 'omit' | 'throw' | 'null' | 'keep';
	/**
	 * If provided, will populate this collection with the gathered models.
	 */
	modelCollection?: ModelCollection<DB>;
};

export type NoNullGatherOpts<DB, Depth extends ValidFkDepth> = Omit<
	GatherOpts<DB, Depth>,
	'onInvalidModel'
> & { onInvalidModel?: 'omit' | 'throw' | 'keep' };

let namelessRizzolver: KyselyRizzolver<any, any, any> = null as any;
function getNamelessRizzolver(): KyselyRizzolver<any, any, any> {
	if (!namelessRizzolver) {
		namelessRizzolver = KyselyRizzolver.builder().build();
	}
	return namelessRizzolver;
}

export async function gatherModelFks<
	DB,
	FKDefs extends KyselyRizzolverFKs<DB>,
	KY extends KyselyRizzolverBase<DB, Record<keyof DB & string, any>, FKDefs>,
	Table extends keyof DB & string,
	Depth extends ValidFkDepth = typeof MAX_FK_GATHER_DEPTH
>(
	rizzolver: KY,
	dbInstance: Kysely<DB>,
	table: Table,
	ids: number[],
	opts: GatherOpts<DB, Depth> = {}
): Promise<(ModelFkInstance<DBWithFk<DB, FKDefs>, Table, Depth> | null)[]> {
	const depth = opts.depth ?? MAX_FK_GATHER_DEPTH;
	const onInvalidModel = opts.onInvalidModel ?? 'omit';
	const modelCollection = opts.modelCollection ?? null;

	const fkDefs = rizzolver._types.fkDefs;
	let qb = getNamelessRizzolver().newQueryBuilder().add(table, `fk0`) as AnyQueryBuilder;

	const gatherItems: GatherItem[] = [];
	qb = _collectGatherData(fkDefs, table, qb, depth, gatherItems);

	let ky = dbInstance.selectFrom(qb.table('fk0') as any);
	for (const gatherItem of gatherItems) {
		ky = ky.leftJoin(gatherItem.tableAlias as any, gatherItem.join) as any;
	}
	ky = ky.select(qb.allFields()).where('fk0.id' as any, 'in', ids);
	const rizzult = await qb.run(() => ky.execute());

	const collection = rizzult.models;
	modelCollection?.addCollection(collection);
	const result = rizzult.rows.map((row) => {
		const baseModel = row.selectors.fk0!;
		const gatheredModel = _baseToGatheredModel(
			fkDefs,
			table,
			baseModel,
			collection,
			MAX_FK_GATHER_DEPTH,
			onInvalidModel
		);
		return gatheredModel as ModelFkInstance<DBWithFk<DB, FKDefs>, Table, Depth> | null;
	});

	if (onInvalidModel === 'omit') {
		return result.filter((model) => model !== null);
	}

	return result;
}

type GatherItem = {
	tableAlias: string;
	join: JoinCallbackExpression<any, any, any>;
};

function _collectGatherData(
	fkDefs: KyselyRizzolverFKs<any>,
	table: string,
	qb: AnyQueryBuilder,
	depthLeft: ValidFkDepth,
	result: GatherItem[]
): AnyQueryBuilder {
	if (depthLeft <= 0) {
		return qb;
	}

	const myAlias = `fk${qb.numSelectors - 1}`;
	const myFkDefs = fkDefs[table] ?? {};
	for (const fkDef of Object.values(myFkDefs)) {
		const otherAlias = `fk${qb.numSelectors}`;
		qb = qb.add(fkDef.otherTable, otherAlias);

		const myField = `${myAlias}.${fkDef.myField}`; // qb.selectors[myAlias].field(fkDef.myField).str;
		const otherField = `${otherAlias}.${fkDef.otherField}`; // qb.selectors[otherAlias].field(fkDef.otherField).str;
		const join: JoinCallbackExpression<any, any, any> = (join) =>
			join.onRef(myField, '=', otherField);

		result.push({ tableAlias: qb.table(otherAlias), join });

		qb = _collectGatherData(fkDefs, fkDef.otherTable, qb, (depthLeft - 1) as ValidFkDepth, result);
	}

	return qb;
}

function _baseToGatheredModel(
	fkDefs: KyselyRizzolverFKs<any>,
	table: string,
	baseModel: Record<string, unknown>,
	collection: ModelCollection<any>,
	depth: ValidFkDepth,
	onInvalidModel: NonNullable<GatherOpts<any, any>['onInvalidModel']>
): ModelFkInstance<any, any, any> | null {
	if (depth <= 0) {
		return { __fkDepth: 0, ...baseModel };
	}

	const myId = baseModel['id'];
	if (!myId || typeof myId !== 'number') {
		throw new Error('Expected model to have a valid id');
	}

	const gatheredModel: any = { __fkDepth: depth, ...baseModel };
	const myFkDefs = fkDefs[table] ?? {};
	for (const [fkName, fkDef] of Object.entries(myFkDefs)) {
		const fkValue = baseModel[fkDef.myField];
		if (fkValue !== null && fkValue !== undefined && typeof fkValue !== 'number') {
			throw new ModelFkGatherError(
				table,
				myId,
				`Invalid looking FK value for reference '${fkName}' (field: '${
					fkDef.myField
				}'). Expected positive number, got: '${JSON.stringify(fkValue)}'`
			);
		}

		const expectsOtherModel = fkValue !== null && fkValue !== undefined && fkValue !== 0;
		const otherBaseModel = expectsOtherModel
			? collection.get(fkDef.otherTable, fkValue) ?? null
			: null;

		const isValid = expectsOtherModel === !!otherBaseModel;
		if (!isValid) {
			switch (onInvalidModel) {
				case 'omit':
				case 'null':
					return null;
				case 'throw':
					throw new ModelFkGatherError(
						table,
						myId,
						`Could not find model for FK reference '${fkName}' (field: '${fkDef.myField}') for id ${fkValue}`
					);
			}
		}

		if (otherBaseModel) {
			const otherGatheredModel = _baseToGatheredModel(
				fkDefs,
				fkDef.otherTable,
				otherBaseModel,
				collection,
				(depth - 1) as ValidFkDepth,
				onInvalidModel
			);

			gatheredModel[fkName] = otherGatheredModel;
		} else {
			gatheredModel[fkName] = undefined;
		}
	}

	return gatheredModel;
}
